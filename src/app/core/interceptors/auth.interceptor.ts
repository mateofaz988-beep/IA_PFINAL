import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/** Adjunta el ID token de Firebase como Bearer token en las llamadas al backend propio. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const auth = inject(AuthService);

  return from(auth.getIdToken()).pipe(
    switchMap((token) => {
      const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
      return next(authReq);
    }),
  );
};
