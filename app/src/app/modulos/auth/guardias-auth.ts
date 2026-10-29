import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ServicioAuth } from './servicio-auth';

export const requiereSesion: CanActivateFn = () => {
  const auth = inject(ServicioAuth);
  const router = inject(Router);
  return auth.restaurarSesion().then((vigente) => vigente || router.createUrlTree(['/login']));
};
