import { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function configurarPostgres(
  configuracion: ConfigService,
): TypeOrmModuleOptions {
  function textoRequerido(nombre: string): string {
    const valor = configuracion.get<unknown>(nombre);
    if (typeof valor !== 'string' || valor.trim() === '') {
      throw new Error(`Falta configurar ${nombre} en el entorno de la API.`);
    }
    return valor;
  }

  const puertoConfigurado = textoRequerido('DB_PORT');
  const puerto = Number(puertoConfigurado);
  if (!/^\d+$/.test(puertoConfigurado) || puerto < 1 || puerto > 65535) {
    throw new Error('DB_PORT debe ser un entero entre 1 y 65535.');
  }

  const clave = configuracion.get<unknown>('DB_PASSWORD');
  if (typeof clave !== 'string') {
    throw new Error('Falta configurar DB_PASSWORD en el entorno de la API.');
  }

  return {
    type: 'postgres',
    host: textoRequerido('DB_HOST'),
    port: puerto,
    database: textoRequerido('DB_NAME'),
    username: textoRequerido('DB_USER'),
    password: clave,
    autoLoadEntities: true,
    synchronize: true,
    migrationsRun: false,
    dropSchema: false,
    logging: false,
    retryAttempts: 1,
  };
}
