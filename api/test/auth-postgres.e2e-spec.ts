import { randomUUID } from 'node:crypto';
import { DataSource, EntitySchema } from 'typeorm';
import { iniciarFuenteDatos } from '../src/infraestructura/persistencia/iniciar-fuente-datos.js';
import { RepositorioAuthPostgres } from '../src/modulos/auth/infraestructura/repositorio-auth-postgres.js';
import {
  RolEntidad,
  UsuarioEntidad,
} from '../src/modulos/auth/infraestructura/entidades-auth.js';

describe.skipIf(process.env.AUTH_INTEGRATION !== '1')(
  'Auth con PostgreSQL (esquema sintético aislado)',
  () => {
    const esquema = `auth_pruebas_${randomUUID().replaceAll('-', '')}`;
    let datos: DataSource;
    let repositorio: RepositorioAuthPostgres;
    beforeAll(async () => {
      process.loadEnvFile('.env');
      datos = await iniciarFuenteDatos({
        type: 'postgres',
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        database: process.env.DB_NAME,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        synchronize: true,
        entities: [
          new EntitySchema<RolEntidad>({
            name: 'RolEntidad',
            target: RolEntidad,
            schema: esquema,
            tableName: 'roles',
            columns: {
              id: { type: 'integer', primary: true, generated: 'increment' },
              nombre: { type: 'varchar', length: 80 },
              codigo: { type: 'varchar', length: 40, unique: true },
            },
          }),
          new EntitySchema<UsuarioEntidad>({
            name: 'UsuarioEntidad',
            target: UsuarioEntidad,
            schema: esquema,
            tableName: 'usuarios',
            columns: {
              id: { type: 'integer', primary: true, generated: 'increment' },
              nombreUsuario: { type: 'varchar', length: 60, unique: true },
              claveHash: { type: 'varchar', length: 255, select: false },
              activo: { type: 'boolean', default: true },
              versionSesion: { type: 'integer', default: 0 },
              rolId: { type: 'integer' },
            },
            relations: {
              rol: {
                type: 'many-to-one',
                target: 'RolEntidad',
                nullable: false,
                joinColumn: { name: 'rolId' },
                onDelete: 'RESTRICT',
                onUpdate: 'RESTRICT',
              },
            },
          }),
        ],
      });
      repositorio = new RepositorioAuthPostgres(datos);
    });
    afterAll(async () => {
      if (datos?.isInitialized) {
        try {
          await datos.query(`DROP SCHEMA "${esquema}" CASCADE`);
        } finally {
          await datos.destroy();
        }
      }
    });

    it('inicializa cinco roles fijos, conserva sus nombres editados y usa PK INT incrementales', async () => {
      await repositorio.inicializarRoles();
      const roles = await repositorio.listarRoles();
      expect(roles.map((rol) => rol.codigo).sort()).toEqual([
        'administrador',
        'paciente',
        'super',
        'tutor',
        'usuario',
      ]);
      expect(roles.every((rol) => Number.isInteger(rol.id) && rol.id > 0)).toBe(
        true,
      );
      const rolUsuario = roles.find((rol) => rol.codigo === 'usuario');
      if (!rolUsuario) {
        throw new Error('Falta el rol Usuario.');
      }
      await repositorio.actualizarRol(rolUsuario.id, 'Usuario editado');
      await repositorio.inicializarRoles();
      expect(await repositorio.listarRoles()).toHaveLength(5);
      expect(
        (await repositorio.listarRoles()).find(
          (rol) => rol.id === rolUsuario.id,
        )?.nombre,
      ).toBe('Usuario editado');
      await expect(
        repositorio.actualizarRol(2147483647, 'Inexistente'),
      ).rejects.toThrow('no existe');
    });

    it('crea una cuenta Super inicial, mantiene FK y protege al último gestor de accesos', async () => {
      await repositorio.inicializarRoles();
      await repositorio.crearAdministradorInicial(
        'admin_prueba',
        'hash-sintetico',
      );
      await expect(
        repositorio.crearAdministradorInicial('otro_admin', 'hash-sintetico'),
      ).rejects.toThrow('solo puede crearse');
      const [admin] = await repositorio.listarUsuarios();
      expect(admin.id).toBe(1);
      expect(admin.rol.id).toBe(1);
      expect(admin.rol.codigo).toBe('super');
      expect(admin).not.toHaveProperty('claveHash');
      expect(
        (await repositorio.buscarCredenciales('admin_prueba'))?.claveHash,
      ).toBe('hash-sintetico');
      await expect(
        repositorio.actualizarUsuario(admin.id, { activo: false }),
      ).rejects.toThrow('al menos un usuario activo');
      const roles = await repositorio.listarRoles();
      const rol = roles.find((actual) => actual.codigo === 'usuario');
      const rolAdministrador = roles.find(
        (actual) => actual.codigo === 'administrador',
      );
      if (!rol || !rolAdministrador) {
        throw new Error('Faltan roles del catálogo.');
      }
      await expect(
        repositorio.actualizarUsuario(admin.id, { rolId: rol.id }),
      ).rejects.toThrow('al menos un usuario activo');
      const operador = await repositorio.crearUsuario(
        'operador_prueba',
        'hash-sintetico',
        rol.id,
      );
      await expect(
        repositorio.crearUsuario('operador_prueba', 'hash-sintetico', rol.id),
      ).rejects.toThrow('ya existe');
      await expect(
        repositorio.crearUsuario('sin_rol', 'hash-sintetico', 2147483647),
      ).rejects.toThrow('no existe');
      await expect(
        datos.getRepository(RolEntidad).delete(rol.id),
      ).rejects.toThrow();
      await repositorio.actualizarUsuario(operador.id, { activo: false });
      await expect(
        datos.getRepository(RolEntidad).delete(rol.id),
      ).rejects.toThrow();
      await repositorio.actualizarUsuario(operador.id, {
        claveHash: 'otro-hash-sintetico',
      });
      expect(
        (await repositorio.buscarUsuario(operador.id))?.versionSesion,
      ).toBe(2);
      const segundo = await repositorio.crearUsuario(
        'segundo_admin_prueba',
        'hash-sintetico',
        rolAdministrador.id,
      );
      const resultados = await Promise.allSettled([
        repositorio.actualizarUsuario(admin.id, { activo: false }),
        repositorio.actualizarUsuario(segundo.id, { activo: false }),
      ]);
      expect(
        resultados.filter((resultado) => resultado.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        (await repositorio.listarUsuarios()).filter(
          (usuario) =>
            usuario.activo &&
            ['super', 'administrador'].includes(usuario.rol.codigo),
        ),
      ).toHaveLength(1);
    });
  },
);
