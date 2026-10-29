import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RolesComponent } from './roles.component';

describe('Mantenedor de Roles', () => {
  let pagina: RolesComponent;
  let http: HttpTestingController;
  const rol = { id: 2, nombre: 'Administrador', codigo: 'administrador' };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    pagina = TestBed.runInInjectionContext(() => new RolesComponent());
    http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/auth/roles').flush([rol]);
  });
  afterEach(() => http.verify());

  it('abre el modal y edita solo el nombre del rol', () => {
    expect(pagina.modalVisible()).toBeFalse();
    pagina.editar(rol);
    expect(pagina.modalVisible()).toBeTrue();
    pagina.formulario.controls.nombre.setValue('Nombre actualizado');
    pagina.guardar();
    const peticion = http.expectOne('/api/auth/roles/2');
    expect(peticion.request.method).toBe('PATCH');
    expect(peticion.request.body).toEqual({ nombre: 'Nombre actualizado' });
    peticion.flush({ ...rol, nombre: 'Nombre actualizado' });
    http.expectOne('/api/auth/roles').flush([]);
    expect(pagina.modalVisible()).toBeFalse();
  });
  it('muestra errores dentro del modal y no lo cierra', () => {
    pagina.editar(rol);
    pagina.guardar();
    http.expectOne('/api/auth/roles/2').flush({ message: 'El rol no existe.' }, { status: 404, statusText: 'Not Found' });
    expect(pagina.modalVisible()).toBeTrue();
    expect(pagina.errorModal()).toBe('El rol no existe.');
    expect(pagina.guardando()).toBeFalse();
  });
  it('rechaza nombres vacíos o solo espacios antes de enviar', () => {
    pagina.editar(rol);
    pagina.formulario.controls.nombre.setValue(' ');
    pagina.guardar();
    http.expectNone('/api/auth/roles/2');
    expect(pagina.formulario.invalid).toBeTrue();
  });
});
