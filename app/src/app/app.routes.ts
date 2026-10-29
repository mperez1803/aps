import { Routes } from '@angular/router';
import { requiereSesion } from './modulos/auth/guardias-auth';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./modulos/auth/login/login.component').then((pagina) => pagina.LoginComponent),
    title: 'Iniciar sesión · KUMARA',
  },
  {
    path: '',
    canActivate: [requiereSesion],
    canActivateChild: [requiereSesion],
    loadComponent: () => import('./estructura/estructura.component').then((pagina) => pagina.EstructuraComponent),
    children: [
      {
        path: 'admision',
        loadChildren: () => import('./modulos/admision/admision.routes').then((rutas) => rutas.rutasAdmision),
      },
      {
        path: 'administracion',
        loadChildren: () => import('./modulos/administracion/administracion.routes').then((rutas) => rutas.rutasAdministracion),
      },
      { path: '', pathMatch: 'full', redirectTo: 'admision' },
    ],
  },
  { path: '**', redirectTo: 'admision' },
];
