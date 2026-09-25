import { Injectable, inject, signal } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, Registration, SessionUser } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly base = `${environment.apiUrl}/auth`;
  private token: string | null = null;
  private expiresAt = 0;
  private refreshing: Promise<SessionUser | null> | null = null;
  readonly currentUser = signal<SessionUser | null>(null);
  readonly isLoading = signal(true);
  private readonly initialized = this.refresh().finally(() => this.isLoading.set(false));

  async ready(): Promise<void> { await this.initialized; }
  private accept(response: AuthResponse): SessionUser {
    this.token = response.access_token;
    this.expiresAt = Date.now() + response.expires_in * 1000 - 10000;
    const user = { ...response.user, uid: String(response.user.id), displayName: `${response.user.nombre} ${response.user.apellido ?? ''}`.trim() };
    this.currentUser.set(user);
    return user;
  }
  clear(): void { this.token = null; this.expiresAt = 0; this.currentUser.set(null); }
  refresh(): Promise<SessionUser | null> {
    if (!this.refreshing) {
      this.refreshing = firstValueFrom(this.http.post<AuthResponse>(`${this.base}/refresh`, {}, { withCredentials: true }))
        .then(response => this.accept(response))
        .catch(() => { this.clear(); return null; })
        .finally(() => { this.refreshing = null; });
    }
    return this.refreshing;
  }
  async register(payload: Registration): Promise<SessionUser> {
    await this.ready();
    return this.accept(await firstValueFrom(this.http.post<AuthResponse>(`${this.base}/register`, payload, { withCredentials: true })));
  }
  async login(email: string, password: string): Promise<SessionUser> {
    await this.ready();
    return this.accept(await firstValueFrom(this.http.post<AuthResponse>(`${this.base}/login`, { email, password }, { withCredentials: true })));
  }
  async logout(): Promise<void> {
    const token = await this.getIdToken();
    if (token) await firstValueFrom(this.http.post(`${this.base}/logout`, {}, { withCredentials: true, headers: { Authorization: `Bearer ${token}` } }));
    this.clear();
  }
  async getIdToken(): Promise<string | null> {
    await this.ready();
    if (this.token && Date.now() >= this.expiresAt) await this.refresh();
    return this.token;
  }
  async changePassword(current_password: string, new_password: string): Promise<void> {
    const token = await this.getIdToken();
    const result = await firstValueFrom(this.http.post<AuthResponse>(`${this.base}/change-password`, { current_password, new_password },
      { withCredentials: true, headers: { Authorization: `Bearer ${token}` } }));
    this.accept(result);
  }
}
