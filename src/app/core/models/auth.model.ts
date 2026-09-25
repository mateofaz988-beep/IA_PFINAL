export type Role = 'cliente' | 'vendedor' | 'gerente' | 'admin';
export interface ApiUser {
  id: number; nombre: string; apellido: string | null; email: string;
  telefono: string | null; documento: string | null; role_id: number; rol: Role;
  activo: boolean; debe_cambiar_password: boolean; created_at: string;
}
export interface SessionUser extends ApiUser { uid: string; displayName: string; }
export interface AuthResponse { access_token: string; expires_in: number; user: ApiUser; }
export interface Registration { nombre: string; apellido: string; email: string; password: string; telefono: string; documento: string; }
