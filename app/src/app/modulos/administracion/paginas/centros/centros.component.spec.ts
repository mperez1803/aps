import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { CentrosComponent } from './centros.component';
import { CentroSalud } from '../../../../compartido/centros-salud/servicio-centros';

describe('Mantenedor de Centros de Salud', () => {
  const centro: CentroSalud = {
    id: 1, codigo: 'SINTETICO', nombre: 'Centro sintético', codigoDeis: null, comunaCodigo: '1101',
    direccion: 'Vía ficticia 123', telefonos: [{ valor: '+56000000001', uso: '', principal: true }], correos: [{ valor: 'centro@example.invalid', uso: '', principal: true }],
    activo: true, utilizaSectores: true, sectores: [],
  };
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
    });
  });
  afterEach(() => { TestBed.inject(HttpTestingController).verify(); });

  it('carga centros y permite crear con contactos múltiples y DEIS opcional', () => {
    const pagina = TestBed.runInInjectionContext(() => new CentrosComponent());
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/centros-salud').flush([]);
    pagina.editar();
    pagina.formulario.patchValue({ codigo: centro.codigo, nombre: centro.nombre, comunaCodigo: centro.comunaCodigo, direccion: centro.direccion });
    pagina.agregarContacto('telefonos');
    pagina.formulario.controls.telefonos.at(0).controls.valor.setValue('+56000000001');
    pagina.agregarContacto('telefonos');
    pagina.formulario.controls.telefonos.at(1).controls.valor.setValue('+56000000002');
    pagina.guardar();
    const post = http.expectOne('/api/centros-salud');
    expect(post.request.method).toBe('POST');
    expect(post.request.body.codigoDeis).toBeNull();
    expect(post.request.body.telefonos.length).toBe(2);
    post.flush(centro);
    http.expectOne('/api/centros-salud').flush([centro]);
    expect(pagina.editorVisible()).toBeFalse();
    expect(pagina.centros()[0].id).toBe(1);
  });

  it('crea sectores locales y los guarda en la misma petición del centro', () => {
    const pagina = TestBed.runInInjectionContext(() => new CentrosComponent());
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/centros-salud').flush([centro]);
    pagina.editar(centro);
    pagina.sectorVisible.set(true);
    pagina.agregarSector();
    pagina.formulario.controls.sectores.at(0).patchValue({ color: '#123456', nombre: 'Sector sintético' });
    pagina.sectorVisible.set(false);
    http.expectNone('/api/centros-salud/1/sectores');
    pagina.guardar();
    const patch = http.expectOne('/api/centros-salud/1');
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body.sectores).toEqual([{ nombre: 'Sector sintético', color: '#123456', activo: true }]);
    patch.flush(centro);
    http.expectOne('/api/centros-salud').flush([centro]);
  });

  it('informa errores sin cerrar el editor ni afirmar éxito', () => {
    const pagina = TestBed.runInInjectionContext(() => new CentrosComponent());
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/centros-salud').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(pagina.error()).not.toBe('');
    pagina.editar(centro);
    pagina.guardar();
    http.expectOne('/api/centros-salud/1').flush({ message: 'El código ya existe.' }, { status: 409, statusText: 'Conflict' });
    expect(pagina.errorEditor()).toBe('El código ya existe.');
    expect(pagina.editorVisible()).toBeTrue();
    expect(pagina.aviso()).toBe('');
  });

  it('mantiene un principal, actualiza el resumen y reasigna al quitarlo', () => {
    const pagina = TestBed.runInInjectionContext(() => new CentrosComponent());
    TestBed.inject(HttpTestingController).expectOne('/api/centros-salud').flush([centro]);
    pagina.editar(centro);
    pagina.agregarContacto('telefonos');
    pagina.formulario.controls.telefonos.at(1).controls.valor.setValue('+56000000002');
    pagina.marcarPrincipal('telefonos', 1);
    expect(pagina.resumenContacto().telefonos).toBe('+56000000002');
    expect(pagina.formulario.controls.telefonos.getRawValue().filter((contacto) => contacto.principal).length).toBe(1);
    pagina.formulario.controls.telefonos.at(1).controls.principal.setValue(false);
    pagina.marcarPrincipal('telefonos', 1);
    expect(pagina.formulario.controls.telefonos.at(1).controls.principal.value).toBeTrue();
    pagina.quitarContacto('telefonos', 1);
    expect(pagina.resumenContacto().telefonos).toBe('+56000000001');
    pagina.quitarContacto('telefonos', 0);
    expect(pagina.resumenContacto().telefonos).toBe('');
    pagina.agregarContacto('telefonos');
    expect(pagina.formulario.controls.telefonos.at(0).controls.principal.value).toBeTrue();
    expect(pagina.formulario.invalid).toBeTrue();
  });

  it('cancelar descarta contactos locales sin guardar ni modificar el catálogo', () => {
    const pagina = TestBed.runInInjectionContext(() => new CentrosComponent());
    TestBed.inject(HttpTestingController).expectOne('/api/centros-salud').flush([centro]);
    pagina.editar(centro);
    pagina.contactoVisible.set('telefonos');
    pagina.quitarContacto('telefonos', 0);
    pagina.cerrarEditor();
    expect(pagina.editorVisible()).toBeFalse();
    expect(pagina.contactoVisible()).toBeNull();
    pagina.editar(centro);
    expect(pagina.resumenContacto().telefonos).toBe('+56000000001');
    expect(centro.telefonos.length).toBe(1);
  });

  it('conserva sectores y sus ID al editar y muestra errores sin perder el borrador', () => {
    const pagina = TestBed.runInInjectionContext(() => new CentrosComponent());
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/centros-salud').flush([centro]);
    pagina.editar({ ...centro, sectores: [{ id: 8, centroId: 1, nombre: 'Sector sintético', color: '#AB1234', activo: true }] });
    expect(pagina.formulario.controls.sectores.at(0).controls.color.value).toBe('#AB1234');
    pagina.guardar();
    const patch = http.expectOne('/api/centros-salud/1');
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body.sectores).toEqual([{ id: 8, nombre: 'Sector sintético', color: '#AB1234', activo: true }]);
    patch.flush({ message: 'El sector no pertenece al centro.' }, { status: 404, statusText: 'Not Found' });
    expect(pagina.errorEditor()).toBe('El sector no pertenece al centro.');
    expect(pagina.editorVisible()).toBeTrue();
    expect(pagina.formulario.controls.sectores.length).toBe(1);
    expect(pagina.aviso()).toBe('');
  });

  it('permite preparar sectores antes de crear un centro y cancelar no persiste filas', () => {
    const pagina = TestBed.runInInjectionContext(() => new CentrosComponent());
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/centros-salud').flush([]);
    pagina.editar();
    pagina.formulario.controls.utilizaSectores.setValue(true);
    expect(pagina.utilizaSectores()).toBeTrue();
    pagina.agregarSector();
    expect(pagina.cantidadSectores()).toBe(1);
    expect(pagina.formulario.invalid).toBeTrue();
    pagina.formulario.controls.sectores.at(0).patchValue({ nombre: 'Sector sin guardar', color: '#123456' });
    pagina.cerrarEditor();
    expect(pagina.sectorVisible()).toBeFalse();
    pagina.editar();
    expect(pagina.cantidadSectores()).toBe(0);
    http.expectNone((peticion) => peticion.method !== 'GET');
  });

  it('desactiva sectores existentes sin borrarlos y quita solo filas nuevas', () => {
    const pagina = TestBed.runInInjectionContext(() => new CentrosComponent());
    TestBed.inject(HttpTestingController).expectOne('/api/centros-salud').flush([centro]);
    pagina.editar({ ...centro, sectores: [{ id: 8, centroId: 1, nombre: 'Sector', color: '#123456', activo: true }] });
    pagina.agregarSector();
    pagina.quitarSector(1);
    expect(pagina.cantidadSectores()).toBe(1);
    pagina.quitarSector(0);
    expect(pagina.cantidadSectores()).toBe(1);
    expect(pagina.formulario.controls.sectores.at(0).controls.activo.value).toBeFalse();
    expect(pagina.formulario.controls.sectores.at(0).controls.id.value).toBe(8);
  });

  it('no descarta sectores nuevos silenciosamente al apagar utiliza sectores', () => {
    const pagina = TestBed.runInInjectionContext(() => new CentrosComponent());
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/centros-salud').flush([centro]);
    pagina.editar(centro);
    pagina.agregarSector();
    pagina.formulario.controls.sectores.at(0).patchValue({ nombre: 'Nuevo', color: '#123456' });
    pagina.formulario.controls.utilizaSectores.setValue(false);
    pagina.guardar();
    expect(pagina.errorEditor()).toContain('sectores nuevos');
    expect(pagina.formulario.controls.sectores.length).toBe(1);
    http.expectNone((peticion) => peticion.method !== 'GET');
  });

  it('acepta el hexadecimal con # emitido por ColorPicker y lo envía sin duplicar el prefijo', () => {
    const pagina = TestBed.runInInjectionContext(() => new CentrosComponent());
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/centros-salud').flush([centro]);
    pagina.editar(centro);
    pagina.agregarSector();
    const sector = pagina.formulario.controls.sectores.at(0);
    sector.controls.nombre.setValue('Sector violeta');
    expect(sector.controls.color.invalid).toBeTrue();
    sector.controls.color.setValue('#6543ab');
    expect(sector.controls.color.valid).toBeTrue();
    pagina.guardar();
    const peticion = http.expectOne('/api/centros-salud/1');
    expect(peticion.request.body.sectores[0].color).toBe('#6543ab');
    peticion.flush(centro);
    http.expectOne('/api/centros-salud').flush([centro]);
  });
});
