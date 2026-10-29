import { randomUUID } from 'node:crypto';
import { DataSource, EntitySchema } from 'typeorm';
import { iniciarFuenteDatos } from '../src/infraestructura/persistencia/iniciar-fuente-datos.js';
import {
  CentroSaludEntidad,
  SectorEntidad,
} from '../src/modulos/centros/infraestructura/entidades-centros.js';
import { RepositorioCentrosPostgres } from '../src/modulos/centros/infraestructura/repositorio-centros-postgres.js';

describe.skipIf(process.env.CENTROS_INTEGRATION !== '1')(
  'Centros con PostgreSQL (esquema sintético aislado)',
  () => {
    const esquema = `centros_pruebas_${randomUUID().replaceAll('-', '')}`;
    let datos: DataSource;
    let repositorio: RepositorioCentrosPostgres;
    const entrada = {
      codigo: 'SINTETICO',
      nombre: 'Centro sintético',
      codigoDeis: null,
      comunaCodigo: '1101',
      direccion: 'Vía ficticia 123',
      telefonos: [{ valor: '+56000000001', uso: '', principal: true }],
      correos: [
        { valor: 'centro@example.invalid', uso: 'work', principal: true },
      ],
      activo: true,
      utilizaSectores: true,
    };
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
          new EntitySchema<CentroSaludEntidad>({
            name: 'CentroSaludEntidad',
            target: CentroSaludEntidad,
            schema: esquema,
            tableName: 'centros_salud',
            columns: {
              id: { type: 'integer', primary: true, generated: 'increment' },
              codigo: { type: 'varchar', length: 40, unique: true },
              nombre: { type: 'varchar', length: 160 },
              codigoDeis: { type: 'varchar', length: 20, nullable: true },
              comunaCodigo: { type: 'varchar', length: 5 },
              direccion: { type: 'varchar', length: 300 },
              telefonos: { type: 'jsonb' },
              correos: { type: 'jsonb' },
              activo: { type: 'boolean', default: true },
              utilizaSectores: { type: 'boolean', default: false },
            },
          }),
          new EntitySchema<SectorEntidad>({
            name: 'SectorEntidad',
            target: SectorEntidad,
            schema: esquema,
            tableName: 'sectores',
            columns: {
              id: { type: 'integer', primary: true, generated: 'increment' },
              centroId: { type: 'integer' },
              color: { type: 'varchar', length: 7 },
              nombre: { type: 'varchar', length: 120 },
              activo: { type: 'boolean', default: true },
            },
            relations: {
              centro: {
                type: 'many-to-one',
                target: 'CentroSaludEntidad',
                nullable: false,
                joinColumn: { name: 'centroId' },
                onDelete: 'RESTRICT',
                onUpdate: 'RESTRICT',
              },
            },
          }),
        ],
      });
      repositorio = new RepositorioCentrosPostgres(datos);
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

    it('persiste PK INT, contactos múltiples, códigos únicos y sectores con FK restrictiva', async () => {
      const centro = await repositorio.crear(entrada);
      expect(centro.id).toBe(1);
      expect((await repositorio.listar())[0].telefonos).toEqual(
        entrada.telefonos,
      );
      await expect(repositorio.crear(entrada)).rejects.toThrow('ya existe');
      const otro = await repositorio.crear({ ...entrada, codigo: 'OTRO' });
      const sector = await repositorio.crearSector(centro.id, {
        color: '#123456',
        nombre: 'Sector sintético',
        activo: true,
      });
      expect(Number.isInteger(sector.id)).toBe(true);
      expect(sector.color).toBe('#123456');
      expect(sector).not.toHaveProperty('codigo');
      await repositorio.crearSector(otro.id, {
        color: '#654321',
        nombre: 'Sector de otro centro',
        activo: true,
      });
      await expect(
        repositorio.actualizarSector(otro.id, sector.id, {
          color: '#654321',
          nombre: 'Ajeno',
          activo: true,
        }),
      ).rejects.toThrow('no pertenece');
      await expect(
        datos.getRepository(CentroSaludEntidad).delete(centro.id),
      ).rejects.toThrow();
      await expect(
        datos.getRepository(SectorEntidad).save({
          centroId: 2147483647,
          color: '#123456',
          nombre: 'Inválido',
          activo: true,
        }),
      ).rejects.toThrow();
      await repositorio.actualizar(centro.id, {
        ...entrada,
        utilizaSectores: false,
        activo: false,
      });
      expect(
        (await repositorio.listar()).find(
          (registro) => registro.id === centro.id,
        )?.sectores,
      ).toHaveLength(1);
      await expect(
        repositorio.crearSector(centro.id, {
          color: '#123456',
          nombre: 'No permitido',
          activo: true,
        }),
      ).rejects.toThrow('Activa');
      await repositorio.actualizarSector(centro.id, sector.id, {
        color: '#ABCDEF',
        nombre: 'Sector inactivo',
        activo: false,
      });
      const persistido = (await repositorio.listar()).find(
        (registro) => registro.id === centro.id,
      );
      expect(persistido?.correos).toEqual(entrada.correos);
      expect(persistido?.sectores[0]).toEqual({
        id: sector.id,
        centroId: centro.id,
        nombre: 'Sector inactivo',
        color: '#ABCDEF',
        activo: false,
      });
      await expect(repositorio.actualizar(2147483647, entrada)).rejects.toThrow(
        'no existe',
      );
    });

    it('crea y modifica centro y sectores atómicamente sin mover ni borrar referencias', async () => {
      const sector = {
        nombre: 'Sector inicial',
        color: '#123456',
        activo: true,
      };
      const centro = await repositorio.crear({
        ...entrada,
        codigo: 'INTEGRADO',
        sectores: [sector],
      });
      expect(centro.sectores).toHaveLength(1);
      expect(centro.sectores[0].centroId).toBe(centro.id);
      const idSector = centro.sectores[0].id;
      const actualizado = await repositorio.actualizar(centro.id, {
        ...entrada,
        codigo: 'INTEGRADO',
        nombre: 'Centro editado',
        sectores: [
          { ...sector, id: idSector, nombre: 'Sector editado' },
          { ...sector, nombre: 'Sector nuevo' },
        ],
      });
      expect(actualizado.sectores).toHaveLength(2);
      expect(
        actualizado.sectores.find((registro) => registro.id === idSector)
          ?.nombre,
      ).toBe('Sector editado');
      const otro = await repositorio.crear({
        ...entrada,
        codigo: 'AJENO',
        sectores: [sector],
      });
      await expect(
        repositorio.actualizar(centro.id, {
          ...entrada,
          codigo: 'INTEGRADO',
          nombre: 'No debe persistir',
          sectores: [
            { ...sector, nombre: 'Tampoco debe persistir' },
            { ...sector, id: otro.sectores[0].id },
          ],
        }),
      ).rejects.toThrow('no pertenece');
      const recargado = (await repositorio.listar()).find(
        (registro) => registro.id === centro.id,
      );
      expect(recargado?.nombre).toBe('Centro editado');
      expect(recargado?.sectores).toHaveLength(2);
      const sinBorrado = await repositorio.actualizar(centro.id, {
        ...entrada,
        codigo: 'INTEGRADO',
        utilizaSectores: false,
        sectores: [],
      });
      expect(sinBorrado.sectores).toHaveLength(2);
      await expect(
        repositorio.crear({
          ...entrada,
          codigo: 'REVERTIDO',
          utilizaSectores: false,
          sectores: [sector],
        }),
      ).rejects.toThrow('Activa');
      expect(
        (await repositorio.listar()).some(
          (registro) => registro.codigo === 'REVERTIDO',
        ),
      ).toBe(false);
    });
  },
);
