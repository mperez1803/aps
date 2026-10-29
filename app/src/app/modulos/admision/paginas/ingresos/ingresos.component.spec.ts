import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { IngresosComponent } from './ingresos.component';

describe('Formulario unificado de Ingresos', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [IngresosComponent],
      providers: [provideRouter([]), provideNoopAnimations(), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('requiere nombre para identidad conocida pero no para urgencia desconocida', () => {
    const pagina = TestBed.createComponent(IngresosComponent).componentInstance;
    expect(pagina.formulario.controls.nombres.invalid).toBeTrue();
    pagina.formulario.controls.provisional.setValue(true);
    pagina.cambiarEstadoIdentidad();
    expect(pagina.formulario.controls.nombres.valid).toBeTrue();
    pagina.formulario.controls.provisional.setValue(false);
    pagina.cambiarEstadoIdentidad();
    expect(pagina.formulario.controls.nombres.invalid).toBeTrue();
  });

  it('admite un solo nombre y contactos vacíos', () => {
    const pagina = TestBed.createComponent(IngresosComponent).componentInstance;
    pagina.formulario.controls.nombres.setValue('NombreSintetico');
    expect(pagina.formulario.valid).toBeTrue();
  });

  it('carga centros activos y filtra sectores, limpiándolos al cambiar de centro', () => {
    const pagina = TestBed.createComponent(IngresosComponent).componentInstance;
    const http = TestBed.inject(HttpTestingController);
    const base = { codigoDeis: null, comunaCodigo: '', direccion: 'Vía sintética', telefonos: [], correos: [], activo: true };
    http.expectOne('/api/centros-salud').flush([
      { ...base, id: 1, codigo: 'C1', nombre: 'Centro uno', utilizaSectores: true, sectores: [
        { id: 1, centroId: 1, color: '#123456', nombre: 'Sector uno', activo: true },
        { id: 2, centroId: 1, color: '#654321', nombre: 'Sector inactivo', activo: false },
      ] },
      { ...base, id: 2, codigo: 'C2', nombre: 'Centro dos', utilizaSectores: false, sectores: [] },
      { ...base, id: 3, codigo: 'C3', nombre: 'Centro inactivo', activo: false, utilizaSectores: false, sectores: [] },
    ]);
    expect(pagina.opcionesCentros().map((centro) => centro.id)).toEqual([null, 1, 2]);
    expect(pagina.formulario.controls.centroSalud.enabled).toBeTrue();
    pagina.formulario.controls.centroSalud.setValue(1);
    pagina.cambiarCentro();
    expect(pagina.formulario.controls.sector.enabled).toBeTrue();
    expect(pagina.opcionesSectores().map((sector) => sector.id)).toEqual([null, 1]);
    pagina.formulario.controls.sector.setValue(1);
    pagina.cargarCentros();
    http.expectOne('/api/centros-salud').flush(pagina.centros());
    expect(pagina.formulario.controls.sector.value).toBe(1);
    pagina.formulario.controls.centroSalud.setValue(2);
    pagina.cambiarCentro();
    expect(pagina.formulario.controls.sector.value).toBeNull();
    expect(pagina.formulario.controls.sector.disabled).toBeTrue();
    http.verify();
  });

  it('informa fallos al cargar centros y no habilita selección con datos no verificados', () => {
    const pagina = TestBed.createComponent(IngresosComponent).componentInstance;
    TestBed.inject(HttpTestingController).expectOne('/api/centros-salud').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(pagina.errorCentros()).not.toBe('');
    expect(pagina.formulario.controls.centroSalud.disabled).toBeTrue();
  });

  it('cambia el principal con ToggleSwitch sin permitir una colección sin principal', () => {
    const fixture = TestBed.createComponent(IngresosComponent);
    const pagina = fixture.componentInstance;
    pagina.agregarContacto('telefonos');
    pagina.contactoVisible.set('telefonos');
    fixture.detectChanges();
    const interruptores = fixture.debugElement.queryAll(By.directive(ToggleSwitch));
    expect(interruptores.length).toBe(2);
    const primero = interruptores[0].componentInstance as ToggleSwitch;
    const segundo = interruptores[1].componentInstance as ToggleSwitch;
    pagina.formulario.controls.telefonos.at(1).controls.principal.setValue(true);
    segundo.onChange.emit({ checked: true, originalEvent: new Event('change') });
    fixture.detectChanges();
    expect(pagina.formulario.controls.telefonos.getRawValue().map((registro) => registro.principal)).toEqual([false, true]);
    pagina.formulario.controls.telefonos.at(1).controls.principal.setValue(false);
    segundo.onChange.emit({ checked: false, originalEvent: new Event('change') });
    fixture.detectChanges();
    expect(pagina.formulario.controls.telefonos.at(1).controls.principal.value).toBeTrue();
    expect(segundo.checked()).toBeTrue();
    expect(primero.checked()).toBeFalse();
    const elemento: HTMLElement = fixture.nativeElement;
    expect(elemento.querySelectorAll('p-dialog p-table').length).toBe(1);
    expect(elemento.querySelectorAll('p-dialog .campo label').length).toBe(0);
    expect(elemento.querySelectorAll('p-dialog button[aria-label^="Quitar"] .pi-trash').length).toBe(2);
  });

  it('presenta Contactibilidad en Datos Personales con tres resúmenes y modales con tabla', () => {
    const fixture = TestBed.createComponent(IngresosComponent);
    fixture.detectChanges();
    const pagina = fixture.componentInstance;
    const elemento: HTMLElement = fixture.nativeElement;
    expect(elemento.querySelector('p-tabpanel[value="personales"] .campos-contactibilidad')?.children.length).toBe(3);
    expect(elemento.querySelector('.campos-demograficos #principal-direcciones')).not.toBeNull();
    expect(elemento.querySelector('.campos-contactibilidad #principal-direcciones')).toBeNull();
    expect(elemento.querySelector('.campos-contactibilidad #principal-contactosEmergencia')).not.toBeNull();
    expect(elemento.querySelector('p-tabpanel[value="contactibilidad"] #principal-telefonos')).toBeNull();
    for (const medio of pagina.mediosContacto) {
      elemento.querySelector<HTMLButtonElement>(`button[aria-label="Gestionar ${medio.titulo}"]`)?.click();
      fixture.detectChanges();
      expect(pagina.contactoVisible()).toBe(medio.nombre);
      expect(elemento.querySelectorAll('p-dialog tbody tr').length).toBeGreaterThan(0);
      pagina.contactoVisible.set(null);
      fixture.detectChanges();
    }
  });

  it('mantiene el contacto principal y su resumen sin asignar autorizaciones', () => {
    const pagina = TestBed.createComponent(IngresosComponent).componentInstance;
    pagina.formulario.controls.contactosEmergencia.at(0).controls.nombre.setValue('Contacto sintético uno');
    pagina.agregarContactoEmergencia();
    pagina.formulario.controls.contactosEmergencia.at(1).controls.nombre.setValue('Contacto sintético dos');
    expect(pagina.formulario.controls.contactosEmergencia.at(1).controls.principal.value).toBeFalse();
    pagina.marcarPrincipal('contactosEmergencia', 1);
    expect(pagina.resumenContacto().contactosEmergencia).toBe('Contacto sintético dos');
    pagina.quitarRegistro('contactosEmergencia', 1);
    expect(pagina.resumenContacto().contactosEmergencia).toBe('Contacto sintético uno');
    pagina.quitarRegistro('contactosEmergencia', 0);
    expect(pagina.resumenContacto().contactosEmergencia).toBe('');
    pagina.agregarContactoEmergencia();
    expect(pagina.formulario.controls.contactosEmergencia.at(0).controls.principal.value).toBeTrue();
    expect(pagina.formulario.controls.contactosEmergencia.at(0).controls.relacion.disabled).toBeTrue();
  });

  it('actualiza el resumen al editar, cambiar y eliminar el principal', () => {
    const pagina = TestBed.createComponent(IngresosComponent).componentInstance;
    pagina.formulario.controls.telefonos.at(0).controls.valor.setValue('+56000000001');
    pagina.agregarContacto('telefonos');
    pagina.formulario.controls.telefonos.at(1).controls.valor.setValue('+56000000002');
    expect(pagina.resumenContacto().telefonos).toBe('+56000000001');
    pagina.marcarPrincipal('telefonos', 1);
    expect(pagina.resumenContacto().telefonos).toBe('+56000000002');
    pagina.quitarRegistro('telefonos', 1);
    expect(pagina.resumenContacto().telefonos).toBe('+56000000001');
    pagina.quitarRegistro('telefonos', 0);
    expect(pagina.resumenContacto().telefonos).toBe('');
    pagina.agregarContacto('telefonos');
    expect(pagina.formulario.controls.telefonos.at(0).controls.principal.value).toBeTrue();
    pagina.formulario.controls.correos.at(0).controls.valor.setValue('sintetico@example.invalid');
    expect(pagina.resumenContacto().correos).toBe('sintetico@example.invalid');
    pagina.formulario.controls.direcciones.at(0).patchValue({ calle: 'Vía sintética', numero: '123', localidad: 'Localidad ficticia' });
    expect(pagina.resumenContacto().direcciones).toBe('Vía sintética, 123, Localidad ficticia');
  });

  it('presenta las ayudas sin texto debajo de los campos y conserva ambos calendarios', () => {
    const fixture = TestBed.createComponent(IngresosComponent);
    fixture.detectChanges();
    const elemento: HTMLElement = fixture.nativeElement;
    expect(elemento.querySelectorAll('.campo small:not(.error)').length).toBe(0);
    expect(elemento.querySelectorAll('.campo p-button.ayuda-campo').length).toBe(0);
    expect(elemento.querySelectorAll('.campo p-inputgroup-addon[tabindex="0"][aria-label="Ayuda del campo"]').length).toBeGreaterThan(0);
    for (const id of ['fechaNacimiento', 'fechaDefuncion']) {
      const entrada = elemento.querySelector<HTMLInputElement>(`#${id}`);
      expect(entrada?.placeholder).toBe('dd/mm/aaaa');
      expect(entrada?.style.width).toBe('100%');
      expect(entrada?.closest('.p-datepicker')?.getAttribute('style')).toContain('width: 100%');
    }
  });

  for (const categoria of ['nacionalidades', 'idiomas'] as const) {
    it(`administra ${categoria} en un modal con catálogo habilitado y un principal`, () => {
      const fixture = TestBed.createComponent(IngresosComponent);
      fixture.detectChanges();
      const pagina = fixture.componentInstance;
      const elemento: HTMLElement = fixture.nativeElement;
      const titulo = categoria === 'nacionalidades' ? 'Nacionalidades' : 'Idiomas de comunicación';
      elemento.querySelector<HTMLButtonElement>(`button[aria-label="Gestionar ${titulo}"]`)?.click();
      fixture.detectChanges();
      expect(pagina.catalogoVisible()).toBe(categoria);
      expect(elemento.querySelectorAll('p-dialog tbody tr').length).toBe(1);
      pagina.agregarCatalogo(categoria);
      expect(pagina.formulario.controls[categoria].length).toBe(2);
      expect(pagina.formulario.controls[categoria].at(1).enabled).toBeTrue();
      expect(pagina.formulario.controls[categoria].at(1).controls.principal.value).toBeFalse();
      const opciones = categoria === 'nacionalidades' ? pagina.catalogos.paises.opciones : pagina.opcionesIdiomas;
      pagina.formulario.controls[categoria].at(1).controls.id.setValue(opciones.find((opcion) => opcion.codigo === (categoria === 'nacionalidades' ? '32' : 'en'))!.id);
      pagina.marcarPrincipal(categoria, 1);
      expect(pagina.formulario.controls[categoria].at(0).controls.principal.value).toBeFalse();
      expect(pagina.resumenCatalogos()[categoria]).not.toBe('');
      pagina.quitarRegistro(categoria, 1);
      expect(pagina.formulario.controls[categoria].at(0).controls.principal.value).toBeTrue();
      pagina.quitarRegistro(categoria, 0);
      fixture.detectChanges();
      expect(elemento.textContent).toContain('No hay registros.');
      pagina.catalogoVisible.set(null);
      expect(pagina.resumenCatalogos()[categoria]).toBe('');
    });
  }

  it('inicia con nacionalidad chilena e idioma español principales y códigos interoperables', () => {
    const pagina = TestBed.createComponent(IngresosComponent).componentInstance;
    expect(pagina.formulario.controls.nacionalidades.getRawValue()).toEqual([{ id: pagina.catalogos.paises.opciones.find((opcion) => opcion.codigo === '152')!.id, principal: true }]);
    expect(pagina.formulario.controls.idiomas.getRawValue()).toEqual([{ id: pagina.opcionesIdiomas.find((opcion) => opcion.codigo === 'es')!.id, principal: true }]);
    expect(pagina.resumenCatalogos().nacionalidades).toBe('Chile');
    expect(pagina.resumenCatalogos().idiomas).toBe('español');
    expect(pagina.catalogos.paises.opciones.length).toBe(250);
    expect(pagina.opcionesIdiomas.length).toBe(57);
    for (const campo of ['sexoBiologico', 'identidadGenero', 'etnia', 'paisNacimiento', 'estadoCivil'] as const) {
      expect(pagina.formulario.controls[campo].enabled).toBeTrue();
      expect(pagina.formulario.controls[campo].value).toBe(1);
    }
  });

  it('solo captura sexo biológico e identidad de género como datos independientes y opcionales', () => {
    const fixture = TestBed.createComponent(IngresosComponent);
    const pagina = fixture.componentInstance;
    fixture.detectChanges();
    const elemento: HTMLElement = fixture.nativeElement;
    expect(elemento.querySelector('[formControlName="sexoBiologico"]')).not.toBeNull();
    expect(elemento.querySelector('[formControlName="identidadGenero"]')).not.toBeNull();
    expect(elemento.querySelector('[formControlName="sexoRegistral"]')).toBeNull();
    expect(elemento.querySelector('[formControlName="generoAdministrativo"]')).toBeNull();
    expect(Object.keys(pagina.formulario.getRawValue())).not.toContain('sexoRegistral');
    expect(Object.keys(pagina.formulario.getRawValue())).not.toContain('generoAdministrativo');
    expect(pagina.formulario.controls.sexoBiologico.valid).toBeTrue();
    expect(pagina.formulario.controls.identidadGenero.valid).toBeTrue();
    pagina.formulario.controls.sexoBiologico.setValue(2);
    expect(pagina.formulario.controls.identidadGenero.value).toBe(1);
  });

  it('reserva el ID interno 1 sin cambiar los códigos oficiales ni equiparar ausencia con desconocido', () => {
    const pagina = TestBed.createComponent(IngresosComponent).componentInstance;
    for (const catalogo of Object.values(pagina.catalogos)) {
      expect(catalogo.opciones[0]).toEqual({ id: 1, codigo: '', nombre: 'No informado' });
      expect(new Set(catalogo.opciones.map((opcion) => opcion.id)).size).toBe(catalogo.opciones.length);
    }
    expect(pagina.catalogos.etnia.opciones.find((opcion) => opcion.codigo === '1')?.nombre).toBe('Mapuche');
    expect(pagina.catalogos.etnia.opciones.find((opcion) => opcion.codigo === '1')?.id).not.toBe(1);
    pagina.formulario.controls.nacionalidades.at(0).controls.id.setValue(1);
    expect(pagina.resumenCatalogos().nacionalidades).toBe('No informado');
  });

  it('filtra y limpia el territorio al cambiar país, región o provincia', () => {
    const pagina = TestBed.createComponent(IngresosComponent).componentInstance;
    const direccion = pagina.formulario.controls.direcciones.at(0).controls;
    direccion.pais.setValue(pagina.catalogos.paises.opciones.find((opcion) => opcion.codigo === '152')!.id);
    pagina.cambiarTerritorio(0, 'pais');
    expect(direccion.region.enabled).toBeTrue();
    direccion.region.setValue(pagina.catalogos.regiones.opciones.find((opcion) => opcion.codigo === '1')!.id);
    pagina.cambiarTerritorio(0, 'region');
    expect(pagina.provinciasDisponibles(0).filter((opcion) => opcion.id !== 1).every((opcion) => opcion.regionCodigo === '1')).toBeTrue();
    direccion.provincia.setValue(pagina.catalogos.provincias.opciones.find((opcion) => opcion.codigo === '11')!.id);
    pagina.cambiarTerritorio(0, 'provincia');
    expect(pagina.comunasDisponibles(0).some((opcion) => opcion.codigo === '1101')).toBeTrue();
    direccion.comuna.setValue(pagina.catalogos.comunas.opciones.find((opcion) => opcion.codigo === '1101')!.id);
    direccion.pais.setValue(1);
    pagina.cambiarTerritorio(0, 'pais');
    expect(direccion.region.disabled).toBeTrue();
    expect(direccion.provincia.value).toBe(1);
    expect(direccion.comuna.value).toBe(1);
  });

  for (const categoria of ['identificaciones', 'telefonos', 'correos', 'direcciones'] as const) {
    it(`mantiene un principal en ${categoria} al agregar, elegir y quitar registros`, () => {
      const pagina = TestBed.createComponent(IngresosComponent).componentInstance;
      if (categoria === 'identificaciones') { pagina.agregarIdentificacion(); }
      else if (categoria === 'direcciones') { pagina.agregarDireccion(); }
      else { pagina.agregarContacto(categoria); }
      const registros = pagina.formulario.controls[categoria];
      expect(registros.length).toBe(2);
      expect(registros.at(1).controls.principal.value).toBeFalse();
      pagina.marcarPrincipal(categoria, 1);
      expect(registros.at(0).controls.principal.value).toBeFalse();
      expect(registros.at(1).controls.principal.value).toBeTrue();
      pagina.quitarRegistro(categoria, 1);
      expect(registros.at(0).controls.principal.value).toBeTrue();
      pagina.quitarRegistro(categoria, 0);
      expect(registros.length).toBe(0);
      if (categoria === 'identificaciones') { pagina.agregarIdentificacion(); }
      else if (categoria === 'direcciones') { pagina.agregarDireccion(); }
      else { pagina.agregarContacto(categoria); }
      expect(registros.at(0).controls.principal.value).toBeTrue();
    });
  }

  it('muestra dos pestañas con datos de Persona y Paciente y mantiene el guardado deshabilitado', () => {
    const fixture = TestBed.createComponent(IngresosComponent);
    fixture.detectChanges();
    const elemento: HTMLElement = fixture.nativeElement;
    for (const titulo of ['1. Datos Personales', '2. Ficha Clínica']) {
      expect(elemento.textContent).toContain(titulo);
    }
    expect(elemento.querySelectorAll('p-fieldset[legend="Paciente"]').length).toBe(0);
    expect(elemento.querySelectorAll('p-tab').length).toBe(2);
    expect(elemento.querySelector<HTMLInputElement>('#numeroFicha')?.readOnly).toBeTrue();
    expect(fixture.componentInstance.formulario.controls.centroSalud.disabled).toBeTrue();
    expect(fixture.componentInstance.formulario.controls.sector.disabled).toBeTrue();
    expect(fixture.componentInstance.formulario.controls.centroSalud.value).toBeNull();
    expect(fixture.componentInstance.formulario.controls.sector.value).toBeNull();
    const secciones = Array.from(elemento.querySelectorAll('p-tabpanel[value="personales"] p-fieldset'))
      .map((seccion) => seccion.getAttribute('legend'));
    expect(secciones).toEqual(['1. Identificación', '2. Datos demográficos', '3. Contactibilidad']);
    const camposIdentidad = Array.from(elemento.querySelectorAll('.fila-identidad > .campo input'))
      .map((entrada) => entrada.id);
    expect(camposIdentidad).toEqual(['identificacionPrincipal', 'nombres', 'apellidos', 'nombreSocial']);
    const toolbar = elemento.querySelector('p-toolbar');
    const botonesInicio = Array.from(toolbar?.querySelectorAll('.p-toolbar-start button') ?? []);
    expect(botonesInicio.map((boton) => boton.textContent?.trim())).toEqual(['Guardar', 'Modificar']);
    for (const boton of botonesInicio) { expect((boton as HTMLButtonElement).disabled).toBeTrue(); }
    expect(toolbar?.querySelector('.p-toolbar-end button')?.textContent?.trim()).toBe('Cancelar');
    expect(toolbar?.querySelector('p-button[routerLink="/admision"]')).not.toBeNull();
    expect(elemento.textContent).toContain('no ingresar datos reales');
  });

  it('valida RUT y formato de los medios de contacto', () => {
    const pagina = TestBed.createComponent(IngresosComponent).componentInstance;
    const documento = pagina.formulario.controls.identificaciones.at(0);
    documento.setValue({ tipo: 'RUT/RUN chileno', valor: '6.000.000-6', principal: true });
    expect(documento.hasError('rutInvalido')).toBeTrue();
    documento.controls.valor.setValue('6.000.000-K');
    expect(documento.valid).toBeTrue();
    const telefono = pagina.formulario.controls.telefonos.at(0).controls.valor;
    telefono.setValue('texto');
    expect(telefono.invalid).toBeTrue();
    const correo = pagina.formulario.controls.correos.at(0).controls.valor;
    correo.setValue('correo-sin-dominio');
    expect(correo.invalid).toBeTrue();
  });

  it('abre el modal desde el campo compacto y refleja el principal seleccionado', () => {
    const fixture = TestBed.createComponent(IngresosComponent);
    const pagina = fixture.componentInstance;
    fixture.detectChanges();
    const elemento: HTMLElement = fixture.nativeElement;
    elemento.querySelector<HTMLButtonElement>('button[aria-label="Gestionar identificaciones"]')?.click();
    fixture.detectChanges();
    expect(pagina.identificacionesVisibles()).toBeTrue();
    const encabezados = Array.from(elemento.querySelectorAll('p-dialog th')).map((celda) => celda.textContent?.trim());
    expect(encabezados).toEqual(['Principal', 'Tipo de documento', 'Número / valor', 'Acciones']);
    expect(elemento.querySelectorAll('p-dialog tbody tr').length).toBe(1);
    pagina.formulario.controls.identificaciones.at(0).patchValue({ tipo: 'Pasaporte', valor: 'SINTETICO-A' });
    pagina.agregarIdentificacion();
    pagina.formulario.controls.identificaciones.at(1).patchValue({ tipo: 'Pasaporte', valor: 'SINTETICO-B' });
    pagina.marcarPrincipal('identificaciones', 1);
    fixture.detectChanges();
    expect(elemento.querySelector<HTMLInputElement>('#identificacionPrincipal')?.value).toBe('SINTETICO-B');
    pagina.quitarRegistro('identificaciones', 1);
    expect(pagina.identificacionPrincipal()).toBe('SINTETICO-A');
    pagina.quitarRegistro('identificaciones', 0);
    expect(pagina.identificacionPrincipal()).toBe('');
    pagina.identificacionesVisibles.set(false);
    fixture.detectChanges();
    expect(pagina.identificacionesVisibles()).toBeFalse();
  });

  it('registra el RUT con Enter como principal sin duplicarlo ni borrar otros documentos', () => {
    const fixture = TestBed.createComponent(IngresosComponent);
    const pagina = fixture.componentInstance;
    pagina.formulario.controls.identificaciones.at(0).patchValue({ tipo: 'Pasaporte', valor: 'SINTETICO' });
    fixture.detectChanges();
    const elemento: HTMLElement = fixture.nativeElement;
    const entrada = elemento.querySelector<HTMLInputElement>('#identificacionPrincipal')!;
    entrada.value = '6.000.000-K';
    entrada.dispatchEvent(new Event('input'));
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    entrada.dispatchEvent(enter);
    fixture.detectChanges();
    expect(enter.defaultPrevented).toBeTrue();
    expect(pagina.formulario.controls.identificaciones.length).toBe(2);
    expect(pagina.formulario.controls.identificaciones.at(0).controls.valor.value).toBe('SINTETICO');
    expect(pagina.formulario.controls.identificaciones.at(1).controls.principal.value).toBeTrue();
    pagina.rutIngresado.set('6000000k');
    pagina.registrarRut(new Event('keydown'));
    expect(pagina.formulario.controls.identificaciones.length).toBe(2);
    pagina.rutIngresado.set('6.000.000-6');
    pagina.registrarRut(new Event('keydown'));
    expect(pagina.errorRut()).toContain('inválido');
    expect(pagina.identificacionPrincipal()).toBe('6000000-K');
    expect(pagina.formulario.controls.identificaciones.length).toBe(2);
  });
});
