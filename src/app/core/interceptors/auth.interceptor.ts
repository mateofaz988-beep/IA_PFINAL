import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const base = environment.apiUrl.replace(/\/$/, '');
  if (req.url !== base && !req.url.startsWith(`${base}/`)) return next(req);
  const auth = inject(AuthService);
  return from(auth.getIdToken()).pipe(switchMap(token => next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req)),
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || !auth.currentUser()) return throwError(() => error);
      return from(auth.refresh()).pipe(switchMap(user => user ? from(auth.getIdToken()).pipe(
        switchMap(token => next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })))) : throwError(() => error)));
    }));
};
