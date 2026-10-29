import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ServicioAuth } from './servicio-auth';

export const interceptorAuth: HttpInterceptorFn = (solicitud, siguiente) => {
  const auth = inject(ServicioAuth);
  if (!solicitud.url.startsWith('/api/')) { return siguiente(solicitud); }
  const autenticada = ['GET', 'HEAD', 'OPTIONS'].includes(solicitud.method)
    ? solicitud
    : solicitud.clone({ setHeaders: { 'X-Kumara-CSRF': '1' } });
  return siguiente(autenticada).pipe(catchError((error: unknown) => {
    if (error instanceof HttpErrorResponse && error.status === 401 && !['/api/auth/login', '/api/auth/yo'].includes(solicitud.url)) {
      auth.expirar();
    }
    return throwError(() => error);
  }));
};
