import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ToolbarModule } from 'primeng/toolbar';
import { DialogModule } from 'primeng/dialog';
import { ColorPickerModule } from 'primeng/colorpicker';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { MessageModule } from 'primeng/message';
import { CentroSalud, ContactoCentro, Sector, ServicioCentros } from '../../../../compartido/centros-salud/servicio-centros';
import { catalogosIngreso } from '../../../admision/paginas/ingresos/catalogos-ingreso';
import { validarTelefono } from '../../../admision/paginas/ingresos/validadores-ingreso';
import { mensajeError } from '../../../auth/servicio-auth';

@Component({
  selector: 'kumara-centros',
  imports: [ReactiveFormsModule, ButtonModule, TableModule, ToolbarModule, DialogModule, ColorPickerModule, InputTextModule, SelectModule, InputGroupModule, InputGroupAddonModule, ToggleSwitchModule, TooltipModule, MessageModule],
  templateUrl: './centros.component.html',
  styleUrl: './centros.component.scss',
})
export class CentrosComponent {
  private readonly servicio = inject(ServicioCentros);
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly centros = signal<CentroSalud[]>([]);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly errorEditor = signal('');
  readonly aviso = signal('');
  readonly editorVisible = signal(false);
  readonly editando = signal<CentroSalud | null>(null);
  readonly sectorVisible = signal(false);
  readonly contactoVisible = signal<'telefonos' | 'correos' | null>(null);
  readonly comunas = catalogosIngreso.comunas.opciones;
  readonly usosContacto = catalogosIngreso.usoContacto.opciones;
  readonly contactos = [
    { nombre: 'telefonos', titulo: 'Teléfonos', singular: 'teléfono', icono: 'pi pi-phone', tipo: 'tel' },
    { nombre: 'correos', titulo: 'Correos', singular: 'correo', icono: 'pi pi-envelope', tipo: 'email' },
  ] as const;
  readonly formulario = this.fb.group({
    codigo: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(40)]],
    nombre: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(160)]],
    codigoDeis: ['', [Validators.pattern(/^\d*$/), Validators.maxLength(20)]],
    comunaCodigo: '',
    direccion: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(300)]],
    activo: true,
    utilizaSectores: false,
    telefonos: this.fb.array<ReturnType<typeof this.nuevoContacto>>([]),
    correos: this.fb.array<ReturnType<typeof this.nuevoContacto>>([]),
    sectores: this.fb.array<ReturnType<typeof this.nuevoSector>>([]),
  });
  private readonly cambiosContacto = toSignal(this.formulario.valueChanges);
  readonly resumenContacto = computed(() => {
    this.cambiosContacto();
    return {
      telefonos: this.formulario.controls.telefonos.getRawValue().find((contacto) => contacto.principal)?.valor ?? '',
      correos: this.formulario.controls.correos.getRawValue().find((contacto) => contacto.principal)?.valor ?? '',
    };
  });
  readonly utilizaSectores = toSignal(this.formulario.controls.utilizaSectores.valueChanges, { initialValue: false });
  readonly cantidadSectores = computed(() => {
    this.cambiosContacto();
    return this.formulario.controls.sectores.length;
  });

  constructor() { this.cargar(); }

  nombreComuna(codigo: string) { return this.comunas.find((opcion) => opcion.codigo === codigo)?.nombre ?? codigo; }

  cargar() {
    this.error.set('');
    this.errorEditor.set('');
    this.cargando.set(true);
    this.servicio.listar().subscribe({
      next: (centros) => {
        this.centros.set(centros);
        this.cargando.set(false);
      },
      error: (error: unknown) => { this.error.set(mensajeError(error)); this.cargando.set(false); },
    });
  }

  editar(centro: CentroSalud | null = null) {
    this.editando.set(centro);
    this.error.set('');
    this.errorEditor.set('');
    this.aviso.set('');
    this.formulario.reset({
      codigo: centro?.codigo ?? '', nombre: centro?.nombre ?? '', codigoDeis: centro?.codigoDeis ?? '',
      comunaCodigo: centro?.comunaCodigo ?? '', direccion: centro?.direccion ?? '',
      activo: centro?.activo ?? true, utilizaSectores: centro?.utilizaSectores ?? false,
    });
    this.formulario.controls.telefonos.clear();
    this.formulario.controls.correos.clear();
    this.formulario.controls.sectores.clear();
    for (const telefono of centro?.telefonos ?? []) { this.formulario.controls.telefonos.push(this.nuevoContacto(false, telefono)); }
    for (const correo of centro?.correos ?? []) { this.formulario.controls.correos.push(this.nuevoContacto(true, correo)); }
    for (const sector of centro?.sectores ?? []) { this.formulario.controls.sectores.push(this.nuevoSector(sector)); }
    this.contactoVisible.set(null);
    this.sectorVisible.set(false);
    this.editorVisible.set(true);
  }

  agregarContacto(categoria: 'telefonos' | 'correos') {
    const registros = this.formulario.controls[categoria];
    if (registros.length >= 20) { this.errorEditor.set('Se permiten hasta 20 contactos por categoría.'); return; }
    registros.push(this.nuevoContacto(categoria === 'correos', { valor: '', uso: '', principal: registros.length === 0 }));
  }

  marcarPrincipal(categoria: 'telefonos' | 'correos', indice: number) {
    this.formulario.controls[categoria].controls.forEach((registro, posicion) => registro.controls.principal.setValue(posicion === indice));
  }

  quitarContacto(categoria: 'telefonos' | 'correos', indice: number) {
    const registros = this.formulario.controls[categoria];
    const principal = registros.at(indice).controls.principal.value;
    registros.removeAt(indice);
    if (principal && registros.length) { this.marcarPrincipal(categoria, 0); }
  }

  private nuevoContacto(correo = false, contacto: ContactoCentro = { valor: '', uso: '', principal: true }) {
    return this.fb.group({
      valor: [contacto.valor, [Validators.required, correo ? Validators.email : validarTelefono, Validators.maxLength(correo ? 254 : 40)]],
      uso: contacto.uso,
      principal: contacto.principal,
    });
  }

  private nuevoSector(sector?: Sector) {
    return this.fb.group({
      id: this.fb.control<number | null>(sector?.id ?? null),
      nombre: [sector?.nombre ?? '', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(120)]],
      color: [sector?.color ?? '', [Validators.required, Validators.pattern(/^#[0-9a-f]{6}$/i)]],
      activo: sector?.activo ?? true,
    });
  }

  agregarSector() {
    if (!this.formulario.controls.activo.value || !this.formulario.controls.utilizaSectores.value) {
      this.errorEditor.set('Activa el centro y Utiliza sectores para agregar sectores.');
      return;
    }
    this.formulario.controls.sectores.push(this.nuevoSector());
  }

  quitarSector(indice: number) {
    const sector = this.formulario.controls.sectores.at(indice);
    if (sector.controls.id.value !== null) {
      sector.controls.activo.setValue(false);
    } else {
      this.formulario.controls.sectores.removeAt(indice);
    }
  }

  cerrarEditor() {
    if (this.guardando()) { return; }
    this.contactoVisible.set(null);
    this.sectorVisible.set(false);
    this.editorVisible.set(false);
  }

  guardar() {
    if (this.formulario.invalid || this.guardando()) { this.formulario.markAllAsTouched(); return; }
    const datos = this.formulario.getRawValue();
    if (datos.sectores.some((sector) => sector.id === null) && (!datos.activo || !datos.utilizaSectores)) {
      this.errorEditor.set('Hay sectores nuevos sin guardar. Activa el centro y Utiliza sectores, o quita esas filas antes de guardar.');
      return;
    }
    this.guardando.set(true);
    this.errorEditor.set('');
    this.aviso.set('');
    const sectores = datos.sectores.map(({ id, color, ...sector }) => ({
      ...sector, color, ...(id === null ? {} : { id }),
    }));
    this.servicio.guardar({ ...datos, sectores, codigoDeis: datos.codigoDeis.trim() || null }, this.editando()?.id).subscribe({
      next: () => { this.guardando.set(false); this.editorVisible.set(false); this.aviso.set('Centro de salud guardado.'); this.cargar(); },
      error: (error: unknown) => { this.guardando.set(false); this.errorEditor.set(mensajeError(error)); },
    });
  }

}
