export interface ContactoCentro {
  valor: string;
  uso: string;
  principal: boolean;
}

export interface DatosCentro {
  codigo: string;
  nombre: string;
  codigoDeis: string | null;
  comunaCodigo: string;
  direccion: string;
  telefonos: ContactoCentro[];
  correos: ContactoCentro[];
  activo: boolean;
  utilizaSectores: boolean;
}

export interface DatosSector {
  nombre: string;
  color: string;
  activo: boolean;
}

export interface Sector extends DatosSector {
  id: number;
  centroId: number;
}

export interface GuardarCentro extends DatosCentro {
  sectores?: (DatosSector & { id?: number })[];
}

export interface CentroSalud extends DatosCentro {
  id: number;
  sectores: Sector[];
}

export abstract class RepositorioCentros {
  abstract listar(): Promise<CentroSalud[]>;
  abstract crear(datos: GuardarCentro): Promise<CentroSalud>;
  abstract actualizar(id: number, datos: GuardarCentro): Promise<CentroSalud>;
  abstract crearSector(centroId: number, datos: DatosSector): Promise<Sector>;
  abstract actualizarSector(
    centroId: number,
    id: number,
    datos: DatosSector,
  ): Promise<Sector>;
}
