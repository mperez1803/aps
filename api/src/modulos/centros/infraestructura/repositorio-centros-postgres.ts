import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import {
  RepositorioCentros,
  type GuardarCentro,
  type DatosSector,
} from '../dominio/repositorio-centros.js';
import { CentroSaludEntidad, SectorEntidad } from './entidades-centros.js';

function perfilCentro(centro: CentroSaludEntidad, sectores: SectorEntidad[]) {
  return {
    id: centro.id,
    codigo: centro.codigo,
    nombre: centro.nombre,
    codigoDeis: centro.codigoDeis,
    comunaCodigo: centro.comunaCodigo,
    direccion: centro.direccion,
    telefonos: centro.telefonos,
    correos: centro.correos,
    activo: centro.activo,
    utilizaSectores: centro.utilizaSectores,
    sectores,
  };
}

function traducirError(error: unknown): never {
  if (
    error instanceof QueryFailedError &&
    'code' in error.driverError &&
    error.driverError.code === '23505'
  ) {
    throw new ConflictException('El código interno del centro ya existe.');
  }
  throw error;
}

@Injectable()
export class RepositorioCentrosPostgres extends RepositorioCentros {
  constructor(private readonly datos: DataSource) {
    super();
  }

  async listar() {
    const centros = await this.datos
      .getRepository(CentroSaludEntidad)
      .find({ order: { nombre: 'ASC', id: 'ASC' } });
    const sectores = await this.datos
      .getRepository(SectorEntidad)
      .find({ order: { nombre: 'ASC', id: 'ASC' } });
    return centros.map((centro) =>
      perfilCentro(
        centro,
        sectores.filter((sector) => sector.centroId === centro.id),
      ),
    );
  }

  async crear(datos: GuardarCentro) {
    try {
      return await this.datos.transaction(async (gestor) => {
        const { sectores, ...atributos } = datos;
        const repositorio = gestor.getRepository(CentroSaludEntidad);
        const centro = await repositorio.save(repositorio.create(atributos));
        await this.guardarSectores(gestor, centro, sectores);
        return perfilCentro(
          centro,
          await gestor.find(SectorEntidad, {
            where: { centroId: centro.id },
            order: { nombre: 'ASC', id: 'ASC' },
          }),
        );
      });
    } catch (error) {
      traducirError(error);
    }
  }

  async actualizar(id: number, datos: GuardarCentro) {
    try {
      return await this.datos.transaction(async (gestor) => {
        const { sectores, ...atributos } = datos;
        const repositorio = gestor.getRepository(CentroSaludEntidad);
        const centro = await repositorio.findOne({
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!centro) {
          throw new NotFoundException('El centro de salud no existe.');
        }
        const actualizado = await repositorio.save(
          repositorio.merge(centro, atributos),
        );
        await this.guardarSectores(gestor, actualizado, sectores);
        return perfilCentro(
          actualizado,
          await gestor.find(SectorEntidad, {
            where: { centroId: id },
            order: { nombre: 'ASC', id: 'ASC' },
          }),
        );
      });
    } catch (error) {
      traducirError(error);
    }
  }

  private async guardarSectores(
    gestor: EntityManager,
    centro: CentroSaludEntidad,
    sectores: GuardarCentro['sectores'],
  ) {
    for (const { id, ...atributos } of sectores ?? []) {
      if (id === undefined) {
        if (!centro.activo || !centro.utilizaSectores) {
          throw new BadRequestException(
            'Activa el centro y Utiliza sectores para agregar sectores.',
          );
        }
        await gestor.save(
          SectorEntidad,
          gestor.create(SectorEntidad, { ...atributos, centroId: centro.id }),
        );
      } else {
        const sector = await gestor.findOneBy(SectorEntidad, {
          id,
          centroId: centro.id,
        });
        if (!sector) {
          throw new NotFoundException(
            'El sector no pertenece al centro indicado.',
          );
        }
        await gestor.save(
          SectorEntidad,
          gestor.merge(SectorEntidad, sector, atributos),
        );
      }
    }
  }

  async crearSector(centroId: number, datos: DatosSector) {
    try {
      return await this.datos.transaction(async (gestor) => {
        const centro = await gestor.findOne(CentroSaludEntidad, {
          where: { id: centroId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!centro) {
          throw new NotFoundException('El centro de salud no existe.');
        }
        if (!centro.activo || !centro.utilizaSectores) {
          throw new BadRequestException(
            'Activa el centro y la opción Utiliza sectores antes de agregar sectores.',
          );
        }
        return gestor.save(SectorEntidad, { ...datos, centroId });
      });
    } catch (error) {
      traducirError(error);
    }
  }

  async actualizarSector(centroId: number, id: number, datos: DatosSector) {
    try {
      const repositorio = this.datos.getRepository(SectorEntidad);
      const sector = await repositorio.findOneBy({ id, centroId });
      if (!sector) {
        throw new NotFoundException(
          'El sector no pertenece al centro indicado.',
        );
      }
      return await repositorio.save(repositorio.merge(sector, datos));
    } catch (error) {
      traducirError(error);
    }
  }
}
