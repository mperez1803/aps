import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function formatearRut(valor: string): string {
  const rut = valor.trim();
  if (!/^(?:\d{1,8}|\d{1,2}(?:\.\d{3}){2})-?[\dkK]$/.test(rut)) { return valor; }
  const limpio = rut.replace(/[.-]/g, '').toUpperCase();
  return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
}

export function rutValido(valor: string): boolean {
  const rut = valor.trim();
  if (!/^(?:\d{1,8}|\d{1,2}(?:\.\d{3}){2})-?[\dkK]$/.test(rut)) {
    return false;
  }
  const limpio = rut.replace(/[.-]/g, '').toUpperCase();
  const cuerpo = limpio.slice(0, -1);
  if (Number(cuerpo) === 0) { return false; }
  let suma = 0;
  let factor = 2;
  for (const digito of [...cuerpo].reverse()) {
    suma += Number(digito) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resultado = 11 - (suma % 11);
  const verificador = resultado === 11 ? '0' : resultado === 10 ? 'K' : String(resultado);
  return limpio.at(-1) === verificador;
}

export const validarIdentificacion: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const tipo: unknown = control.get('tipo')?.value;
  const valor: unknown = control.get('valor')?.value;
  if (tipo === '' && valor === '') { return null; }
  if (!tipo || typeof valor !== 'string' || !valor.trim()) {
    return { identificacionIncompleta: true };
  }
  return tipo === 'RUT/RUN chileno' && !rutValido(valor) ? { rutInvalido: true } : null;
};

export const validarTelefono: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const valor: unknown = control.value;
  if (valor === '') { return null; }
  if (typeof valor !== 'string' || !/^\+[1-9][\d ()-]*$/.test(valor)) {
    return { telefonoInvalido: true };
  }
  const digitos = valor.replace(/\D/g, '');
  return digitos.length >= 7 && digitos.length <= 15 ? null : { telefonoInvalido: true };
};
