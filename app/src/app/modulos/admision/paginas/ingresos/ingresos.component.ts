import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { FieldsetModule } from 'primeng/fieldset';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { CheckboxModule } from 'primeng/checkbox';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { ToolbarModule } from 'primeng/toolbar';
import { catalogosIngreso } from './catalogos-ingreso';
import { formatearRut, rutValido, validarIdentificacion, validarTelefono } from './validadores-ingreso';
import { CentroSalud, ServicioCentros } from '../../../../compartido/centros-salud/servicio-centros';
import { mensajeError } from '../../../auth/servicio-auth';

@Component({
  selector: 'kumara-ingresos',
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, TabsModule, FieldsetModule, InputTextModule, MessageModule, SelectModule, DialogModule, InputGroupModule, InputGroupAddonModule, TableModule, DatePickerModule, CheckboxModule, ToggleSwitchModule, TooltipModule, ToolbarModule],
  templateUrl: './ingresos.component.html',
  styleUrl: './ingresos.component.scss',
})
export class IngresosComponent {
  private readonly formularios = inject(FormBuilder).nonNullable;
  private readonly servicioCentros = inject(ServicioCentros);
  readonly catalogos = catalogosIngreso;
  readonly opcionesIdiomas = catalogosIngreso.idiomas.opciones.map((opcion) => ({
    ...opcion,
    nombre: opcion.codigo ? new Intl.DisplayNames(['es'], { type: 'language' }).of(opcion.codigo) ?? opcion.nombre : opcion.nombre,
  }));
  readonly tiposIdentificacion = [
    'No informado', 'RUT/RUN chileno', 'Pasaporte', 'Documento nacional extranjero',
    'Identificador de salud/institución', 'Provisorio/temporal', 'Otro documento oficial',
  ];
  readonly formulario = this.formularios.group({
    provisional: false,
    nombres: ['', [Validators.required, Validators.pattern(/\S/)]],
    apellidos: '',
    nombreSocial: '',
    fechaNacimiento: this.formularios.control<Date | null>(null),
    fechaDefuncion: this.formularios.control<Date | null>(null),
    sexoBiologico: 1,
    identidadGenero: 1,
    etnia: 1,
    paisNacimiento: 1,
    estadoCivil: 1,
    centroSalud: this.formularios.control<number | null>({ value: null, disabled: true }),
    sector: this.formularios.control<number | null>({ value: null, disabled: true }),
    nacionalidades: this.formularios.array([this.nuevoCatalogo(this.catalogos.paises.opciones.find((opcion) => opcion.codigo === '152')!.id)]),
    idiomas: this.formularios.array([this.nuevoCatalogo(this.catalogos.idiomas.opciones.find((opcion) => opcion.codigo === 'es')!.id)]),
    identificaciones: this.formularios.array([this.nuevaIdentificacion()]),
    telefonos: this.formularios.array([this.nuevoContacto()]),
    correos: this.formularios.array([this.nuevoContacto(true)]),
    direcciones: this.formularios.array([this.nuevaDireccion()]),
    contactosEmergencia: this.formularios.array([this.nuevoContactoEmergencia()]),
  });
  readonly provisional = toSignal(this.formulario.controls.provisional.valueChanges, { initialValue: false });
  readonly centros = signal<CentroSalud[]>([]);
  readonly cargandoCentros = signal(false);
  readonly errorCentros = signal('');
  private readonly centroId = toSignal(this.formulario.controls.centroSalud.valueChanges, { initialValue: null });
  readonly opcionesCentros = computed(() => [
    { id: null, nombre: 'No informado' },
    ...this.centros().filter((centro) => centro.activo).map((centro) => ({ id: centro.id, nombre: `${centro.codigo} · ${centro.nombre}` })),
  ]);
  readonly centroSeleccionado = computed(() => this.centros().find((centro) => centro.id === this.centroId() && centro.activo));
  readonly opcionesSectores = computed(() => [
    { id: null, nombre: 'No informado' },
    ...(this.centroSeleccionado()?.utilizaSectores
      ? this.centroSeleccionado()?.sectores.filter((sector) => sector.activo).map((sector) => ({ id: sector.id, nombre: sector.nombre })) ?? []
      : []),
  ]);

