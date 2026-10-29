import { BadRequestException, Injectable } from '@nestjs/common';
import {
  RepositorioCentros,
  type GuardarCentro,
  type DatosSector,
  type ContactoCentro,
} from '../dominio/repositorio-centros.js';
import { CODIGOS_COMUNA } from '../dominio/comunas.js';

function cuerpo(valor: unknown, campos: string[]): Record<string, unknown> {
  if (
    !valor ||
    typeof valor !== 'object' ||
    Array.isArray(valor) ||
    Object.keys(valor).some((campo) => !campos.includes(campo))
  ) {
    throw new BadRequestException('El cuerpo de la solicitud no es válido.');
  }
  return valor as Record<string, unknown>;
}

function texto(valor: unknown, campo: string, maximo: number): string {
  if (
    typeof valor !== 'string' ||
    !valor.trim() ||
    valor.trim().length > maximo
  ) {
    throw new BadRequestException(
      `${campo}: indica un texto de 1 a ${maximo} caracteres.`,
    );
  }
  return valor.trim();
}

function booleano(valor: unknown, campo: string): boolean {
  if (typeof valor !== 'boolean') {
    throw new BadRequestException(`${campo} debe ser booleano.`);
  }
  return valor;
}

function contactos(valor: unknown, correo: boolean): ContactoCentro[] {
  if (!Array.isArray(valor) || valor.length > 20) {
    throw new BadRequestException(
      'Los contactos deben ser una lista de hasta 20 elementos.',
    );
  }
  const registros = valor.map((entrada: unknown) => {
    const registro = cuerpo(entrada, ['valor', 'uso', 'principal']);
    const dato = texto(
      registro.valor,
      correo ? 'Correo' : 'Teléfono',
      correo ? 254 : 40,
    );
    const valido = correo
      ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dato)
      : /^\+[1-9]\d{6,14}$/.test(dato.replace(/[\s().-]/g, ''));
    if (!valido) {
      throw new BadRequestException(
        correo
          ? 'Correo electrónico inválido.'
          : 'Teléfono inválido: incluye + y código de país, entre 7 y 15 dígitos.',
      );
    }
    if (
      typeof registro.uso !== 'string' ||
      !['', 'home', 'work', 'temp', 'old', 'mobile'].includes(registro.uso)
    ) {
      throw new BadRequestException(
        'Selecciona un uso de contacto del catálogo o No informado.',
      );
    }
    return {
      valor: dato,
      uso: registro.uso,
      principal: booleano(registro.principal, 'Principal'),
    };
  });
  if (
    registros.length > 0 &&
    registros.filter((registro) => registro.principal).length !== 1
  ) {
    throw new BadRequestException(
      'Debe existir exactamente un principal por colección de contactos.',
    );
  }
  return registros;
}

@Injectable()
export class ServicioCentros {
  constructor(private readonly repositorio: RepositorioCentros) {}

  listar() {
    return this.repositorio.listar();
  }

  identificador(valor: string): number {
    if (!/^[1-9]\d*$/.test(valor) || Number(valor) > 2147483647) {
      throw new BadRequestException(
        'El identificador debe ser un INT positivo.',
      );
    }
    return Number(valor);
  }

  private datosCentro(valor: unknown, creando = false): GuardarCentro {
    const datos = cuerpo(valor, [
      'codigo',
      'nombre',
      'codigoDeis',
      'comunaCodigo',
      'direccion',
      'telefonos',
      'correos',
      'activo',
      'utilizaSectores',
      'sectores',
    ]);
    if (
      typeof datos.comunaCodigo !== 'string' ||
      !CODIGOS_COMUNA.has(datos.comunaCodigo)
    ) {
      throw new BadRequestException(
        'Selecciona una comuna del catálogo o No informado.',
      );
    }
    const comunaCodigo = datos.comunaCodigo;
    const codigoDeis =
      datos.codigoDeis === null ||
      datos.codigoDeis === '' ||
      datos.codigoDeis === undefined
        ? null
        : texto(datos.codigoDeis, 'Código DEIS', 20);
    if (codigoDeis && !/^\d+$/.test(codigoDeis)) {
      throw new BadRequestException(
        'El código DEIS debe contener solo dígitos.',
      );
    }
    let sectores: GuardarCentro['sectores'];
    if (datos.sectores !== undefined) {
      if (!Array.isArray(datos.sectores)) {
        throw new BadRequestException('Los sectores deben ser una lista.');
      }
      const ids = new Set<number>();
      sectores = datos.sectores.map((entrada: unknown) => {
        const sector = cuerpo(entrada, ['id', 'nombre', 'color', 'activo']);
        const { id, ...atributos } = sector;
        const validado = this.datosSector(atributos);
        if (id === undefined) {
          return validado;
        }
        if (
          creando ||
          typeof id !== 'number' ||
          !Number.isInteger(id) ||
          id < 1 ||
          id > 2147483647 ||
          ids.has(id)
        ) {
          throw new BadRequestException(
            'Los ID de sectores deben ser únicos, existentes y no se asignan al crear un centro.',
          );
        }
        ids.add(id);
        return { ...validado, id };
      });
      if (
        sectores.some((sector) => sector.id === undefined) &&
        (!datos.activo || !datos.utilizaSectores)
      ) {
        throw new BadRequestException(
          'Activa el centro y Utiliza sectores para agregar sectores.',
        );
      }
    }
    return {
      codigo: texto(datos.codigo, 'Código interno', 40).toUpperCase(),
      nombre: texto(datos.nombre, 'Nombre', 160),
      codigoDeis,
      comunaCodigo,
      direccion: texto(datos.direccion, 'Dirección', 300),
      telefonos: contactos(datos.telefonos, false),
      correos: contactos(datos.correos, true),
      activo: booleano(datos.activo, 'Activo'),
      utilizaSectores: booleano(datos.utilizaSectores, 'Utiliza sectores'),
      ...(sectores === undefined ? {} : { sectores }),
    };
  }

  private datosSector(valor: unknown): DatosSector {
    const datos = cuerpo(valor, ['nombre', 'color', 'activo']);
    const color = texto(datos.color, 'Color', 7);
    if (!/^#[0-9a-f]{6}$/i.test(color)) {
      throw new BadRequestException(
        'El color debe tener formato hexadecimal #RRGGBB.',
      );
    }
    return {
      nombre: texto(datos.nombre, 'Nombre del sector', 120),
      color: color.toUpperCase(),
      activo: booleano(datos.activo, 'Activo'),
    };
  }

  crear(valor: unknown) {
    return this.repositorio.crear(this.datosCentro(valor, true));
  }
  actualizar(id: number, valor: unknown) {
    return this.repositorio.actualizar(id, this.datosCentro(valor));
  }
  crearSector(centroId: number, valor: unknown) {
    return this.repositorio.crearSector(centroId, this.datosSector(valor));
  }
  actualizarSector(centroId: number, id: number, valor: unknown) {
    return this.repositorio.actualizarSector(
      centroId,
      id,
      this.datosSector(valor),
    );
  }
}
