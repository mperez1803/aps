import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ schema: 'Auth', name: 'roles' })
export class RolEntidad {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;

  @Column({ type: 'varchar', length: 80 })
  nombre!: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  codigo!: string;
}

@Entity({ schema: 'Auth', name: 'usuarios' })
export class UsuarioEntidad {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;

  @Column({ type: 'varchar', length: 60, unique: true })
  nombreUsuario!: string;

  @Column({ type: 'varchar', length: 255, select: false })
  claveHash!: string;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @Column({ type: 'integer', default: 0 })
  versionSesion!: number;

  @Column({ type: 'integer' })
  rolId!: number;

  @ManyToOne(() => RolEntidad, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn({ name: 'rolId' })
  rol!: RolEntidad;
}
