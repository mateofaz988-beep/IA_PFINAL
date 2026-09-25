import { Injectable, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiUser } from '../models/auth.model';
import { Rol, Usuario } from '../models/usuario.model';
import { AuthService } from './auth.service';

function profile(user: ApiUser): Usuario {
  return { uid: String(user.id), nombre: `${user.nombre} ${user.apellido ?? ''}`.trim(), correo: user.email,
    cedula: user.documento ?? '', telefono: user.telefono ?? '', rol: user.rol, moduloId: null, creadoEn: user.created_at };
}
@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  readonly perfil = computed(() => { const user = this.auth.currentUser(); return user ? profile(user) : null; });
  readonly rol = computed<Rol | null>(() => this.auth.currentUser()?.rol ?? null);
  async obtenerPerfil(uid: string): Promise<Usuario | null> { await this.auth.ready(); return this.perfil()?.uid === uid ? this.perfil() : null; }
  listarTodos(): Observable<Usuario[]> { return this.http.get<ApiUser[]>(`${environment.apiUrl}/usuarios`).pipe(map(users => users.map(profile))); }
  async cambiarRol(uid: string, rol: Rol): Promise<void> { await firstValueFrom(this.http.patch(`${environment.apiUrl}/usuarios/${uid}`, { rol })); }
}
