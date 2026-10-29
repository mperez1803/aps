import {
  BadRequestException,
  Injectable,
  Logger,
  type OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RepositorioAuth } from '../dominio/repositorio-auth.js';
import { generarHash, verificarClave } from './claves.js';

export function validarNombreUsuario(valor: unknown): string {
  if (typeof valor !== 'string' || !/^[a-zA-Z0-9._-]{3,60}$/.test(valor)) {
    throw new BadRequestException(
      'El usuario debe tener entre 3 y 60 letras, números, puntos, guiones o guiones bajos.',
    );
  }
  return valor.toLowerCase();
}

export function validarClave(valor: unknown): string {
  if (typeof valor !== 'string' || valor.length < 6 || valor.length > 128) {
    throw new BadRequestException(
      'La contraseña debe tener entre 6 y 128 caracteres.',
    );
  }
  return valor;
}

@Injectable()
export class ServicioAuth implements OnModuleInit {
  private readonly registro = new Logger(ServicioAuth.name);
  private readonly hashFicticio = generarHash('clave-ficticia-sin-acceso');

  constructor(
    private readonly repositorio: RepositorioAuth,
    private readonly jwt: JwtService,
  ) {}

  async onModuleInit() {
    await this.repositorio.inicializarRoles();
  }

  async iniciarSesion(nombre: unknown, clave: unknown) {
    if (typeof clave !== 'string' || clave.length === 0 || clave.length > 128) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos.');
    }
    const nombreNormalizado =
      typeof nombre === 'string' ? nombre.toLowerCase() : '';
    const usuario =
      await this.repositorio.buscarCredenciales(nombreNormalizado);
    const coincide = await verificarClave(
      clave,
      usuario?.claveHash ?? (await this.hashFicticio),
    );
    if (!usuario || !coincide || !usuario.activo) {
      this.registro.warn('AUTH_LOGIN_RECHAZADO');
      throw new UnauthorizedException('Usuario o contraseña incorrectos.');
    }
    const token = await this.jwt.signAsync({
      sub: usuario.id,
      version: usuario.versionSesion,
    });
    const { claveHash: _clave, ...perfil } = usuario;
    this.registro.log('AUTH_LOGIN_CORRECTO');
    return { token, usuario: perfil, expiraEnSegundos: 1800 };
  }

  async autenticar(token: string) {
    let datos: { sub?: unknown; version?: unknown };
    try {
      datos = await this.jwt.verifyAsync<{ sub?: unknown; version?: unknown }>(
        token,
        { algorithms: ['HS256'] },
      );
    } catch {
      throw new UnauthorizedException('La sesión no es válida o expiró.');
    }
    if (
      typeof datos.sub !== 'number' ||
      !Number.isInteger(datos.sub) ||
      datos.sub < 1 ||
      datos.sub > 2147483647 ||
      !Number.isInteger(datos.version)
    ) {
      throw new UnauthorizedException('La sesión no es válida.');
    }
    const usuario = await this.repositorio.buscarUsuario(datos.sub);
    if (
      !usuario ||
      !usuario.activo ||
      usuario.versionSesion !== datos.version
    ) {
      throw new UnauthorizedException('La sesión no está vigente.');
    }
    return usuario;
  }

  async cerrarSesion(id: number) {
    await this.repositorio.invalidarSesion(id);
    this.registro.log('AUTH_LOGOUT');
  }

  segundosRestantes(token: string) {
    const datos = this.jwt.decode<{ exp: number }>(token);
    return Math.max(0, datos.exp - Math.floor(Date.now() / 1000));
  }

  listarUsuarios() {
    return this.repositorio.listarUsuarios();
  }
  listarRoles() {
    return this.repositorio.listarRoles();
  }

  async crearUsuario(nombre: unknown, clave: unknown, rolId: number) {
    const usuario = await this.repositorio.crearUsuario(
      validarNombreUsuario(nombre),
      await generarHash(validarClave(clave)),
      rolId,
    );
    this.registro.log('AUTH_USUARIO_CREADO');
    return usuario;
  }

  async actualizarUsuario(
    id: number,
    cambios: { activo?: boolean; rolId?: number; clave?: unknown },
  ) {
    const usuario = await this.repositorio.actualizarUsuario(id, {
      activo: cambios.activo,
      rolId: cambios.rolId,
      claveHash:
        cambios.clave === undefined
          ? undefined
          : await generarHash(validarClave(cambios.clave)),
    });
    this.registro.log('AUTH_USUARIO_ACTUALIZADO');
    return usuario;
  }

  async actualizarRol(id: number, nombre: string) {
    const rol = await this.repositorio.actualizarRol(id, nombre);
    this.registro.log('AUTH_ROL_ACTUALIZADO');
    return rol;
  }
}
