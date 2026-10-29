import { ForbiddenException } from '@nestjs/common';
import type { Request, Response } from 'express';

export function nombreCookieSesion() {
  return process.env.NODE_ENV === 'production'
    ? '__Host-kumara-sesion'
    : 'kumara-sesion';
}

export function leerCookieSesion(peticion: Request): string | undefined {
  const prefijo = `${nombreCookieSesion()}=`;
  return peticion.headers.cookie
    ?.split(';')
    .map((parte) => parte.trim())
    .find((parte) => parte.startsWith(prefijo))
    ?.slice(prefijo.length);
}

export function comprobarCsrf(peticion: Request) {
  if (
    peticion.headers['x-kumara-csrf'] !== '1' ||
    peticion.headers['sec-fetch-site'] === 'cross-site'
  ) {
    throw new ForbiddenException(
      'La solicitud no tiene una protección CSRF válida.',
    );
  }
}

export function escribirCookieSesion(respuesta: Response, token?: string) {
  const opciones = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
  };
  if (token) {
    respuesta.cookie(nombreCookieSesion(), token, {
      ...opciones,
      maxAge: 1800000,
    });
  } else {
    respuesta.clearCookie(nombreCookieSesion(), opciones);
  }
  respuesta.setHeader('Cache-Control', 'no-store');
}
