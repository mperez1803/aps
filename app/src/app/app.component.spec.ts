import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { ServicioAuth, Usuario } from './modulos/auth/servicio-auth';

describe('Navegación de la plataforma', () => {
  let usuario: Usuario | null;
  beforeEach(async () => {
    usuario = null;
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter(routes), provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations(),
        {
          provide: ServicioAuth,
          useValue: {
            usuario: () => usuario,
            restaurarSesion: () => Promise.resolve(!!usuario),
            errorRestauracion: '',
            esAdministrador: () => ['super', 'administrador'].includes(usuario?.rol.codigo ?? ''),
            iniciarSesion: () => of({}),
          },
        },
      ],
    }).compileComponents();
  });

  it('crea el contenedor general', () => {
    expect(TestBed.createComponent(AppComponent).componentInstance).toBeTruthy();
  });

  for (const ruta of ['/', '/admision', '/admision/ingresos', '/administracion', '/administracion/roles', '/administracion/usuarios', '/administracion/centros-salud', '/ruta-inexistente']) {
    it(`exige login al acceder sin sesión a ${ruta}`, async () => {
      const harness = await RouterTestingHarness.create(ruta);
      expect(TestBed.inject(Router).url).toBe('/login');
      expect(harness.routeNativeElement?.querySelector('h2')?.textContent).toContain('Iniciar sesión');
    });
  }

  it('muestra Administración a cualquier usuario conectado', async () => {
    usuario = { id: 1, nombreUsuario: 'prueba', activo: true, rol: { id: 2, codigo: 'operador', nombre: 'Operador' } };
    const harness = await RouterTestingHarness.create('/administracion');
    expect(TestBed.inject(Router).url).toBe('/administracion');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Administración');
    expect(harness.routeNativeElement?.querySelector('a[href="/administracion"]')).not.toBeNull();
  });

  it('permite abrir Ingresos con sesión y conserva el acceso al dashboard', async () => {
    usuario = { id: 1, nombreUsuario: 'prueba', activo: true, rol: { id: 2, codigo: 'operador', nombre: 'Operador' } };
    const harness = await RouterTestingHarness.create('/admision/ingresos');
    expect(TestBed.inject(Router).url).toBe('/admision/ingresos');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Registro unificado');
    expect(harness.routeNativeElement?.querySelector('a[href="/admision"]')).not.toBeNull();
  });

  for (const mantenedor of ['roles', 'usuarios', 'centros-salud']) {
    it(`permite entrar a ${mantenedor} con sesión sin exigir rol administrador`, async () => {
      usuario = { id: 1, nombreUsuario: 'prueba', activo: true, rol: { id: 2, codigo: 'operador', nombre: 'Operador' } };
      await RouterTestingHarness.create(`/administracion/${mantenedor}`);
      expect(TestBed.inject(Router).url).toBe(`/administracion/${mantenedor}`);
    });

    it(`abre ${mantenedor} como pantalla independiente para el administrador`, async () => {
      usuario = { id: 1, nombreUsuario: 'prueba', activo: true, rol: { id: 1, codigo: 'administrador', nombre: 'Administrador' } };
      const harness = await RouterTestingHarness.create(`/administracion/${mantenedor}`);
      expect(TestBed.inject(Router).url).toBe(`/administracion/${mantenedor}`);
      expect(harness.routeNativeElement?.querySelector('h1')?.textContent?.toLowerCase()).toBe(mantenedor === 'centros-salud' ? 'centros de salud' : mantenedor);
      expect(harness.routeNativeElement?.querySelector('a[href="/administracion/roles"]')).not.toBeNull();
      expect(harness.routeNativeElement?.querySelector('a[href="/administracion/usuarios"]')).not.toBeNull();
    });
  }

  it('muestra ambos mantenedores a la cuenta Super', async () => {
    usuario = { id: 1, nombreUsuario: 'prueba_super', activo: true, rol: { id: 1, codigo: 'super', nombre: 'Super' } };
    const harness = await RouterTestingHarness.create('/administracion');
    expect(TestBed.inject(Router).url).toBe('/administracion');
    expect(harness.routeNativeElement?.querySelector('a[href="/administracion/roles"]')).not.toBeNull();
    expect(harness.routeNativeElement?.querySelector('a[href="/administracion/usuarios"]')).not.toBeNull();
  });
});
