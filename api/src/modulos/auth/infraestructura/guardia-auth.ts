import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Usuario } from '../dominio/repositorio-auth.js';
import { ServicioAuth } from '../aplicacion/servicio-auth.js';
import { comprobarCsrf, leerCookieSesion } from './cookie-sesion.js';

export const Publico = () => SetMetadata('auth:publico', true);
export interface PeticionAutenticada extends Request {
  usuario: Usuario;
  tokenSesion: string;
}

@Injectable()
export class GuardiaAuth implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: ServicioAuth,
  ) {}

  async canActivate(contexto: ExecutionContext) {
    const destinos = [contexto.getHandler(), contexto.getClass()];
    if (this.reflector.getAllAndOverride<boolean>('auth:publico', destinos)) {
      return true;
    }
    const peticion = contexto.switchToHttp().getRequest<PeticionAutenticada>();
    const [tipo, bearer, sobrante] =
      peticion.headers.authorization?.split(' ') ?? [];
    const cookie = leerCookieSesion(peticion);
    const token =
      cookie ?? (tipo === 'Bearer' && !sobrante ? bearer : undefined);
    if (!token) {
      throw new UnauthorizedException('Debes iniciar sesión.');
    }
    peticion.usuario = await this.auth.autenticar(token);
    peticion.tokenSesion = token;
    if (cookie && !['GET', 'HEAD', 'OPTIONS'].includes(peticion.method)) {
      comprobarCsrf(peticion);
    }
    return true;
  }
}
