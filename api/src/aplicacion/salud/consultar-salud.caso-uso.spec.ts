import { ConsultarSaludCasoUso } from './consultar-salud.caso-uso.js';

describe('ConsultarSaludCasoUso', () => {
  it('informa que la API está disponible', () => {
    const casoUso = new ConsultarSaludCasoUso();

    expect(casoUso.ejecutar()).toEqual({
      estado: 'disponible',
      servicio: 'API de Admisión APS',
    });
  });
});
