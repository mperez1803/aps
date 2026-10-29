import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { ContactoCentro } from '../dominio/repositorio-centros.js';

@Entity({ schema: 'Administracion', name: 'centros_salud' })
export class CentroSaludEntidad {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;
  @Column({ type: 'varchar', length: 40, unique: true })
  codigo!: string;
  @Column({ type: 'varchar', length: 160 })
  nombre!: string;
  @Column({ type: 'varchar', length: 20, nullable: true })
  codigoDeis!: string | null;
  @Column({ type: 'varchar', length: 5 })
  comunaCodigo!: string;
  @Column({ type: 'varchar', length: 300 })
  direccion!: string;
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  telefonos!: ContactoCentro[];
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  correos!: ContactoCentro[];
  @Column({ type: 'boolean', default: true })
  activo!: boolean;
  @Column({ type: 'boolean', default: false })
  utilizaSectores!: boolean;
}

@Entity({ schema: 'Administracion', name: 'sectores' })
export class SectorEntidad {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;
  @Column({ type: 'integer' })
  centroId!: number;
  @ManyToOne(() => CentroSaludEntidad, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn({ name: 'centroId' })
  centro!: CentroSaludEntidad;
  @Column({ type: 'varchar', length: 120 })
  nombre!: string;
  @Column({ type: 'varchar', length: 7 })
  color!: string;
  @Column({ type: 'boolean', default: true })
  activo!: boolean;
}
