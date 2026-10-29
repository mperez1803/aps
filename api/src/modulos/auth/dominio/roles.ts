export const ROLES_INICIALES = [
  { codigo: 'super', nombre: 'Super' },
  { codigo: 'administrador', nombre: 'Administrador' },
  { codigo: 'usuario', nombre: 'Usuario' },
  { codigo: 'paciente', nombre: 'Paciente' },
  { codigo: 'tutor', nombre: 'Tutor' },
];

export function administraAccesos(codigo: string): boolean {
  return codigo === 'super' || codigo === 'administrador';
}
