import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { mensajeError, Rol, ServicioAuth, Usuario } from '../../../auth/servicio-auth';

@Component({
  selector: 'kumara-usuarios',
  imports: [ReactiveFormsModule, ButtonModule, CardModule, DialogModule, ToolbarModule, InputTextModule, MessageModule, SelectModule, TableModule, TagModule],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.scss',
})
export class UsuariosComponent {
  private readonly http = inject(HttpClient);
  private readonly formularios = inject(FormBuilder);
  readonly auth = inject(ServicioAuth);
  readonly usuarios = signal<Usuario[]>([]);
  readonly roles = signal<Rol[]>([]);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly aviso = signal('');
  readonly editando = signal<number | null>(null);
  readonly modalVisible = signal(false);
  readonly errorModal = signal('');
  readonly formulario = this.formularios.nonNullable.group({
    nombreUsuario: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._-]{3,60}$/)]],
    clave: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(128)]],
    rolId: this.formularios.control<number | null>(null, Validators.required),
    activo: [true],
  });

  constructor() { this.cargar(); }

  cargar() {
    this.cargando.set(true);
    this.error.set('');
    forkJoin({
      usuarios: this.http.get<Usuario[]>('/api/auth/usuarios'),
      roles: this.http.get<Rol[]>('/api/auth/roles'),
    }).subscribe({
      next: (datos) => { this.usuarios.set(datos.usuarios); this.roles.set(datos.roles); this.cargando.set(false); },
      error: (error: unknown) => { this.error.set(mensajeError(error)); this.cargando.set(false); },
    });
  }

  editar(usuario: Usuario) {
    this.errorModal.set('');
    this.modalVisible.set(true);
    this.editando.set(usuario.id);
    this.formulario.controls.clave.setValidators([Validators.minLength(6), Validators.maxLength(128)]);
    this.formulario.controls.nombreUsuario.disable();
    this.formulario.reset({ nombreUsuario: usuario.nombreUsuario, clave: '', rolId: usuario.rol.id, activo: usuario.activo });
    this.formulario.controls.clave.updateValueAndValidity();
    this.aviso.set('');
  }

  nuevo() {
    this.errorModal.set('');
    this.aviso.set('');
    this.modalVisible.set(true);
    this.editando.set(null);
    this.formulario.controls.nombreUsuario.enable();
    this.formulario.controls.clave.setValidators([Validators.required, Validators.minLength(6), Validators.maxLength(128)]);
    this.formulario.reset({ nombreUsuario: '', clave: '', rolId: null, activo: true });
    this.formulario.controls.clave.updateValueAndValidity();
  }

  guardarUsuario() {
    if (this.formulario.invalid || this.guardando()) { this.formulario.markAllAsTouched(); return; }
    this.guardando.set(true);
    this.error.set('');
    this.errorModal.set('');
    this.aviso.set('');
    const valores = this.formulario.getRawValue();
    const id = this.editando();
    const peticion = id ?
      this.http.patch<Usuario>(`/api/auth/usuarios/${id}`, {
        rolId: valores.rolId, activo: valores.activo, ...(valores.clave ? { clave: valores.clave } : {}),
      }) :
      this.http.post<Usuario>('/api/auth/usuarios', {
        nombreUsuario: valores.nombreUsuario, clave: valores.clave, rolId: valores.rolId,
      });
    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.nuevo();
        this.modalVisible.set(false);
        if (id === this.auth.usuario()?.id) { this.auth.expirar(); return; }
        this.aviso.set('Usuario guardado correctamente.');
        this.cargar();
      },
      error: (error: unknown) => { this.errorModal.set(mensajeError(error)); this.guardando.set(false); },
    });
  }

}
