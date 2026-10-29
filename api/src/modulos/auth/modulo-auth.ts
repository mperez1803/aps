import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicioAuth } from './aplicacion/servicio-auth.js';
import { RepositorioAuth } from './dominio/repositorio-auth.js';
import { ControladorAuth } from './infraestructura/controlador-auth.js';
import {
  RolEntidad,
  UsuarioEntidad,
} from './infraestructura/entidades-auth.js';
import { GuardiaAuth } from './infraestructura/guardia-auth.js';
import { RepositorioAuthPostgres } from './infraestructura/repositorio-auth-postgres.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([RolEntidad, UsuarioEntidad]),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configuracion: ConfigService) => {
        const secreto = configuracion.get<string>('JWT_SECRET');
        if (!secreto || Buffer.byteLength(secreto) < 32) {
          throw new Error(
            'Configura JWT_SECRET con al menos 32 bytes aleatorios en el entorno de la API.',
          );
        }
        return {
          secret: secreto,
          signOptions: {
            expiresIn: '30m',
            algorithm: 'HS256',
            issuer: 'aps-api',
            audience: 'aps-app',
          },
          verifyOptions: { issuer: 'aps-api', audience: 'aps-app' },
        };
      },
    }),
  ],
  controllers: [ControladorAuth],
  providers: [
    ServicioAuth,
    { provide: RepositorioAuth, useClass: RepositorioAuthPostgres },
    { provide: APP_GUARD, useClass: GuardiaAuth },
  ],
  exports: [RepositorioAuth],
})
export class ModuloAuth {}
