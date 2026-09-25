import { Injectable, inject } from '@angular/core';
import { Vehiculo } from '../models/vehiculo.model';
import { VehiculosService } from './vehiculos.service';

export interface ResultadoCatalogo { vehiculos: Vehiculo[]; origen: 'mysql'; }
export function esVisibleEnCatalogo(v: Vehiculo): boolean {
  return ['disponible', 'reservado', 'vendido'].includes(v.disponibilidad) && Number.isInteger(v.anio) && v.anio >= 1886 && v.anio <= 2012;
}
@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly inventario = inject(VehiculosService);
  async listar(): Promise<ResultadoCatalogo> {
    return { vehiculos: (await this.conTiempoLimite(this.inventario.listarPublicosAsync())).filter(esVisibleEnCatalogo), origen: 'mysql' };
  }
  async obtenerPorId(id: string): Promise<Vehiculo | null> {
    if (!/^\d+$/.test(id)) return null;
    const v = await this.conTiempoLimite(this.inventario.obtenerPublicoPorId(id));
    return v && esVisibleEnCatalogo(v) ? v : null;
  }
  private async conTiempoLimite<T>(operacion: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try { return await Promise.race([operacion, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Tiempo de espera de catálogo agotado.')), 8000); })]); }
    finally { clearTimeout(timer); }
  }
}
