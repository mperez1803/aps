import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import type { Usuario } from './servicio-auth';

export const EstadoSesion = signalStore(
  { providedIn: 'root' },
  withState({ usuario: null as Usuario | null }),
  withMethods((estado) => ({
    establecer(usuario: Usuario | null) { patchState(estado, { usuario }); },
  })),
);
