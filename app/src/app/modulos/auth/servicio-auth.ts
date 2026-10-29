import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, firstValueFrom, of, tap } from 'rxjs';
import { EstadoSesion } from './estado-sesion';

export interface Rol { id: number; nombre: string; codigo: string; }
export interface Usuario { id: number; nombreUsuario: string; activo: boolean; rol: Rol; }
interface Sesion { usuario: Usuario; expiraEnSegundos: number; }

export function mensajeError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) { return 'No se pudo conectar con la API. Intenta nuevamente.'; }
    if (error.status === 429) { return 'Demasiados intentos. Espera un minuto antes de volver a intentar.'; }
    const cuerpo: unknown = error.error;
    if (cuerpo && typeof cuerpo === 'object' && 'message' in cuerpo && typeof cuerpo.message === 'string') {
      return cuerpo.message;
    }
  }
  return 'No se pudo completar la operación. Intenta nuevamente.';
}

@Injectable({ providedIn: 'root' })
export class ServicioAuth {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly estado = inject(EstadoSesion);
  private vencimiento?: ReturnType<typeof setTimeout>;
  readonly usuario = this.estado.usuario;
  private restauracion?: Promise<boolean>;
  readonly esAdministrador = computed(() => {
    const codigo = this.usuario()?.rol.codigo;
    return codigo === 'super' || codigo === 'administrador';
  });

  iniciarSesion(nombreUsuario: string, clave: string) {
    return this.http.post<Sesion>('/api/auth/login', { nombreUsuario, clave }).pipe(tap((sesion) => {
      this.aplicarSesion(sesion);
    }));
  }

  cerrarSesion() { return this.http.post<void>('/api/auth/logout', {}).pipe(tap(() => this.expirar())); }

  restaurarSesion(): Promise<boolean> {
    if (this.usuario()) { return Promise.resolve(true); }
    return this.restauracion ??= firstValueFrom(this.http.get<Sesion>('/api/auth/yo').pipe(
      tap((sesion) => this.aplicarSesion(sesion)),
      catchError((error: unknown) => {
        this.limpiar();
        if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
          this.errorRestauracion = mensajeError(error);
        }
        return of(null);
      }),
    )).then((sesion) => !!sesion).finally(() => { this.restauracion = undefined; });
  }

  errorRestauracion = '';

  private aplicarSesion(sesion: Sesion) {
    this.limpiar();
    this.errorRestauracion = '';
    this.estado.establecer(sesion.usuario);
    this.vencimiento = setTimeout(() => this.expirar(), sesion.expiraEnSegundos * 1000);
  }

  expirar() {
    this.limpiar();
    void this.router.navigateByUrl('/login');
  }

  private limpiar() {
    clearTimeout(this.vencimiento);
    this.estado.establecer(null);
  }
}
