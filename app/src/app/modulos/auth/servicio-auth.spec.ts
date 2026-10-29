import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ServicioAuth, Usuario } from './servicio-auth';
import { interceptorAuth } from './interceptor-auth';

describe('Sesión con cookie y SignalStore', () => {
  const usuario: Usuario = { id: 1, nombreUsuario: 'sintetico', activo: true, rol: { id: 1, nombre: 'Super', codigo: 'super' } };
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([interceptorAuth])), provideHttpClientTesting()],
    });
  });
  afterEach(() => { TestBed.inject(HttpTestingController).verify(); });

  it('restaura usuario desde la API antes de autorizar rutas, sin token en JavaScript', async () => {
    const auth = TestBed.inject(ServicioAuth);
    const restauracion = auth.restaurarSesion();
    const peticion = TestBed.inject(HttpTestingController).expectOne('/api/auth/yo');
    expect(peticion.request.headers.has('Authorization')).toBeFalse();
    peticion.flush({ usuario, expiraEnSegundos: 120 });
    expect(await restauracion).toBeTrue();
    expect(auth.usuario()).toEqual(usuario);
    auth.expirar();
  });
  it('trata 401 como sesión ausente sin ocultar fallos de conexión', async () => {
    const auth = TestBed.inject(ServicioAuth);
    const restauracion = auth.restaurarSesion();
    TestBed.inject(HttpTestingController).expectOne('/api/auth/yo').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(await restauracion).toBeFalse();
    expect(auth.errorRestauracion).toBe('');
    const reintento = auth.restaurarSesion();
    TestBed.inject(HttpTestingController).expectOne('/api/auth/yo').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(await reintento).toBeFalse();
    expect(auth.errorRestauracion).not.toBe('');
  });
  it('envía cabecera CSRF en login y restaura el estado sin almacenar credenciales', () => {
    const auth = TestBed.inject(ServicioAuth);
    auth.iniciarSesion('sintetico', 'sintetica').subscribe();
    const peticion = TestBed.inject(HttpTestingController).expectOne('/api/auth/login');
    expect(peticion.request.headers.get('X-Kumara-CSRF')).toBe('1');
    expect(peticion.request.headers.has('Authorization')).toBeFalse();
    peticion.flush({ usuario, expiraEnSegundos: 120 });
    expect(auth.usuario()).toEqual(usuario);
    auth.expirar();
  });
});
