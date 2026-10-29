import { DataSource, type DataSourceOptions } from 'typeorm';

export async function iniciarFuenteDatos(
  opciones?: DataSourceOptions,
): Promise<DataSource> {
  if (!opciones) {
    throw new Error('Falta la configuración de persistencia.');
  }
  const datos = new DataSource({ ...opciones, synchronize: false });
  await datos.initialize();
  try {
    if (opciones.synchronize) {
      const ejecutor = datos.createQueryRunner();
      try {
        const esquemas = new Set(
          datos.entityMetadatas.map((entidad) => entidad.schema),
        );
        for (const esquema of esquemas) {
          if (esquema) {
            await ejecutor.createSchema(esquema, true);
          }
        }
      } finally {
        await ejecutor.release();
      }
      await datos.synchronize();
    }
    return datos;
  } catch (error) {
    await datos.destroy();
    throw error;
  }
}
