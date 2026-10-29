import { FormControl, FormGroup } from '@angular/forms';
import { rutValido, validarIdentificacion, validarTelefono } from './validadores-ingreso';

describe('Validación de datos de ingreso', () => {
  // Valores matemáticos sintéticos; no representan identidades reales.
  for (const rut of ['6000000K', '6000000-K', '6.000.000-K', '1000005-k', '1000005-K', '10000004-0']) {
    it(`acepta formato y módulo 11 del valor sintético ${rut}`, () => {
      expect(rutValido(rut)).toBeTrue();
    });
  }
  for (const rut of ['', '0-0', '6.000.000-6', '6..000.000-7', 'ABC6000000-7', '6000000', '6000000--7']) {
    it(`rechaza RUT inválido ${rut}`, () => expect(rutValido(rut)).toBeFalse());
  }
  it('no aplica la regla RUT a pasaportes', () => {
    const grupo = new FormGroup({
      tipo: new FormControl('Pasaporte'), valor: new FormControl('DOCUMENTO-SINTETICO'),
    }, { validators: validarIdentificacion });
    expect(grupo.valid).toBeTrue();
    grupo.controls.valor.setValue('');
    expect(grupo.hasError('identificacionIncompleta')).toBeTrue();
  });
  for (const valor of ['', '+56 9 0000 0000', '+1 (202) 000-0000']) {
    it('acepta teléfono opcional o formato internacional', () => {
      expect(validarTelefono(new FormControl(valor))).toBeNull();
    });
  }
  for (const valor of ['123', '900000000', '+000000000', '+1234567890123456', '+56 ABC']) {
    it('rechaza teléfono de formato inválido', () => {
      expect(validarTelefono(new FormControl(valor))).toEqual({ telefonoInvalido: true });
    });
  }
});
