import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsultarSaludCasoUso } from './aplicacion/salud/consultar-salud.caso-uso.js';
import { ControladorSalud } from './infraestructura/entrada-rest/controlador-salud.js';
import { configurarPostgres } from './infraestructura/persistencia/configuracion-postgres.js';
import { ModuloAuth } from './modulos/auth/modulo-auth.js';
import { ModuloCentros } from './modulos/centros/modulo-centros.js';
import { iniciarFuenteDatos } from './infraestructura/persistencia/iniciar-fuente-datos.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: configurarPostgres,
      dataSourceFactory: iniciarFuenteDatos,
    }),
    ModuloAuth,
    ModuloCentros,
  ],
  controllers: [ControladorSalud],
  providers: [ConsultarSaludCasoUso],
})
export class ModuloAplicacion {}