  constructor() { this.cargarCentros(); }

  cargarCentros() {
    this.errorCentros.set('');
    this.cargandoCentros.set(true);
    this.formulario.controls.centroSalud.disable();
    this.formulario.controls.sector.disable();
    this.servicioCentros.listar().subscribe({
      next: (centros) => {
        const sectorAnterior = this.formulario.controls.sector.value;
        this.centros.set(centros);
        const id = this.formulario.controls.centroSalud.value;
        if (!centros.some((centro) => centro.id === id && centro.activo)) {
          this.formulario.controls.centroSalud.setValue(null);
        }
        this.formulario.controls.centroSalud.enable();
        this.cambiarCentro();
        if (this.opcionesSectores().some((sector) => sector.id === sectorAnterior)) {
          this.formulario.controls.sector.setValue(sectorAnterior);
        }
        this.cargandoCentros.set(false);
      },
      error: (error: unknown) => { this.errorCentros.set(mensajeError(error)); this.cargandoCentros.set(false); },
    });
  }

  cambiarCentro() {
    this.formulario.controls.sector.setValue(null);
    if (this.centroSeleccionado()?.utilizaSectores) { this.formulario.controls.sector.enable(); }
    else { this.formulario.controls.sector.disable(); }
  }
  readonly identificacionesVisibles = signal(false);
  readonly rutIngresado = signal<string | null>(null);
  readonly errorRut = signal('');
  readonly catalogoVisible = signal<'nacionalidades' | 'idiomas' | null>(null);
  readonly catalogosMultiples = [
    { nombre: 'nacionalidades', titulo: 'Nacionalidades', singular: 'Nacionalidad', icono: 'pi pi-flag' },
    { nombre: 'idiomas', titulo: 'Idiomas de comunicación', singular: 'Idioma', icono: 'pi pi-language' },
  ] as const;
  private readonly nacionalidades = toSignal(this.formulario.controls.nacionalidades.valueChanges, {
    initialValue: this.formulario.controls.nacionalidades.getRawValue(),
  });
  private readonly idiomas = toSignal(this.formulario.controls.idiomas.valueChanges, {
    initialValue: this.formulario.controls.idiomas.getRawValue(),
  });
  readonly resumenCatalogos = computed(() => ({
    nacionalidades: this.resumirCatalogo(this.nacionalidades(), this.catalogos.paises.opciones),
    idiomas: this.resumirCatalogo(this.idiomas(), this.opcionesIdiomas),
  }));

  private resumirCatalogo(registros: { id?: number; principal?: boolean }[], opciones: { id: number; nombre: string }[]) {
    const principal = registros.find((registro) => registro.principal);
    return principal ? opciones.find((opcion) => opcion.id === principal.id)?.nombre ?? '' : '';
  }
  private readonly identificaciones = toSignal(this.formulario.controls.identificaciones.valueChanges, {
    initialValue: this.formulario.controls.identificaciones.getRawValue(),
  });
  readonly identificacionPrincipal = computed(() => {
    const principal = this.identificaciones().find((registro) => registro.principal);
    return principal?.valor?.trim() ?? '';
  });
  readonly tipoIdentificacionPrincipal = computed(() =>
    this.identificaciones().find((registro) => registro.principal)?.tipo || 'RUT/RUN chileno');
  readonly identificacionesInvalidas = computed(() => {
    this.identificaciones();
    return this.formulario.controls.identificaciones.invalid;
  });
  readonly coleccionesContacto = [
    { nombre: 'telefonos', titulo: 'Teléfonos', singular: 'teléfono', tipo: 'tel', controles: this.formulario.controls.telefonos },
    { nombre: 'correos', titulo: 'Correos electrónicos', singular: 'correo', tipo: 'email', controles: this.formulario.controls.correos },
  ] as const;
  readonly contactoVisible = signal<'telefonos' | 'correos' | 'direcciones' | 'contactosEmergencia' | null>(null);
  readonly mediosContacto = [
    { nombre: 'telefonos', titulo: 'Teléfonos', icono: 'pi pi-phone' },
    { nombre: 'correos', titulo: 'Correos', icono: 'pi pi-envelope' },
    { nombre: 'contactosEmergencia', titulo: 'Contactos', icono: 'pi pi-users' },
  ] as const;
  private readonly cambiosContacto = toSignal(this.formulario.valueChanges);
  readonly resumenContacto = computed(() => {
    this.cambiosContacto();
    const principal = this.formulario.controls.direcciones.getRawValue().find((direccion) => direccion.principal);
    const comuna = this.catalogos.comunas.opciones.find((opcion) => opcion.id === principal?.comuna && opcion.codigo)?.nombre;
    return {
      telefonos: this.formulario.controls.telefonos.getRawValue().find((contacto) => contacto.principal)?.valor.trim() ?? '',
      correos: this.formulario.controls.correos.getRawValue().find((contacto) => contacto.principal)?.valor.trim() ?? '',
      contactosEmergencia: this.formulario.controls.contactosEmergencia.getRawValue().find((contacto) => contacto.principal)?.nombre.trim() ?? '',
      direcciones: principal ? [principal.calle, principal.numero, principal.unidad, principal.localidad, comuna].filter(Boolean).join(', ') : '',
    };
  });

