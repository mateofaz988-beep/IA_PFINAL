import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('AuthGuard', () => {
  const currentUser = signal<null | { debe_cambiar_password: boolean }>(null);
  beforeEach(() => { currentUser.set(null); TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: { currentUser, ready: async () => {} } }] }); });
  async function result(path: string) {
    const value = await TestBed.runInInjectionContext(() => authGuard({ routeConfig: { path } } as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    return value === true ? true : TestBed.inject(Router).serializeUrl(value as ReturnType<Router['parseUrl']>);
  }
  it('requires login', async () => expect(await result('dashboard')).toBe('/login'));
  it('requires temporary password replacement', async () => { currentUser.set({ debe_cambiar_password: true }); expect(await result('dashboard')).toBe('/cambiar-password'); expect(await result('cambiar-password')).toBe(true); });
});
