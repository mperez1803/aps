import { ConfigService } from '@nestjs/config';
import { configurarPostgres } from './configuracion-postgres.js';

describe('Configuración de PostgreSQL', () => {
  const entorno = {
    DB_HOST: 'localhost',
    DB_PORT: '5432',
    DB_NAME: 'aps',
    DB_USER: 'postgres',
    DB_PASSWORD: '',
  };

  it('habilita la sincronización de entidades sin migraciones ni dropSchema', () => {
    expect(configurarPostgres(new ConfigService(entorno))).toEqual({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      database: 'aps',
      username: 'postgres',
      password: '',
      autoLoadEntities: true,
      synchronize: true,
      migrationsRun: false,
      dropSchema: false,
      logging: false,
      retryAttempts: 1,
    });
  });

  it.each(['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'])(
    'rechaza la ausencia de %s sin revelar valores',
    (nombre) => {
      expect(() =>
        configurarPostgres(
          new ConfigService({ ...entorno, [nombre]: undefined }),
        ),
      ).toThrow(`Falta configurar ${nombre} en el entorno de la API.`);
    },
  );

  it.each(['DB_HOST', 'DB_NAME', 'DB_USER'])('rechaza %s vacío', (nombre) => {
    expect(() =>
      configurarPostgres(new ConfigService({ ...entorno, [nombre]: ' ' })),
    ).toThrow(`Falta configurar ${nombre} en el entorno de la API.`);
  });

  it.each(['0', '65536', '5432.5', 'no-es-un-puerto', '1e3'])(
    'rechaza un puerto inválido: %s',
    (puerto) => {
      expect(() =>
        configurarPostgres(new ConfigService({ ...entorno, DB_PORT: puerto })),
      ).toThrow('DB_PORT debe ser un entero entre 1 y 65535.');
    },
  );
});
