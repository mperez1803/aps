import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { mensajeError, Rol } from '../../../auth/servicio-auth';

@Component({
  selector: 'kumara-roles',
  imports: [ReactiveFormsModule, ButtonModule, CardModule, DialogModule, ToolbarModule, InputTextModule, MessageModule, TableModule],
  templateUrl: './roles.component.html',
  styleUrl: './roles.component.scss',
})
export class RolesComponent {
  private readonly http = inject(HttpClient);
  readonly roles = signal<Rol[]>([]);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly aviso = signal('');
  readonly modalVisible = signal(false);
  readonly editando = signal<Rol | null>(null);
  readonly errorModal = signal('');
  readonly formulario = inject(FormBuilder).nonNullable.group({
    nombre: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(80)]],
  });

  constructor() { this.cargar(); }

  editar(rol: Rol) {
    this.editando.set(rol);
    this.formulario.reset({ nombre: rol.nombre });
    this.errorModal.set('');
    this.modalVisible.set(true);
  }

  cargar() {
    this.error.set('');
    this.cargando.set(true);
    this.http.get<Rol[]>('/api/auth/roles').subscribe({
      next: (roles) => { this.roles.set(roles); this.cargando.set(false); },
      error: (error: unknown) => { this.error.set(mensajeError(error)); this.cargando.set(false); },
    });
  }

  guardar() {
    const rol = this.editando();
    if (!rol || this.formulario.invalid || this.guardando()) { this.formulario.markAllAsTouched(); return; }
    this.guardando.set(true);
    this.errorModal.set('');
    this.aviso.set('');
    this.http.patch<Rol>(`/api/auth/roles/${rol.id}`, {
      nombre: this.formulario.controls.nombre.value.trim(),
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.modalVisible.set(false);
        this.aviso.set('Rol actualizado correctamente.');
        this.cargar();
      },
      error: (error: unknown) => { this.errorModal.set(mensajeError(error)); this.guardando.set(false); },
    });
  }
}
