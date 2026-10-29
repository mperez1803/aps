import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

function derivarClave(clave: string, sal: string): Promise<Buffer> {
  return new Promise((resolver, rechazar) => {
    scrypt(
      clave,
      sal,
      64,
      { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 },
      (error, hash) => {
        if (error) {
          rechazar(error);
        } else {
          resolver(hash);
        }
      },
    );
  });
}

export async function generarHash(clave: string): Promise<string> {
  const sal = randomBytes(16).toString('hex');
  const hash = await derivarClave(clave, sal);
  return `scrypt:${sal}:${hash.toString('hex')}`;
}

export async function verificarClave(
  clave: string,
  almacenado: string,
): Promise<boolean> {
  const [algoritmo, sal, hash] = almacenado.split(':');
  if (algoritmo !== 'scrypt' || !sal || !hash) {
    throw new Error('Formato de hash de contraseña inválido.');
  }
  const esperado = Buffer.from(hash, 'hex');
  const recibido = await derivarClave(clave, sal);
  return (
    esperado.length === recibido.length && timingSafeEqual(esperado, recibido)
  );
}
