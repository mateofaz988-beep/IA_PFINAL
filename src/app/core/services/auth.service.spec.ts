import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService REST', () => {
  let auth: AuthService; let http: HttpTestingController;
  const base = environment.apiUrl;
  const user = { id: 1, nombre: 'Cliente', apellido: 'Prueba', email: 'client@example.com', rol: 'cliente', role_id: 1, activo: true, debe_cambiar_password: false, created_at: '', telefono: null, documento: null };
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    auth = TestBed.inject(AuthService); http = TestBed.inject(HttpTestingController);
    http.expectOne(`${base}/auth/refresh`).flush({}, { status: 401, statusText: 'Unauthorized' });
    await auth.ready();
  });
  afterEach(() => http.verify());
  it('restores an unauthenticated state if there is no refresh session', () => {
    expect(auth.currentUser()).toBeNull(); expect(auth.isLoading()).toBe(false);
  });
  it('logs in via API and keeps access token only in memory', async () => {
    const task = auth.login(user.email, 'test-password'); await Promise.resolve(); await Promise.resolve();
    const req = http.expectOne(`${base}/auth/login`); expect(req.request.withCredentials).toBe(true);
    req.flush({ user, access_token: 'test-access', expires_in: 900 }); await task;
    expect(auth.currentUser()?.rol).toBe('cliente'); expect(await auth.getIdToken()).toBe('test-access');
    expect(localStorage.getItem('access_token')).toBeNull();
  });
  it('coalesces concurrent refresh calls and clears rejected sessions', async () => {
    const a = auth.refresh(); const b = auth.refresh(); expect(a).toBe(b);
    http.expectOne(`${base}/auth/refresh`).flush({}, { status: 401, statusText: 'Unauthorized' });
    await a; expect(auth.currentUser()).toBeNull();
  });
});
