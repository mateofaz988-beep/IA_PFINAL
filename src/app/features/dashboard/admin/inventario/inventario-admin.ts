import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { VehiculosService } from '../../../../core/services/vehiculos.service';
import {
  CategoriaVehiculo,
  TipoVehiculo,
  DisponibilidadVehiculo,
  FiltrosVehiculo,
} from '../../../../core/models/vehiculo.model';

@Component({
  selector: 'app-inventario-admin',
  standalone: true,
  imports: [RouterLink, NgClass],
  templateUrl: './inventario-admin.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventarioAdmin {
  private readonly vehiculosService = inject(VehiculosService);

  // Filtros
  readonly busqueda = signal('');
  readonly categoriaFiltro = signal<CategoriaVehiculo | ''>('');
  readonly tipoFiltro = signal<TipoVehiculo | ''>('');
  readonly disponibilidadFiltro = signal<DisponibilidadVehiculo | ''>('');
  readonly destacadoFiltro = signal<boolean | null>(null);

  // Datos
  private readonly vehiculosTodos = toSignal(this.vehiculosService.listar(), { initialValue: [] });

  readonly vehiculos = computed(() => {
    const filtros: FiltrosVehiculo = {};

    const busqueda = this.busqueda().trim();
    if (busqueda) filtros.busqueda = busqueda;

    const categoria = this.categoriaFiltro();
    if (categoria) filtros.categoria = categoria;

    const tipo = this.tipoFiltro();
    if (tipo) filtros.tipo = tipo;

    const disponibilidad = this.disponibilidadFiltro();
    if (disponibilidad) filtros.disponibilidad = disponibilidad;

    const destacado = this.destacadoFiltro();
    if (destacado !== null) filtros.destacado = destacado;

    // Aplicar filtros en memoria
    let vehiculos = this.vehiculosTodos();

    if (filtros.busqueda) {
      const busq = filtros.busqueda.toLowerCase();
      vehiculos = vehiculos.filter(
        (v) =>
          v.marca.toLowerCase().includes(busq) ||
          v.modelo.toLowerCase().includes(busq) ||
          v.version.toLowerCase().includes(busq) ||
          v.descripcion.toLowerCase().includes(busq),
      );
    }

    if (filtros.categoria) {
      vehiculos = vehiculos.filter((v) => v.categoria === filtros.categoria);
    }

    if (filtros.tipo) {
      vehiculos = vehiculos.filter((v) => v.tipo === filtros.tipo);
    }

    if (filtros.disponibilidad) {
      vehiculos = vehiculos.filter((v) => v.disponibilidad === filtros.disponibilidad);
    }

    if (filtros.destacado !== undefined) {
      vehiculos = vehiculos.filter((v) => v.destacado === filtros.destacado);
    }

    return vehiculos;
  });

  readonly estadisticas = computed(() => {
    const todos = this.vehiculosTodos();
    return {
      total: todos.length,
      disponibles: todos.filter((v) => v.disponibilidad === 'disponible').length,
      reservados: todos.filter((v) => v.disponibilidad === 'reservado').length,
      vendidos: todos.filter((v) => v.disponibilidad === 'vendido').length,
      destacados: todos.filter((v) => v.destacado).length,
    };
  });

  readonly procesando = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.categoriaFiltro.set('');
    this.tipoFiltro.set('');
    this.disponibilidadFiltro.set('');
    this.destacadoFiltro.set(null);
  }

  async toggleDestacado(vehiculoId: string, destacadoActual: boolean): Promise<void> {
    this.procesando.set(vehiculoId);
    this.error.set(null);
    try {
      await this.vehiculosService.actualizar(vehiculoId, { destacado: !destacadoActual });
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo actualizar el vehículo.');
    } finally {
      this.procesando.set(null);
    }
  }

  async cambiarDisponibilidad(vehiculoId: string, disponibilidad: DisponibilidadVehiculo): Promise<void> {
    this.procesando.set(vehiculoId);
    this.error.set(null);
    try {
      await this.vehiculosService.cambiarDisponibilidad(vehiculoId, disponibilidad);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo cambiar la disponibilidad.');
    } finally {
      this.procesando.set(null);
    }
  }

  async eliminar(vehiculoId: string, nombre: string): Promise<void> {
    if (!confirm(`¿Eliminar "${nombre}"? Esta acción marcará el vehículo como no disponible.`)) {
      return;
    }
    this.procesando.set(vehiculoId);
    this.error.set(null);
    try {
      await this.vehiculosService.eliminar(vehiculoId);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo eliminar el vehículo.');
    } finally {
      this.procesando.set(null);
    }
  }

  getDisponibilidadClass(disponibilidad: DisponibilidadVehiculo): string {
    switch (disponibilidad) {
      case 'disponible':
        return 'text-verdigris border-verdigris/40';
      case 'reservado':
        return 'text-signal-amber border-signal-amber/40';
      case 'vendido':
        return 'text-steel border-steel/40';
      case 'en_preparacion':
        return 'text-blue-600 border-blue-600/40';
      case 'mantenimiento':
        return 'text-orange-600 border-orange-600/40';
      default:
        return 'text-rust border-rust/40';
    }
  }

  getDisponibilidadLabel(disponibilidad: DisponibilidadVehiculo): string {
    const labels: Record<DisponibilidadVehiculo, string> = {
      disponible: 'Disponible',
      reservado: 'Reservado',
      vendido: 'Vendido',
      en_preparacion: 'En Preparación',
      mantenimiento: 'Mantenimiento',
      no_disponible: 'No Disponible',
    };
    return labels[disponibilidad];
  }
}
