
/** El registro público solo puede crear 'cliente' — asesor/administrador se asignan desde el panel de admin. */
export type Rol = 'cliente' | 'vendedor' | 'gerente' | 'admin';

export interface Usuario {
  uid: string;
  nombre: string;
  correo: string;
  cedula: string;
  telefono: string;
  rol: Rol;
  /** Módulo asignado actualmente — solo tiene sentido si rol === 'vendedor'. */
  moduloId: string | null;
  creadoEn: string;
}

/** Forma del documento tal como se escribe, sin el uid (que ya es el id del doc). */
export type UsuarioDoc = Omit<Usuario, 'uid'>;
