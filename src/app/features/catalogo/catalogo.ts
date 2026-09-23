import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VehiculosService } from '../../core/services/vehiculos.service';
import { Vehiculo } from '../../core/models/vehiculo.model';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './catalogo.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Catalogo {
  private readonly vehiculosService = inject(VehiculosService);

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly vehiculos = signal<Vehiculo[]>([]);

  // Filtros
  readonly filtroMarca = signal('');
  readonly filtroCategoria = signal('');
  readonly filtroTipo = signal('');
  readonly filtroPrecioMax = signal<number | null>(null);
  readonly ordenamiento = signal<'precio_asc' | 'precio_desc' | 'anio_desc' | 'marca_asc'>('anio_desc');

  // Computados
  readonly marcasDisponibles = computed(() => {
    const marcas = new Set(this.vehiculos().map((v) => v.marca));
    return Array.from(marcas).sort();
  });

  readonly vehiculosFiltrados = computed(() => {
    let resultado = this.vehiculos().filter((v) => v.disponibilidad === 'disponible');

    const marca = this.filtroMarca();
    if (marca) {
      resultado = resultado.filter((v) => v.marca === marca);
    }

    const categoria = this.filtroCategoria();
    if (categoria) {
      resultado = resultado.filter((v) => v.categoria === categoria);
    }

    const tipo = this.filtroTipo();
    if (tipo) {
      resultado = resultado.filter((v) => v.tipo === tipo);
    }

    const precioMax = this.filtroPrecioMax();
    if (precioMax) {
      resultado = resultado.filter((v) => v.precio <= precioMax);
    }

    // Ordenamiento
    const orden = this.ordenamiento();
    resultado.sort((a, b) => {
      switch (orden) {
        case 'precio_asc':
          return a.precio - b.precio;
        case 'precio_desc':
          return b.precio - a.precio;
        case 'anio_desc':
          return b.anio - a.anio;
        case 'marca_asc':
          return a.marca.localeCompare(b.marca);
        default:
          return 0;
      }
    });

    return resultado;
  });

  readonly totalResultados = computed(() => this.vehiculosFiltrados().length);
  readonly vehiculosDestacados = computed(() => 
    this.vehiculos().filter((v) => v.destacado && v.disponibilidad === 'disponible').slice(0, 3)
  );

  constructor() {
    this.cargarVehiculos();
  }

  private async cargarVehiculos(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const vehiculos = await this.vehiculosService.listarDisponiblesAsync();
      this.vehiculos.set(vehiculos);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudieron cargar los vehículos.');
    } finally {
      this.cargando.set(false);
    }
  }

  limpiarFiltros(): void {
    this.filtroMarca.set('');
    this.filtroCategoria.set('');
    this.filtroTipo.set('');
    this.filtroPrecioMax.set(null);
  }

  formatoPrecio(vehiculo: Vehiculo): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: vehiculo.moneda,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(vehiculo.precio);
  }

  tieneDescuento(vehiculo: Vehiculo): boolean {
    return !!vehiculo.precioAnterior && vehiculo.precioAnterior > vehiculo.precio;
  }

  calcularDescuento(vehiculo: Vehiculo): number {
    if (!vehiculo.precioAnterior) return 0;
    return Math.round(((vehiculo.precioAnterior - vehiculo.precio) / vehiculo.precioAnterior) * 100);
  }
}
