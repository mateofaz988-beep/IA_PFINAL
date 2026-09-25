import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  get<T>(path: string): Promise<T> { return firstValueFrom(this.http.get<T>(environment.apiUrl + path)); }
  post<T>(path: string, value: unknown = {}): Promise<T> { return firstValueFrom(this.http.post<T>(environment.apiUrl + path, value)); }
  put<T>(path: string, value: unknown): Promise<T> { return firstValueFrom(this.http.put<T>(environment.apiUrl + path, value)); }
  patch<T>(path: string, value: unknown): Promise<T> { return firstValueFrom(this.http.patch<T>(environment.apiUrl + path, value)); }
  delete<T>(path: string): Promise<T> { return firstValueFrom(this.http.delete<T>(environment.apiUrl + path)); }
  blob(path: string): Promise<Blob> { return firstValueFrom(this.http.get(environment.apiUrl + path, { responseType: 'blob' })); }
}
