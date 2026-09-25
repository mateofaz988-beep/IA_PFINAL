import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ready();

  const user = auth.currentUser();
  if (!user) return router.parseUrl('/login');
  if (user.debe_cambiar_password && route.routeConfig?.path !== 'cambiar-password') return router.parseUrl('/cambiar-password');
  return true;
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ready();

  const user = auth.currentUser();
  return user ? router.parseUrl(user.debe_cambiar_password ? '/cambiar-password' : '/dashboard') : true;
};