  cambiarEstadoIdentidad() {
    const nombre = this.formulario.controls.nombres;
    if (this.formulario.controls.provisional.value) {
      nombre.clearValidators();
    } else {
      nombre.setValidators([Validators.required, Validators.pattern(/\S/)]);
    }
    nombre.updateValueAndValidity();
  }

  agregarIdentificacion() {
    const nueva = this.nuevaIdentificacion();
    nueva.controls.principal.setValue(this.formulario.controls.identificaciones.length === 0);
    this.formulario.controls.identificaciones.push(nueva);
  }

  registrarRut(evento: Event) {
    evento.preventDefault();
    evento.stopPropagation();
    const entrada = this.rutIngresado();
    const valor = entrada === null ? undefined : formatearRut(entrada);
    if (valor === undefined) { return; }
    if (!rutValido(valor)) {
      this.errorRut.set('RUT chileno inválido: revisa el formato y el dígito verificador.');
      return;
    }

    const registros = this.formulario.controls.identificaciones;
    const normalizado = valor.replace(/[.\-]/g, '').toUpperCase();
    let indice = registros.controls.findIndex((registro) =>
      registro.controls.tipo.value === 'RUT/RUN chileno' &&
      registro.controls.valor.value.replace(/[.\-\s]/g, '').toUpperCase() === normalizado);
    if (indice < 0) {
      indice = registros.controls.findIndex((registro) =>
        !registro.controls.valor.value &&
        (!registro.controls.tipo.value || registro.controls.tipo.value === 'RUT/RUN chileno'));
    }
    if (indice < 0) {
      this.agregarIdentificacion();
      indice = registros.length - 1;
    }
    registros.at(indice).patchValue({ tipo: 'RUT/RUN chileno', valor });
    this.marcarPrincipal('identificaciones', indice);
    this.rutIngresado.set(null);
    this.errorRut.set('');
  }

  formatearEntradaRut() {
    const valor = this.rutIngresado();
    if (valor !== null) { this.rutIngresado.set(formatearRut(valor)); }
  }

  formatearDocumento(indice: number) {
    const documento = this.formulario.controls.identificaciones.at(indice).controls;
    if (documento.tipo.value === 'RUT/RUN chileno') {
      documento.valor.setValue(formatearRut(documento.valor.value));
    }
  }

  agregarCatalogo(categoria: 'nacionalidades' | 'idiomas') {
    const nuevo = this.nuevoCatalogo();
    nuevo.controls.principal.setValue(this.formulario.controls[categoria].length === 0);
    this.formulario.controls[categoria].push(nuevo);
  }

