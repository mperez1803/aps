import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface DatosSector { nombre: string; color: string; activo: boolean; }
export interface ContactoCentro { valor: string; uso: string; principal: boolean; }
export interface Sector extends DatosSector { id: number; centroId: number; }
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
export interface CentroSalud extends DatosCentro { id: number; sectores: Sector[]; }
export interface GuardarCentro extends DatosCentro { sectores?: (DatosSector & { id?: number })[]; }

@Injectable({ providedIn: 'root' })
export class ServicioCentros {
  private readonly http = inject(HttpClient);
  listar() { return this.http.get<CentroSalud[]>('/api/centros-salud'); }
  guardar(datos: GuardarCentro, id?: number) {
    return id
      ? this.http.patch<CentroSalud>(`/api/centros-salud/${id}`, datos)
      : this.http.post<CentroSalud>('/api/centros-salud', datos);
  }
  guardarSector(centroId: number, datos: DatosSector, id?: number) {
    const url = `/api/centros-salud/${centroId}/sectores`;
    return id ? this.http.patch<Sector>(`${url}/${id}`, datos) : this.http.post<Sector>(url, datos);
  }
}
