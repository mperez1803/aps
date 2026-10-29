import { Routes } from '@angular/router';

export const rutasAdministracion: Routes = [
  {
    path: 'centros-salud',
    title: 'Centros de Salud · KUMARA',
    loadComponent: () => import('./paginas/centros/centros.component').then((pagina) => pagina.CentrosComponent),
  },
  {
    path: '',
    title: 'Administración · KUMARA',
    loadComponent: () => import('./paginas/inicio-administracion.component').then(
      (pagina) => pagina.InicioAdministracionComponent,
    ),
  },
  {
    path: 'usuarios',
    title: 'Usuarios · KUMARA',
    loadComponent: () => import('./paginas/usuarios/usuarios.component').then(
      (pagina) => pagina.UsuariosComponent,
    ),
  },
  {
    path: 'roles',
    title: 'Roles · KUMARA',
    loadComponent: () => import('./paginas/roles/roles.component').then(
      (pagina) => pagina.RolesComponent,
    ),
  },
  { path: 'usuarios-roles', pathMatch: 'full', redirectTo: 'usuarios' },
];
