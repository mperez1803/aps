import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'kumara-inicio-administracion',
  imports: [RouterLink, ButtonModule, CardModule],
  template: `
    <div class="cabecera-pagina">
      <span class="sobretitulo">ESPACIO DE TRABAJO / ADMINISTRACIÓN</span>
      <h1>Administración</h1>
      <p>Mantenedores y configuración de la plataforma, organizados por función.</p>
    </div>
    <p-card header="Roles">
      <p>Consulta los cinco roles fijos de la plataforma y edita sus nombres.</p>
      <p-button label="Administrar roles" routerLink="/administracion/roles" />
    </p-card>
    <p-card header="Usuarios">
      <p>Gestiona las cuentas de acceso, su estado y el rol asignado a cada usuario.</p>
      <p-button label="Administrar usuarios" routerLink="/administracion/usuarios" />
    </p-card>
    <p-card header="Centros de Salud">
      <p>Gestiona establecimientos, códigos, comuna, dirección, contactos y sectores de la institución.</p>
      <p-button label="Administrar centros" icon="pi pi-building" routerLink="/administracion/centros-salud" />
    </p-card>
  `,
  styles: `p-card { display: block; margin-bottom: 1.5rem; }`,
})
export class InicioAdministracionComponent {}
