import { Controller, Get } from '@nestjs/common';
import { ConsultarSaludCasoUso } from '../../aplicacion/salud/consultar-salud.caso-uso.js';
import { Publico } from '../../modulos/auth/infraestructura/guardia-auth.js';

@Controller('salud')
export class ControladorSalud {
  constructor(private readonly consultarSalud: ConsultarSaludCasoUso) {}

  @Get()
  @Publico()
  consultar() {
    return this.consultarSalud.ejecutar();
  }
}
