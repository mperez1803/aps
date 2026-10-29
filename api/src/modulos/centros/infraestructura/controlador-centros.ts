import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ServicioCentros } from '../aplicacion/servicio-centros.js';

@Controller('centros-salud')
export class ControladorCentros {
  constructor(private readonly servicio: ServicioCentros) {}
  @Get()
  listar() {
    return this.servicio.listar();
  }
  @Post()
  crear(@Body() datos: unknown) {
    return this.servicio.crear(datos);
  }
  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() datos: unknown) {
    return this.servicio.actualizar(this.servicio.identificador(id), datos);
  }
  @Post(':id/sectores')
  crearSector(@Param('id') id: string, @Body() datos: unknown) {
    return this.servicio.crearSector(this.servicio.identificador(id), datos);
  }
  @Patch(':id/sectores/:sectorId')
  actualizarSector(
    @Param('id') id: string,
    @Param('sectorId') sectorId: string,
    @Body() datos: unknown,
  ) {
    return this.servicio.actualizarSector(
      this.servicio.identificador(id),
      this.servicio.identificador(sectorId),
      datos,
    );
  }
}
