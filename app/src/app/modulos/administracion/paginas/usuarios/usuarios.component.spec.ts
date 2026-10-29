import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ServicioAuth } from '../../../auth/servicio-auth';
import { UsuariosComponent } from './usuarios.component';

describe('Formularios modales de usuarios', () => {
  const rol = { id: 2, codigo: 'administrador', nombre: 'Administrador' };
  const usuario = { id: 8, nombreUsuario: 'cuenta.sintetica', activo: true, rol };
  let pagina: UsuariosComponent;
  let http: HttpTestingController;
  let expirar: jasmine.Spy;

  beforeEach(() => {
    expirar = jasmine.createSpy('expirar');
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: ServicioAuth, useValue: { usuario: () => usuario, expirar } },
    ] });
    pagina = TestBed.runInInjectionContext(() => new UsuariosComponent());
    http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/auth/usuarios').flush([usuario]);
    http.expectOne('/api/auth/roles').flush([rol]);
  });
  afterEach(() => http.verify());

  it('abre alta solo desde Nuevo y cierra después de guardar', () => {
    expect(pagina.modalVisible()).toBeFalse();
    pagina.nuevo();
    expect(pagina.modalVisible()).toBeTrue();
    pagina.formulario.patchValue({ nombreUsuario: 'nueva.sintetica', clave: 'ClaveSintetica123', rolId: 2 });
    pagina.guardarUsuario();
    const peticion = http.expectOne('/api/auth/usuarios');
    expect(peticion.request.method).toBe('POST');
    peticion.flush({ ...usuario, id: 9 });
    http.expectOne('/api/auth/usuarios').flush([]);
    http.expectOne('/api/auth/roles').flush([rol]);
    expect(pagina.modalVisible()).toBeFalse();
    expect(pagina.formulario.controls.clave.value).toBe('');
  });

  it('mantiene error en el modal y no lo cierra al fallar', () => {
    pagina.editar(usuario);
    pagina.guardarUsuario();
    http.expectOne('/api/auth/usuarios/8').flush({ message: 'No se pudo modificar la cuenta.' }, { status: 409, statusText: 'Conflict' });
    expect(pagina.errorModal()).toBe('No se pudo modificar la cuenta.');
    expect(pagina.modalVisible()).toBeTrue();
    expect(pagina.aviso()).toBe('');
  });

  it('conserva usuario inmutable y expira la sesión al modificar la cuenta propia', () => {
    pagina.editar(usuario);
    expect(pagina.formulario.controls.nombreUsuario.disabled).toBeTrue();
    pagina.guardarUsuario();
    const peticion = http.expectOne('/api/auth/usuarios/8');
    expect(peticion.request.body).toEqual({ rolId: 2, activo: true });
    peticion.flush(usuario);
    expect(expirar).toHaveBeenCalled();
    expect(pagina.modalVisible()).toBeFalse();
  });
});
