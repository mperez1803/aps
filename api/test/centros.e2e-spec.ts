import { INestApplication, ConflictException } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { GuardiaAuth } from '../src/modulos/auth/infraestructura/guardia-auth.js';
import { nombreCookieSesion } from '../src/modulos/auth/infraestructura/cookie-sesion.js';
import { ServicioAuth } from '../src/modulos/auth/aplicacion/servicio-auth.js';
import { ServicioCentros } from '../src/modulos/centros/aplicacion/servicio-centros.js';
import { RepositorioCentros } from '../src/modulos/centros/dominio/repositorio-centros.js';
import { CODIGOS_COMUNA } from '../src/modulos/centros/dominio/comunas.js';
import { ControladorCentros } from '../src/modulos/centros/infraestructura/controlador-centros.js';

describe('Centros de Salud HTTP', () => {
  let app: INestApplication;
  const repositorio = {
    listar: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    crearSector: vi.fn(),
    actualizarSector: vi.fn(),
  };
  const datos = {
    codigo: 'CENTRO-SINTETICO',
    nombre: 'Centro sintético',
    codigoDeis: null,
    comunaCodigo: '1101',
    direccion: 'Vía ficticia 123',
    telefonos: [{ valor: '+56000000001', uso: '', principal: true }],
    correos: [
      { valor: 'centro@example.invalid', uso: 'work', principal: true },
    ],
    activo: true,
    utilizaSectores: true,
  };
  const perfil = {
    id: 1,
    nombreUsuario: 'sintetico',
    activo: true,
    versionSesion: 0,
    rol: { id: 1, codigo: 'usuario', nombre: 'Usuario' },
  };
  beforeEach(async () => {
    vi.resetAllMocks();
    repositorio.listar.mockResolvedValue([]);
    repositorio.crear.mockImplementation((entrada) =>
      Promise.resolve({ id: 1, ...entrada, sectores: [] }),
    );
    repositorio.actualizar.mockImplementation((id, entrada) =>
      Promise.resolve({ id, ...entrada, sectores: [] }),
    );
    repositorio.crearSector.mockImplementation((centroId, entrada) =>
      Promise.resolve({ id: 1, centroId, ...entrada }),
    );
    repositorio.actualizarSector.mockImplementation((centroId, id, entrada) =>
      Promise.resolve({ id, centroId, ...entrada }),
    );
    const modulo = await Test.createTestingModule({
      controllers: [ControladorCentros],
      providers: [
        ServicioCentros,
        { provide: RepositorioCentros, useValue: repositorio },
        {
          provide: ServicioAuth,
          useValue: { autenticar: vi.fn().mockResolvedValue(perfil) },
        },
        { provide: APP_GUARD, useClass: GuardiaAuth },
      ],
    }).compile();
    app = modulo.createNestApplication();
    await app.init();
  });
  afterEach(async () => {
    await app.close();
  });

  it('exige sesión y protege las mutaciones con cookie mediante CSRF', async () => {
    await request(app.getHttpServer()).get('/centros-salud').expect(401);
    await request(app.getHttpServer())
      .post('/centros-salud')
      .set('Cookie', `${nombreCookieSesion()}=sintetico`)
      .send(datos)
      .expect(403);
    expect(repositorio.crear).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .post('/centros-salud')
      .set('Cookie', `${nombreCookieSesion()}=sintetico`)
      .set('X-Kumara-CSRF', '1')
      .send(datos)
      .expect(201);
  });

  it('lista y crea centros con DEIS opcional y contactos múltiples sin duplicar la institución', async () => {
    await request(app.getHttpServer())
      .get('/centros-salud')
      .auth('sintetico', { type: 'bearer' })
      .expect(200, []);
    const respuesta = await request(app.getHttpServer())
      .post('/centros-salud')
      .auth('sintetico', { type: 'bearer' })
      .send({
        ...datos,
        codigo: ' c-sintetico ',
        telefonos: [
          { valor: '+56000000001', uso: '', principal: true },
          { valor: '+56000000002', uso: 'work', principal: false },
        ],
      })
      .expect(201);
    expect(respuesta.body.codigo).toBe('C-SINTETICO');
    expect(respuesta.body.codigoDeis).toBeNull();
    expect(respuesta.body.telefonos).toHaveLength(2);
    await request(app.getHttpServer())
      .patch('/centros-salud/1')
      .auth('sintetico', { type: 'bearer' })
      .send({
        ...datos,
        activo: false,
        utilizaSectores: false,
        comunaCodigo: '',
      })
      .expect(200);
  });

  it.each([
    { codigo: ' ' },
    { nombre: '' },
    { comunaCodigo: '99999' },
    { comunaCodigo: 1101 },
    { codigoDeis: 'ABC' },
    { activo: 'true' },
    { utilizaSectores: 1 },
    { telefonos: ['texto'] },
    { correos: ['no-correo'] },
    { telefonos: [{ valor: 'texto', uso: '', principal: true }] },
    { correos: [{ valor: 'no-correo', uso: '', principal: true }] },
    { telefonos: [{ valor: '+56000000001', uso: '', principal: false }] },
    {
      telefonos: [{ valor: '+56000000001', uso: 'invalido', principal: true }],
    },
    { telefonos: [{ valor: '+56000000001', uso: '', principal: 'true' }] },
    {
      correos: [
        { valor: 'uno@example.invalid', uso: '', principal: true },
        { valor: 'dos@example.invalid', uso: '', principal: true },
      ],
    },
    { direccion: '' },
    { telefonos: Array.from({ length: 21 }, () => '+56000000001') },
    { institucionId: 99 },
  ])('rechaza entrada inválida: %j', async (cambio) => {
    await request(app.getHttpServer())
      .post('/centros-salud')
      .auth('sintetico', { type: 'bearer' })
      .send({ ...datos, ...cambio })
      .expect(400);
    expect(repositorio.crear).not.toHaveBeenCalled();
  });

  it('valida IDs INT, normaliza sectores y no permite moverlos entre centros desde el cuerpo', async () => {
    await request(app.getHttpServer())
      .patch('/centros-salud/2147483648')
      .auth('sintetico', { type: 'bearer' })
      .send(datos)
      .expect(400);
    await request(app.getHttpServer())
      .post('/centros-salud/1/sectores')
      .auth('sintetico', { type: 'bearer' })
      .send({ color: '#ab1234', nombre: 'Sector sintético', activo: true })
      .expect(201);
    expect(repositorio.crearSector).toHaveBeenCalledWith(1, {
      color: '#AB1234',
      nombre: 'Sector sintético',
      activo: true,
    });
    await request(app.getHttpServer())
      .patch('/centros-salud/1/sectores/2')
      .auth('sintetico', { type: 'bearer' })
      .send({ color: '#AB1234', nombre: 'Sector', activo: false, centroId: 2 })
      .expect(400);
  });

  it.each([
    { color: 'rojo' },
    { color: '#123' },
    { color: '#123456;display:none' },
    { nombre: '' },
    { codigo: 'S1' },
    { id: 2 },
  ])('rechaza sector inválido: %j', async (cambio) => {
    await request(app.getHttpServer())
      .post('/centros-salud/1/sectores')
      .auth('sintetico', { type: 'bearer' })
      .send({
        nombre: 'Sector sintético',
        color: '#123456',
        activo: true,
        ...cambio,
      })
      .expect(400);
    expect(repositorio.crearSector).not.toHaveBeenCalled();
  });

  it('devuelve conflictos explícitos y no publica borrado físico', async () => {
    repositorio.crear.mockRejectedValue(
      new ConflictException('El código ya existe.'),
    );
    await request(app.getHttpServer())
      .post('/centros-salud')
      .auth('sintetico', { type: 'bearer' })
      .send(datos)
      .expect(409);
    await request(app.getHttpServer())
      .delete('/centros-salud/1')
      .auth('sintetico', { type: 'bearer' })
      .expect(404);
    expect(CODIGOS_COMUNA.size).toBe(347);
  });

  it('recibe sectores nuevos junto con el alta y sectores existentes junto con la edición', async () => {
    const sector = {
      nombre: ' Sector sintético ',
      color: '#ab1234',
      activo: true,
    };
    await request(app.getHttpServer())
      .post('/centros-salud')
      .auth('sintetico', { type: 'bearer' })
      .send({ ...datos, sectores: [sector] })
      .expect(201);
    expect(repositorio.crear).toHaveBeenCalledWith({
      ...datos,
      sectores: [
        { nombre: 'Sector sintético', color: '#AB1234', activo: true },
      ],
    });
    await request(app.getHttpServer())
      .patch('/centros-salud/1')
      .auth('sintetico', { type: 'bearer' })
      .send({ ...datos, sectores: [{ ...sector, id: 8 }] })
      .expect(200);
    expect(repositorio.actualizar).toHaveBeenCalledWith(1, {
      ...datos,
      sectores: [
        { id: 8, nombre: 'Sector sintético', color: '#AB1234', activo: true },
      ],
    });
  });

  it.each([
    { sectores: {} },
    { sectores: [{ nombre: '', color: '#123456', activo: true }] },
    { sectores: [{ nombre: 'Sector', color: 'rojo', activo: true }] },
    {
      sectores: [
        { nombre: 'Sector', color: '#123456', activo: true, centroId: 2 },
      ],
    },
    {
      utilizaSectores: false,
      sectores: [{ nombre: 'Sector', color: '#123456', activo: true }],
    },
    {
      activo: false,
      sectores: [{ nombre: 'Sector', color: '#123456', activo: true }],
    },
    { sectores: [{ id: 8, nombre: 'Sector', color: '#123456', activo: true }] },
  ])('rechaza alta con sectores inválidos: %j', async (cambio) => {
    await request(app.getHttpServer())
      .post('/centros-salud')
      .auth('sintetico', { type: 'bearer' })
      .send({ ...datos, ...cambio })
      .expect(400);
    expect(repositorio.crear).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5, '8', null, 2147483648])(
    'rechaza ID inválido de sector en edición: %j',
    async (id) => {
      await request(app.getHttpServer())
        .patch('/centros-salud/1')
        .auth('sintetico', { type: 'bearer' })
        .send({
          ...datos,
          sectores: [{ id, nombre: 'Sector', color: '#123456', activo: true }],
        })
        .expect(400);
      expect(repositorio.actualizar).not.toHaveBeenCalled();
    },
  );

  it('rechaza IDs de sector repetidos en una misma edición', async () => {
    const sector = { id: 8, nombre: 'Sector', color: '#123456', activo: true };
    await request(app.getHttpServer())
      .patch('/centros-salud/1')
      .auth('sintetico', { type: 'bearer' })
      .send({ ...datos, sectores: [sector, sector] })
      .expect(400);
    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });
});
