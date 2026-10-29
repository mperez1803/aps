import { Routes } from '@angular/router';

export const rutasAdmision: Routes = [
  {
    path: 'ingresos',
    title: 'Ingresos · Admisión · KUMARA',
    loadComponent: () => import('./paginas/ingresos/ingresos.component').then(
      (pagina) => pagina.IngresosComponent,
    ),
  },
  {
    path: '',
    title: 'Admisión · KUMARA',
    loadComponent: () =>
      import('./paginas/inicio-admision/inicio-admision.component').then(
        (pagina) => pagina.InicioAdmisionComponent,
      ),
  },
];
