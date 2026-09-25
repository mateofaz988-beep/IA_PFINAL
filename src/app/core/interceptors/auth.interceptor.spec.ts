import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';
import { authInterceptor } from './auth.interceptor';

describe('JWT interceptor', () => {
  it('only sends credentials to the configured API boundary', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
      { provide: AuthService, useValue: { getIdToken: async () => 'private-token', currentUser: () => null } }] });
    const client = TestBed.inject(HttpClient); const testing = TestBed.inject(HttpTestingController);
    const local = firstValueFrom(client.get(`${environment.apiUrl}/vehiculos`)); await Promise.resolve();
    const req = testing.expectOne(`${environment.apiUrl}/vehiculos`); expect(req.request.headers.get('Authorization')).toBe('Bearer private-token'); req.flush([]); await local;
    const other = firstValueFrom(client.get(`${environment.apiUrl}.evil.example/vehiculos`));
    const external = testing.expectOne(`${environment.apiUrl}.evil.example/vehiculos`); expect(external.request.headers.has('Authorization')).toBe(false); external.flush([]); await other;
    testing.verify();
  });
});
