import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UsuariosService } from '../services/usuarios.service';
import { roleGuard } from './role.guard';

describe('RoleGuard', () => {
  it('does not allow a customer into the admin route', async () => {
    TestBed.configureTestingModule({providers: [provideRouter([]),
      {provide: AuthService, useValue: {ready: async () => {}, currentUser: () => ({uid: '1', rol: 'cliente'})}},
      {provide: UsuariosService, useValue: {obtenerPerfil: async () => ({rol: 'cliente'})}}]});
    const result = await TestBed.runInInjectionContext(() => roleGuard(['admin'])({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    expect(TestBed.inject(Router).serializeUrl(result as ReturnType<Router['parseUrl']>)).toBe('/dashboard');
  });
});
