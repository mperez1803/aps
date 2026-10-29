import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { mensajeError, ServicioAuth } from '../servicio-auth';

@Component({
  selector: 'aps-login',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, MessageModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly auth = inject(ServicioAuth);
  private readonly router = inject(Router);
  private readonly formularios = inject(FormBuilder);
  readonly enviando = signal(false);
  readonly error = signal(this.auth.errorRestauracion);
  readonly formulario = this.formularios.nonNullable.group({
    nombreUsuario: ['', [Validators.required, Validators.maxLength(60)]],
    clave: ['', [Validators.required, Validators.maxLength(128)]],
  });

  ingresar() {
    if (this.formulario.invalid || this.enviando()) { this.formulario.markAllAsTouched(); return; }
    this.error.set('');
    this.enviando.set(true);
    const { nombreUsuario, clave } = this.formulario.getRawValue();
    this.auth.iniciarSesion(nombreUsuario, clave).subscribe({
      next: () => { this.formulario.controls.clave.reset(); void this.router.navigateByUrl('/admision'); },
      error: (error: unknown) => {
        this.error.set(mensajeError(error));
        this.formulario.controls.clave.reset();
        this.enviando.set(false);
      },
    });
  }
}
