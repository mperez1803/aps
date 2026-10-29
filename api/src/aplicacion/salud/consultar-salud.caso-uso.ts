import { Injectable } from '@nestjs/common';

export interface EstadoSalud {
  estado: 'disponible';
  servicio: 'API de Admisión APS';
}

@Injectable()
export class ConsultarSaludCasoUso {
  ejecutar(): EstadoSalud {
    return {
      estado: 'disponible',
      servicio: 'API de Admisión APS',
    };
  }
}
