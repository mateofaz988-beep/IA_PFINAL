import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, firstValueFrom, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Vehiculo, VehiculoInput, FiltrosVehiculo, DisponibilidadVehiculo } from '../models/vehiculo.model';
import { VehicleApi, fromApi, toApi } from '../models/vehicle-api.model';

@Injectable({ providedIn: 'root' })
export class VehiculosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/vehiculos`;
  async listarPublicosAsync(): Promise<Vehiculo[]> { return (await firstValueFrom(this.http.get<VehicleApi[]>(this.base))).map(fromApi); }
  async obtenerPublicoPorId(id: string): Promise<Vehiculo | null> {
    try { return fromApi(await firstValueFrom(this.http.get<VehicleApi>(`${this.base}/${id}`))); }
    catch (error) { if (error instanceof HttpErrorResponse && [404, 422].includes(error.status)) return null; throw error; }
  }
  listar(filtros?: FiltrosVehiculo): Observable<Vehiculo[]> {
    return this.http.get<VehicleApi[]>(`${this.base}/inventario`).pipe(map(data => this.filter(data.map(fromApi), filtros)));
  }
  listarDisponibles(filtros?: FiltrosVehiculo): Observable<Vehiculo[]> {
    return this.http.get<VehicleApi[]>(this.base).pipe(map(data => this.filter(data.map(fromApi), {...filtros, disponibilidad: 'disponible'})));
  }
  listarDisponiblesAsync(filtros?: FiltrosVehiculo): Promise<Vehiculo[]> { return firstValueFrom(this.listarDisponibles(filtros)); }
  listarDestacados(): Observable<Vehiculo[]> { return this.listarDisponibles({destacado: true}).pipe(map(data => data.slice(0, 6))); }
  async obtenerPorId(id: string): Promise<Vehiculo | null> { return fromApi(await firstValueFrom(this.http.get<VehicleApi>(`${this.base}/inventario/${id}`))); }
  async crear(input: VehiculoInput): Promise<string> { return String((await firstValueFrom(this.http.post<VehicleApi>(this.base, toApi(input)))).id); }
  async actualizar(id: string, input: Partial<VehiculoInput>): Promise<void> { await firstValueFrom(this.http.put(`${this.base}/${id}`, toApi(input))); }
  async cambiarDisponibilidad(id: string, estado: DisponibilidadVehiculo): Promise<void> { await firstValueFrom(this.http.patch(`${this.base}/${id}/estado`, {estado})); }
  async eliminar(id: string): Promise<void> { await firstValueFrom(this.http.delete(`${this.base}/${id}`)); }
  async eliminarFisicamente(id: string): Promise<void> { await this.eliminar(id); }
  async obtenerSimilares(id: string, limite = 4): Promise<Vehiculo[]> { const items = await this.listarPublicosAsync(); const current = items.find(v => v.id === id); return items.filter(v => v.id !== id && v.categoria === current?.categoria).slice(0, limite); }
  buscar(termino: string, filtros?: FiltrosVehiculo): Observable<Vehiculo[]> { return this.listar({...filtros, busqueda: termino}); }
  async sembrarEjemplos(): Promise<number> { throw new Error('El catálogo académico se carga mediante el script seed_vehicles del backend.'); }
  private filter(items: Vehiculo[], filters: FiltrosVehiculo = {}): Vehiculo[] {
    return items.filter(v => (!filters.disponibilidad || v.disponibilidad === filters.disponibilidad) && (!filters.marca || v.marca === filters.marca)
      && (!filters.categoria || v.categoria === filters.categoria) && (filters.destacado === undefined || v.destacado === filters.destacado)
      && (!filters.busqueda || `${v.marca} ${v.modelo}`.toLowerCase().includes(filters.busqueda.toLowerCase())));
  }
}
