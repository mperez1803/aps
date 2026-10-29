export interface Rol {
  id: number;
  nombre: string;
  codigo: string;
}

export interface Usuario {
  id: number;
  nombreUsuario: string;
  activo: boolean;
  versionSesion: number;
  rol: Rol;
}

export interface CredencialesUsuario extends Usuario {
  claveHash: string;
}

export abstract class RepositorioAuth {
  abstract buscarCredenciales(
    nombre: string,
  ): Promise<CredencialesUsuario | null>;
  abstract buscarUsuario(id: number): Promise<Usuario | null>;
  abstract listarUsuarios(): Promise<Usuario[]>;
  abstract listarRoles(): Promise<Rol[]>;
  abstract inicializarRoles(): Promise<void>;
  abstract actualizarRol(id: number, nombre: string): Promise<Rol>;
  abstract crearUsuario(
    nombre: string,
    claveHash: string,
    rolId: number,
  ): Promise<Usuario>;
  abstract actualizarUsuario(
    id: number,
    cambios: {
      activo?: boolean;
      rolId?: number;
      claveHash?: string;
    },
  ): Promise<Usuario>;
  abstract invalidarSesion(id: number): Promise<void>;
  abstract crearAdministradorInicial(
    nombre: string,
    claveHash: string,
  ): Promise<void>;
}
