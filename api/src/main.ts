import { NestFactory } from '@nestjs/core';
import { ModuloAplicacion } from './modulo-aplicacion.js';

async function iniciarAplicacion() {
  const app = await NestFactory.create(ModuloAplicacion);
  await app.listen(process.env.PORT ?? 3000);
}
await iniciarAplicacion();
