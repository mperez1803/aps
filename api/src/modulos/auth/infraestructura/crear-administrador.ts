import { HttpException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { ModuloAplicacion } from '../../../modulo-aplicacion.js';
import { generarHash } from '../aplicacion/claves.js';
import {
  validarClave,
  validarNombreUsuario,
} from '../aplicacion/servicio-auth.js';
import { RepositorioAuth } from '../dominio/repositorio-auth.js';

async function ejecutar() {
  if (!process.stdin.isTTY) {
    throw new Error(
      'Ejecuta este comando en una terminal interactiva; no pases contraseñas como argumentos.',
    );
  }
  const salidaOculta = new Writable({
    write(_datos, _codificacion, completar) {
      completar();
    },
  });
  const entrada = createInterface({
    input: process.stdin,
    output: salidaOculta,
    terminal: true,
  });
  let nombre: string;
  let clave: string;
  try {
    process.stdout.write('Nombre de usuario de la cuenta Super inicial: ');
    nombre = validarNombreUsuario(await entrada.question(''));
    process.stdout.write(
      '\nContraseña (mínimo 6 caracteres, entrada oculta): ',
    );
    clave = validarClave(await entrada.question(''));
    process.stdout.write('\nRepetir contraseña: ');
    if (clave !== (await entrada.question(''))) {
      throw new Error('Las contraseñas no coinciden.');
    }
    process.stdout.write('\n');
  } finally {
    entrada.close();
  }
  const app = await NestFactory.createApplicationContext(ModuloAplicacion, {
    logger: false,
    abortOnError: false,
  });
  try {
    await app
      .get(RepositorioAuth)
      .crearAdministradorInicial(nombre, await generarHash(clave));
    console.log('Cuenta Super inicial creada. Ya puedes iniciar sesión.');
  } finally {
    await app.close();
  }
}

ejecutar().catch((error: unknown) => {
  console.error(
    error instanceof HttpException
      ? error.message
      : error instanceof Error && !('query' in error)
        ? error.message
        : 'No se pudo crear el administrador. Revisa la conexión y configuración de la API.',
  );
  process.exitCode = 1;
});
