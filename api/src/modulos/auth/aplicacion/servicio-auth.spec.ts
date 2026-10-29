import { validarClave } from './servicio-auth.js';

describe('Longitud de contraseña', () => {
  it.each([6, 12, 128])('acepta %i caracteres', (longitud) => {
    const clave = 'a'.repeat(longitud);
    expect(validarClave(clave)).toBe(clave);
  });

  it.each(['', 'abcde', 'a'.repeat(129), null, 123456])(
    'rechaza longitudes fuera de rango y tipos inválidos',
    (clave) => {
      expect(() => validarClave(clave)).toThrow(
        'La contraseña debe tener entre 6 y 128 caracteres.',
      );
    },
  );
});
