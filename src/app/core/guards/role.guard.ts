import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Rol } from '../models/usuario.model';
import { AuthService } from '../services/auth.service';
import { UsuariosService } from '../services/usuarios.service';

/**
 * Guard por rol — el authGuard existente solo confirma que hay sesión.
 * Comprueba el rol devuelto por la API; FastAPI vuelve a validar los permisos.
 * Uso: canActivate: [roleGuard(['admin'])]
 */
export function roleGuard(rolesPermitidos: Rol[]): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const usuarios = inject(UsuariosService);
    const router = inject(Router);

    await auth.ready();
    const user = auth.currentUser();
    if (!user) {
      return router.parseUrl('/login');
    }
    if (user.debe_cambiar_password) return router.parseUrl('/cambiar-password');

    const perfil = await usuarios.obtenerPerfil(user.uid);
    if (perfil && rolesPermitidos.includes(perfil.rol)) {
      return true;
    }

    return router.parseUrl('/dashboard');
  };
}
