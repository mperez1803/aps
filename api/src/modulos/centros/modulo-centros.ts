import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicioCentros } from './aplicacion/servicio-centros.js';
import { RepositorioCentros } from './dominio/repositorio-centros.js';
import {
  CentroSaludEntidad,
  SectorEntidad,
} from './infraestructura/entidades-centros.js';
import { RepositorioCentrosPostgres } from './infraestructura/repositorio-centros-postgres.js';
import { ControladorCentros } from './infraestructura/controlador-centros.js';

@Module({
  imports: [TypeOrmModule.forFeature([CentroSaludEntidad, SectorEntidad])],
  controllers: [ControladorCentros],
  providers: [
    ServicioCentros,
    { provide: RepositorioCentros, useClass: RepositorioCentrosPostgres },
  ],
})
export class ModuloCentros {}
