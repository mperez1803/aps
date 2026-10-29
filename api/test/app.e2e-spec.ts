import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { ModuloAplicacion } from './../src/modulo-aplicacion.js';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
  RolEntidad,
  UsuarioEntidad,
} from '../src/modulos/auth/infraestructura/entidades-auth.js';
import { RepositorioAuth } from '../src/modulos/auth/dominio/repositorio-auth.js';

describe('ControladorSalud (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ModuloAplicacion],
    })
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({
          DB_HOST: 'localhost',
          DB_PORT: '5432',
          DB_NAME: 'aps_pruebas',
          DB_USER: 'usuario_pruebas',
          DB_PASSWORD: '',
          JWT_SECRET: 'secreto-sintetico-exclusivo-para-pruebas-unitarias',
        }),
      )
      .overrideProvider(getDataSourceToken())
      .useValue({ isInitialized: false })
      .overrideProvider(getRepositoryToken(RolEntidad))
      .useValue({})
      .overrideProvider(getRepositoryToken(UsuarioEntidad))
      .useValue({})
      .overrideProvider(RepositorioAuth)
      .useValue({ inicializarRoles: vi.fn().mockResolvedValue(undefined) })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/salud (GET)', () => {
    return request(app.getHttpServer())
      .get('/salud')
      .expect(200)
      .expect({ estado: 'disponible', servicio: 'API de Admisión APS' });
  });

  afterEach(async () => {
    await app.close();
  });
});
