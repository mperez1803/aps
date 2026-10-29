import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { mensajeError, ServicioAuth } from '../modulos/auth/servicio-auth';

@Component({
  selector: 'aps-estructura',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ButtonModule, MessageModule],
  templateUrl: './estructura.component.html',
  styleUrl: './estructura.component.scss',
})
export class EstructuraComponent {
  readonly auth = inject(ServicioAuth);
  readonly menuAbierto = signal(false);
  readonly cerrando = signal(false);
  readonly error = signal('');

  salir() {
    this.error.set('');
    this.cerrando.set(true);
    this.auth.cerrarSesion().subscribe({
      next: () => this.cerrando.set(false),
      error: (error: unknown) => { this.error.set(mensajeError(error)); this.cerrando.set(false); },
    });
  }
}