  agregarContactoEmergencia() {
    const nuevo = this.nuevoContactoEmergencia();
    nuevo.controls.principal.setValue(this.formulario.controls.contactosEmergencia.length === 0);
    this.formulario.controls.contactosEmergencia.push(nuevo);
  }

  private nuevoContactoEmergencia() {
    return this.formularios.group({
      nombre: '',
      relacion: this.formularios.control({ value: '', disabled: true }),
      telefono: ['', validarTelefono],
      correo: ['', Validators.email],
      principal: true,
    });
  }

  private nuevoCatalogo(id = 1) {
    return this.formularios.group({ id, principal: true });
  }

  agregarContacto(categoria: 'telefonos' | 'correos') {
    const nuevo = this.nuevoContacto(categoria === 'correos');
    nuevo.controls.principal.setValue(this.formulario.controls[categoria].length === 0);
    this.formulario.controls[categoria].push(nuevo);
  }

  agregarDireccion() {
    const nueva = this.nuevaDireccion();
    nueva.controls.principal.setValue(this.formulario.controls.direcciones.length === 0);
    this.formulario.controls.direcciones.push(nueva);
  }

  provinciasDisponibles(indice: number) {
    const region = this.catalogos.regiones.opciones.find((opcion) =>
      opcion.id === this.formulario.controls.direcciones.at(indice).controls.region.value)?.codigo;
    return this.catalogos.provincias.opciones.filter((opcion) => opcion.id === 1 || opcion.regionCodigo === region);
  }

  comunasDisponibles(indice: number) {
    const provincia = this.catalogos.provincias.opciones.find((opcion) =>
      opcion.id === this.formulario.controls.direcciones.at(indice).controls.provincia.value)?.codigo;
    return this.catalogos.comunas.opciones.filter((opcion) => opcion.id === 1 || opcion.provinciaCodigo === provincia);
  }

  cambiarTerritorio(indice: number, nivel: 'pais' | 'region' | 'provincia') {
    const direccion = this.formulario.controls.direcciones.at(indice).controls;
    if (nivel === 'pais') { direccion.region.setValue(1); }
    if (nivel !== 'provincia') { direccion.provincia.setValue(1); }
    direccion.comuna.setValue(1);
    if (nivel === 'pais') {
      const esChile = this.catalogos.paises.opciones.find((opcion) => opcion.id === direccion.pais.value)?.codigo === '152';
      for (const control of [direccion.region, direccion.provincia, direccion.comuna]) {
        if (esChile) { control.enable(); } else { control.disable(); }
      }
    }
  }

  marcarPrincipal(categoria: 'nacionalidades' | 'idiomas' | 'identificaciones' | 'telefonos' | 'correos' | 'direcciones' | 'contactosEmergencia', indice: number) {
    this.formulario.controls[categoria].controls.forEach((registro, posicion) => {
      registro.controls.principal.setValue(posicion === indice);
    });
  }

  quitarRegistro(categoria: 'nacionalidades' | 'idiomas' | 'identificaciones' | 'telefonos' | 'correos' | 'direcciones' | 'contactosEmergencia', indice: number) {
    const registros = this.formulario.controls[categoria];
    const eraPrincipal = registros.at(indice).controls.principal.value;
    registros.removeAt(indice);
    if (eraPrincipal && registros.length > 0) { this.marcarPrincipal(categoria, 0); }
  }

  private nuevaIdentificacion() {
    return this.formularios.group({ tipo: '', valor: '', principal: true }, { validators: validarIdentificacion });
  }

  private nuevoContacto(correo = false) {
    return this.formularios.group({
      valor: ['', correo ? Validators.email : validarTelefono],
      uso: 1,
      principal: true,
    });
  }

  private nuevaDireccion() {
    return this.formularios.group({
      pais: 1,
      region: this.formularios.control({ value: 1, disabled: true }),
      provincia: this.formularios.control({ value: 1, disabled: true }),
      comuna: this.formularios.control({ value: 1, disabled: true }),
      uso: 1,
      calle: '', numero: '', unidad: '', localidad: '', codigoPostal: '',
      principal: true,
    });
  }
}
