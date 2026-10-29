import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { generarHash } from '../src/modulos/auth/aplicacion/claves.js';
import { ServicioAuth } from '../src/modulos/auth/aplicacion/servicio-auth.js';
import {
  RepositorioAuth,
  type CredencialesUsuario,
} from '../src/modulos/auth/dominio/repositorio-auth.js';
import { ControladorAuth } from '../src/modulos/auth/infraestructura/controlador-auth.js';
import { GuardiaAuth } from '../src/modulos/auth/infraestructura/guardia-auth.js';
import { nombreCookieSesion } from '../src/modulos/auth/infraestructura/cookie-sesion.js';

describe('Autenticación y autorización HTTP', () => {
  let app: INestApplication;
  let usuario: CredencialesUsuario;
  let jwt: JwtService;
  const repositorio = {
    buscarCredenciales: vi.fn(),
    buscarUsuario: vi.fn(),
    listarUsuarios: vi.fn(),
    listarRoles: vi.fn(),
    crearUsuario: vi.fn(),
    inicializarRoles: vi.fn(),
    actualizarRol: vi.fn(),
    actualizarUsuario: vi.fn(),
    invalidarSesion: vi.fn(),
  };
  beforeEach(async () => {
    vi.clearAllMocks();
    usuario = {
      id: 1,
      nombreUsuario: 'usuario_sintetico',
      claveHash: await generarHash('clave-sintetica-para-pruebas'),
      activo: true,
      versionSesion: 0,
      rol: {
        id: 1,
        codigo: 'administrador',
        nombre: 'Administrador',
      },
    };
    repositorio.buscarCredenciales.mockImplementation((nombre: string) =>
      Promise.resolve(nombre === usuario.nombreUsuario ? usuario : null),
    );
    repositorio.buscarUsuario.mockImplementation(() => {
      const { claveHash: _clave, ...perfil } = usuario;
      return Promise.resolve(perfil);
    });
    repositorio.listarUsuarios.mockResolvedValue([]);
    repositorio.listarRoles.mockResolvedValue([]);
    repositorio.invalidarSesion.mockImplementation(() => {
      usuario.versionSesion++;
      return Promise.resolve();
    });
    const modulo = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'clave-sintetica-solo-para-pruebas-http',
          signOptions: { expiresIn: '30m' },
        }),
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }]),
      ],
      controllers: [ControladorAuth],
      providers: [
        ServicioAuth,
        { provide: RepositorioAuth, useValue: repositorio },
        { provide: APP_GUARD, useClass: GuardiaAuth },
      ],
    }).compile();
    app = modulo.createNestApplication();
    await app.init();
    jwt = modulo.get(JwtService);
  });
  afterEach(async () => {
    await app.close();
  });

  async function login() {
    const respuesta = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Kumara-CSRF', '1')
      .send({
        nombreUsuario: usuario.nombreUsuario,
        clave: 'clave-sintetica-para-pruebas',
      })
      .expect(200);
    expect(respuesta.body).not.toHaveProperty('token');
    const cookies = respuesta.headers['set-cookie'] as string[] | undefined;
    const cookie = cookies?.find((valor) =>
      valor.startsWith(`${nombreCookieSesion()}=`),
    );
    if (!cookie) {
      throw new Error('El login no devolvió la cookie de sesión.');
    }
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Max-Age=1800');
    return cookie.split(';')[0].slice(nombreCookieSesion().length + 1);
  }

  it('rechaza acceso anónimo a la administración', async () => {
    await request(app.getHttpServer()).get('/auth/usuarios').expect(401);
    expect(repositorio.listarUsuarios).not.toHaveBeenCalled();
  });
  it('restaura la sesión con cookie sin exponer el token y bloquea mutaciones sin CSRF', async () => {
    const token = await login();
    const cookie = `${nombreCookieSesion()}=${token}`;
    const respuesta = await request(app.getHttpServer())
      .get('/auth/yo')
      .set('Cookie', cookie)
      .expect(200);
    expect(respuesta.headers['cache-control']).toBe('no-store');
    expect(respuesta.body.usuario.id).toBe(usuario.id);
    expect(respuesta.body.expiraEnSegundos).toBeGreaterThan(0);
    expect(respuesta.body.expiraEnSegundos).toBeLessThanOrEqual(1800);
    expect(respuesta.body).not.toHaveProperty('token');
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', cookie)
      .expect(403);
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', cookie)
      .set('X-Kumara-CSRF', 'invalido')
      .expect(403);
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', cookie)
      .set('X-Kumara-CSRF', '1')
      .set('Sec-Fetch-Site', 'cross-site')
      .expect(403);
    const salida = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', cookie)
      .set('X-Kumara-CSRF', '1')
      .expect(204);
    expect(salida.headers['set-cookie'][0]).toContain(
      `${nombreCookieSesion()}=;`,
    );
    await request(app.getHttpServer())
      .get('/auth/yo')
      .set('Cookie', cookie)
      .expect(401);
  });
  it('protege el login contra CSRF incluso antes de crear una sesión', async () => {
    await request(app.getHttpServer()).post('/auth/login').send({}).expect(403);
    await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Kumara-CSRF', '1')
      .set('Sec-Fetch-Site', 'cross-site')
      .send({})
      .expect(403);
  });
  it('rechaza cookies expiradas, manipuladas y de cuentas inactivas', async () => {
    const expirado = await jwt.signAsync(
      { sub: usuario.id, version: 0 },
      { expiresIn: -1 },
    );
    await request(app.getHttpServer())
      .get('/auth/yo')
      .set('Cookie', `${nombreCookieSesion()}=${expirado}`)
      .expect(401);
    await request(app.getHttpServer())
      .get('/auth/yo')
      .set('Cookie', `${nombreCookieSesion()}=token-invalido`)
      .expect(401);
    const token = await login();
    usuario.activo = false;
    await request(app.getHttpServer())
      .get('/auth/yo')
      .set('Cookie', `${nombreCookieSesion()}=${token}`)
      .expect(401);
  });
  it('emite cookie __Host Secure en producción sin Domain y con Path raíz', async () => {
    const anterior = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      const respuesta = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Kumara-CSRF', '1')
        .send({
          nombreUsuario: usuario.nombreUsuario,
          clave: 'clave-sintetica-para-pruebas',
        })
        .expect(200);
      const cookie: string = respuesta.headers['set-cookie'][0];
      expect(cookie).toMatch(/^__Host-kumara-sesion=/);
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Path=/');
      expect(cookie).not.toContain('Domain=');
      expect(respuesta.body).not.toHaveProperty('token');
    } finally {
      process.env.NODE_ENV = anterior;
    }
  });
  it('inicia sesión, entrega un JWT válido y no expone el hash', async () => {
    const token = await login();
    expect((await jwt.verifyAsync<{ sub: number }>(token)).sub).toBe(
      usuario.id,
    );
    const respuesta = await request(app.getHttpServer())
      .get('/auth/yo')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(respuesta.body.usuario).not.toHaveProperty('claveHash');
    await request(app.getHttpServer())
      .get('/auth/usuarios')
      .auth(token, { type: 'bearer' })
      .expect(200);
  });
  it('rechaza por igual usuario inexistente, contraseña errónea y cuenta inactiva', async () => {
    for (const datos of [
      { nombreUsuario: 'inexistente', clave: 'clave-sintetica-para-pruebas' },
      { nombreUsuario: usuario.nombreUsuario, clave: 'clave-incorrecta' },
    ]) {
      const respuesta = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Kumara-CSRF', '1')
        .send(datos)
        .expect(401);
      expect(respuesta.body.message).toBe('Usuario o contraseña incorrectos.');
    }
    usuario.activo = false;
    await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Kumara-CSRF', '1')
      .send({
        nombreUsuario: usuario.nombreUsuario,
        clave: 'clave-sintetica-para-pruebas',
      })
      .expect(401);
  });
  it('bloquea un sexto intento de login en un minuto', async () => {
    for (let intento = 0; intento < 5; intento++) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Kumara-CSRF', '1')
        .send({ nombreUsuario: 'nadie', clave: 'incorrecta' })
        .expect(401);
    }
    await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Kumara-CSRF', '1')
      .send({ nombreUsuario: 'nadie', clave: 'incorrecta' })
      .expect(429);
  });
  it('rechaza JWT manipulado o expirado', async () => {
    await request(app.getHttpServer())
      .get('/auth/yo')
      .auth('manipulado', { type: 'bearer' })
      .expect(401);
    const expirado = await jwt.signAsync(
      { sub: usuario.id, version: 0 },
      { expiresIn: -1 },
    );
    await request(app.getHttpServer())
      .get('/auth/yo')
      .auth(expirado, { type: 'bearer' })
      .expect(401);
  });
  it('permite acceder con JWT válido sin exigir un rol específico', async () => {
    const token = await login();
    usuario.rol.codigo = 'operador';
    await request(app.getHttpServer())
      .get('/auth/usuarios')
      .auth(token, { type: 'bearer' })
      .expect(200);
    await request(app.getHttpServer())
      .patch('/auth/roles/2')
      .auth(token, { type: 'bearer' })
      .send({ nombre: 'Otro' })
      .expect(200);
  });
  it('invalida un JWT al cerrar sesión o desactivar al usuario', async () => {
    const token = await login();
    await request(app.getHttpServer())
      .post('/auth/logout')
      .auth(token, { type: 'bearer' })
      .expect(204);
    await request(app.getHttpServer())
      .get('/auth/yo')
      .auth(token, { type: 'bearer' })
      .expect(401);
    const nuevoToken = await login();
    usuario.activo = false;
    await request(app.getHttpServer())
      .get('/auth/yo')
      .auth(nuevoToken, { type: 'bearer' })
      .expect(401);
  });
  it('valida contraseña, rol, cuerpos e identificadores INT antes de persistir', async () => {
    const token = await login();
    await request(app.getHttpServer())
      .post('/auth/usuarios')
      .auth(token, { type: 'bearer' })
      .send({ nombreUsuario: 'nuevo', clave: 'corta', rolId: usuario.rol.id })
      .expect(400);
    await request(app.getHttpServer())
      .post('/auth/usuarios')
      .auth(token, { type: 'bearer' })
      .send({
        nombreUsuario: 'nuevo',
        clave: 'clave-sintetica-valida',
        rolId: 'invalido',
      })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/auth/usuarios/${usuario.id}`)
      .auth(token, { type: 'bearer' })
      .send({ activo: 'false' })
      .expect(400);
    expect(repositorio.crearUsuario).not.toHaveBeenCalled();
    expect(repositorio.actualizarUsuario).not.toHaveBeenCalled();
  });

  it('permite editar el nombre a Administrador y Super', async () => {
    const token = await login();
    repositorio.actualizarRol.mockResolvedValue({
      id: 2,
      nombre: 'Operador actualizado',
      codigo: 'operador',
    });
    await request(app.getHttpServer())
      .patch('/auth/roles/2')
      .auth(token, { type: 'bearer' })
      .send({ nombre: ' Operador actualizado ' })
      .expect(200)
      .expect({ id: 2, nombre: 'Operador actualizado', codigo: 'operador' });
    expect(repositorio.actualizarRol).toHaveBeenCalledWith(
      2,
      'Operador actualizado',
    );
    usuario.rol.codigo = 'super';
    await request(app.getHttpServer())
      .patch('/auth/roles/2')
      .auth(token, { type: 'bearer' })
      .send({ nombre: 'Operador actualizado' })
      .expect(200);
    await request(app.getHttpServer())
      .get('/auth/usuarios')
      .auth(token, { type: 'bearer' })
      .expect(200);
  });

  it('rechaza ID inválido, nombre vacío y modificación del código', async () => {
    const token = await login();
    for (const id of ['0', '-1', '1.2', '2147483648', 'uuid']) {
      await request(app.getHttpServer())
        .patch(`/auth/roles/${id}`)
        .auth(token, { type: 'bearer' })
        .send({ nombre: 'Nombre' })
        .expect(400);
    }
    await request(app.getHttpServer())
      .patch('/auth/roles/2')
      .auth(token, { type: 'bearer' })
      .send({ nombre: ' ' })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/auth/roles/2')
      .auth(token, { type: 'bearer' })
      .send({ nombre: 'Rol', codigo: 'administrador' })
      .expect(400);
    for (const rolId of [0, -1, 1.5, 2147483648, '2']) {
      await request(app.getHttpServer())
        .post('/auth/usuarios')
        .auth(token, { type: 'bearer' })
        .send({ nombreUsuario: 'nuevo', clave: 'abcdef', rolId })
        .expect(400);
    }
    expect(repositorio.actualizarRol).not.toHaveBeenCalled();
  });

  it('no expone creación ni eliminación del catálogo fijo', async () => {
    const token = await login();
    await request(app.getHttpServer())
      .post('/auth/roles')
      .auth(token, { type: 'bearer' })
      .send({ nombre: 'Nuevo', codigo: 'nuevo' })
      .expect(404);
    await request(app.getHttpServer())
      .delete('/auth/roles/2')
      .auth(token, { type: 'bearer' })
      .expect(404);
  });

  it.each(['super', 'administrador', 'usuario', 'paciente', 'tutor'])(
    'el rol %s accede a las rutas funcionales con JWT válido',
    async (codigo) => {
      usuario.rol.codigo = codigo;
      const token = await login();
      await request(app.getHttpServer())
        .get('/auth/usuarios')
        .auth(token, { type: 'bearer' })
        .expect(200);
      await request(app.getHttpServer())
        .get('/auth/roles')
        .auth(token, { type: 'bearer' })
        .expect(200);
      await request(app.getHttpServer())
        .patch('/auth/roles/1')
        .auth(token, { type: 'bearer' })
        .send({ nombre: 'Otro' })
        .expect(200);
    },
  );

  it('rechaza tokens anteriores con sub UUID tras el cambio a INT', async () => {
    const token = await jwt.signAsync({ sub: 'uuid-anterior', version: 0 });
    await request(app.getHttpServer())
      .get('/auth/yo')
      .auth(token, { type: 'bearer' })
      .expect(401);
    expect(repositorio.buscarUsuario).not.toHaveBeenCalled();
  });
});
