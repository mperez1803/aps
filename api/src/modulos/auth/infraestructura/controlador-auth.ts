import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { comprobarCsrf, escribirCookieSesion } from './cookie-sesion.js';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ServicioAuth } from '../aplicacion/servicio-auth.js';
import { Publico, type PeticionAutenticada } from './guardia-auth.js';

function cuerpo(valor: unknown, campos: string[]): Record<string, unknown> {
  if (
    !valor ||
    typeof valor !== 'object' ||
    Array.isArray(valor) ||
    Object.keys(valor).some((clave) => !campos.includes(clave))
  ) {
    throw new BadRequestException('El cuerpo de la solicitud no es válido.');
  }
  return valor as Record<string, unknown>;
}

function identificador(valor: unknown): number {
  if (
    typeof valor !== 'number' ||
    !Number.isInteger(valor) ||
    valor < 1 ||
    valor > 2147483647
  ) {
    throw new BadRequestException(
      'El identificador debe ser un entero positivo de tipo INT.',
    );
  }
  return valor;
}

function identificadorRuta(valor: string): number {
  if (!/^[1-9]\d*$/.test(valor)) {
    throw new BadRequestException(
      'El identificador debe ser un entero positivo de tipo INT.',
    );
  }
  return identificador(Number(valor));
}

function nombreRol(valor: unknown): string {
  if (typeof valor !== 'string' || !valor.trim() || valor.trim().length > 80) {
    throw new BadRequestException(
      'Indica un nombre de rol de 1 a 80 caracteres.',
    );
  }
  return valor.trim();
}

@Controller('auth')
export class ControladorAuth {
  constructor(private readonly auth: ServicioAuth) {}

  @Publico()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(200)
  @Post('login')
  async login(
    @Body() datos: unknown,
    @Req() peticion: Request,
    @Res({ passthrough: true }) respuesta: Response,
  ) {
    comprobarCsrf(peticion);
    const entrada = cuerpo(datos, ['nombreUsuario', 'clave']);
    const sesion = await this.auth.iniciarSesion(
      entrada.nombreUsuario,
      entrada.clave,
    );
    escribirCookieSesion(respuesta, sesion.token);
    return {
      usuario: sesion.usuario,
      expiraEnSegundos: sesion.expiraEnSegundos,
    };
  }

  @Get('yo')
  yo(
    @Req() peticion: PeticionAutenticada,
    @Res({ passthrough: true }) respuesta: Response,
  ) {
    respuesta.setHeader('Cache-Control', 'no-store');
    return {
      usuario: peticion.usuario,
      expiraEnSegundos: this.auth.segundosRestantes(peticion.tokenSesion),
    };
  }

  @HttpCode(204)
  @Post('logout')
  async logout(
    @Req() peticion: PeticionAutenticada,
    @Res({ passthrough: true }) respuesta: Response,
  ) {
    await this.auth.cerrarSesion(peticion.usuario.id);
    escribirCookieSesion(respuesta);
  }

  @Get('usuarios')
  usuarios() {
    return this.auth.listarUsuarios();
  }

  @Get('roles')
  roles() {
    return this.auth.listarRoles();
  }

  @Post('usuarios')
  crearUsuario(@Body() datos: unknown) {
    const entrada = cuerpo(datos, ['nombreUsuario', 'clave', 'rolId']);
    return this.auth.crearUsuario(
      entrada.nombreUsuario,
      entrada.clave,
      identificador(entrada.rolId),
    );
  }

  @Patch('usuarios/:id')
  actualizarUsuario(@Param('id') id: string, @Body() datos: unknown) {
    const entrada = cuerpo(datos, ['activo', 'rolId', 'clave']);
    if (
      Object.keys(entrada).length === 0 ||
      (entrada.activo !== undefined && typeof entrada.activo !== 'boolean')
    ) {
      throw new BadRequestException('Indica cambios válidos para el usuario.');
    }
    return this.auth.actualizarUsuario(identificadorRuta(id), {
      activo: typeof entrada.activo === 'boolean' ? entrada.activo : undefined,
      rolId:
        entrada.rolId === undefined ? undefined : identificador(entrada.rolId),
      clave: entrada.clave,
    });
  }

  @Patch('roles/:id')
  actualizarRol(@Param('id') id: string, @Body() datos: unknown) {
    const entrada = cuerpo(datos, ['nombre']);
    return this.auth.actualizarRol(
      identificadorRuta(id),
      nombreRol(entrada.nombre),
    );
  }
}
