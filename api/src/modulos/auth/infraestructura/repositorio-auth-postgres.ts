import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { RepositorioAuth, type Usuario } from '../dominio/repositorio-auth.js';
import { RolEntidad, UsuarioEntidad } from './entidades-auth.js';
import { ROLES_INICIALES, administraAccesos } from '../dominio/roles.js';

function perfil(usuario: UsuarioEntidad): Usuario {
  return {
    id: usuario.id,
    nombreUsuario: usuario.nombreUsuario,
    activo: usuario.activo,
    versionSesion: usuario.versionSesion,
    rol: usuario.rol,
  };
}

function traducirDuplicado(error: unknown): never {
  if (
    error instanceof QueryFailedError &&
    'code' in error.driverError &&
    error.driverError.code === '23505'
  ) {
    throw new ConflictException(
      'El nombre de usuario o código de rol ya existe.',
    );
  }
  throw error;
}

@Injectable()
export class RepositorioAuthPostgres extends RepositorioAuth {
  constructor(private readonly datos: DataSource) {
    super();
  }

  async buscarCredenciales(nombre: string) {
    const usuario = await this.datos
      .getRepository(UsuarioEntidad)
      .createQueryBuilder('usuario')
      .addSelect('usuario.claveHash')
      .leftJoinAndSelect('usuario.rol', 'rol')
      .where('usuario.nombreUsuario = :nombre', { nombre })
      .getOne();
    return usuario
      ? { ...perfil(usuario), claveHash: usuario.claveHash }
      : null;
  }

  async buscarUsuario(id: number) {
    const usuario = await this.datos
      .getRepository(UsuarioEntidad)
      .findOne({ where: { id }, relations: { rol: true } });
    return usuario ? perfil(usuario) : null;
  }

  async listarUsuarios() {
    const usuarios = await this.datos
      .getRepository(UsuarioEntidad)
      .find({ relations: { rol: true }, order: { nombreUsuario: 'ASC' } });
    return usuarios.map(perfil);
  }

  listarRoles() {
    return this.datos
      .getRepository(RolEntidad)
      .find({ order: { nombre: 'ASC' } });
  }

  async inicializarRoles() {
    await this.datos
      .getRepository(RolEntidad)
      .createQueryBuilder()
      .insert()
      .values(ROLES_INICIALES)
      .orIgnore()
      .execute();
  }

  async actualizarRol(id: number, nombre: string) {
    const rol = await this.datos.getRepository(RolEntidad).findOneBy({ id });
    if (!rol) {
      throw new NotFoundException('El rol no existe.');
    }
    rol.nombre = nombre;
    return this.datos.getRepository(RolEntidad).save(rol);
  }

  async crearUsuario(nombreUsuario: string, claveHash: string, rolId: number) {
    return this.datos.transaction(async (gestor) => {
      const rol = await gestor.findOneBy(RolEntidad, { id: rolId });
      if (!rol) {
        throw new BadRequestException('El rol seleccionado no existe.');
      }
      try {
        const usuario = await gestor.save(UsuarioEntidad, {
          nombreUsuario,
          claveHash,
          rolId,
          activo: true,
          versionSesion: 0,
        });
        usuario.rol = rol;
        return perfil(usuario);
      } catch (error) {
        traducirDuplicado(error);
      }
    });
  }

  async actualizarUsuario(
    id: number,
    cambios: { activo?: boolean; rolId?: number; claveHash?: string },
  ) {
    return this.datos.transaction(async (gestor) => {
      // Serializa cambios que podrían dejar al sistema sin administradores activos.
      await gestor.query('SELECT pg_advisory_xact_lock(47001)');
      const usuario = await gestor.findOne(UsuarioEntidad, {
        where: { id },
        relations: { rol: true },
      });
      if (!usuario) {
        throw new NotFoundException('El usuario no existe.');
      }
      const rol = cambios.rolId
        ? await gestor.findOneBy(RolEntidad, { id: cambios.rolId })
        : usuario.rol;
      if (!rol) {
        throw new BadRequestException('El rol seleccionado no existe.');
      }
      const activo = cambios.activo ?? usuario.activo;
      if (
        usuario.activo &&
        administraAccesos(usuario.rol.codigo) &&
        (!activo || !administraAccesos(rol.codigo))
      ) {
        const administradores = await gestor.count(UsuarioEntidad, {
          where: [
            { activo: true, rol: { codigo: 'administrador' } },
            { activo: true, rol: { codigo: 'super' } },
          ],
        });
        if (administradores <= 1) {
          throw new ConflictException(
            'Debe conservarse al menos un usuario activo con rol Super o Administrador.',
          );
        }
      }
      usuario.activo = activo;
      usuario.rol = rol;
      usuario.rolId = rol.id;
      if (cambios.claveHash !== undefined) {
        usuario.claveHash = cambios.claveHash;
      }
      usuario.versionSesion += 1;
      return perfil(await gestor.save(usuario));
    });
  }

  async invalidarSesion(id: number) {
    await this.datos
      .getRepository(UsuarioEntidad)
      .increment({ id }, 'versionSesion', 1);
  }

  async crearAdministradorInicial(nombreUsuario: string, claveHash: string) {
    await this.datos.transaction(async (gestor) => {
      await gestor.query('SELECT pg_advisory_xact_lock(47001)');
      if ((await gestor.count(UsuarioEntidad)) > 0) {
        throw new ConflictException(
          'El administrador inicial solo puede crearse cuando no existen usuarios.',
        );
      }
      const rol = await gestor.findOneBy(RolEntidad, { codigo: 'super' });
      if (!rol) {
        throw new ConflictException(
          'El catálogo de roles no está inicializado.',
        );
      }
      await gestor.save(UsuarioEntidad, {
        nombreUsuario,
        claveHash,
        rolId: rol.id,
        activo: true,
        versionSesion: 0,
      });
    });
  }
}
