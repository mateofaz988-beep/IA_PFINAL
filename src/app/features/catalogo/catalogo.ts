import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CatalogoService } from '../../core/services/catalogo.service';
import { Vehiculo } from '../../core/models/vehiculo.model';
import { FILTROS_INICIALES, FiltrosCatalogo, OrdenCatalogo, etiquetaCatalogo, filtrarYOrdenarCatalogo } from '../../core/utils/catalogo.util';

type CampoSelect = Exclude<keyof FiltrosCatalogo, 'busqueda' | 'precioMax'>;

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Catalogo {
  private readonly catalogoService = inject(CatalogoService);
  readonly estado = signal<'loading' | 'success' | 'error'>('loading');
  readonly vehiculos = signal<Vehiculo[]>([]);
  readonly origen = signal<'mysql'>('mysql');
  readonly filtros = signal<FiltrosCatalogo>({ ...FILTROS_INICIALES });
  readonly ordenamiento = signal<OrdenCatalogo>('recientes');
  readonly filtrosAbiertos = signal(false);
  readonly imagenesFallidas = signal<ReadonlySet<string>>(new Set());
  readonly skeletons = [1, 2, 3, 4, 5, 6];
  readonly etiqueta = etiquetaCatalogo;
  readonly hayFiltros = computed(() => Object.entries(this.filtros()).some(([, valor]) => valor !== '' && valor !== null));
  readonly mostrarAvisoDemo = computed(() => this.vehiculos().some((v) => v.esDemo));
  readonly vehiculosFiltrados = computed(() => filtrarYOrdenarCatalogo(this.vehiculos(), this.filtros(), this.ordenamiento()));

  readonly opcionesFiltros = computed(() => {
    const campos: { campo: CampoSelect; etiqueta: string }[] = [
      { campo: 'marca', etiqueta: 'Marca' }, { campo: 'categoria', etiqueta: 'Categoría' },
      { campo: 'combustible', etiqueta: 'Combustible' }, { campo: 'transmision', etiqueta: 'Transmisión' },
      { campo: 'anio', etiqueta: 'Año' }, { campo: 'disponibilidad', etiqueta: 'Estado' },
    ];
    return campos.map((filtro) => ({
      ...filtro,
      opciones: [...new Set(this.vehiculos().map((v) => String(v[filtro.campo])))]
        .sort((a, b) => filtro.campo === 'anio' ? Number(b) - Number(a) : a.localeCompare(b, 'es'))
        .map((valor) => ({ valor, etiqueta: etiquetaCatalogo(valor) })),
    }));
  });

  constructor() { void this.cargarVehiculos(); }

  async cargarVehiculos(): Promise<void> {
    this.estado.set('loading');
    try {
      const resultado = await this.catalogoService.listar();
      this.vehiculos.set(resultado.vehiculos);
      this.origen.set(resultado.origen);
      this.imagenesFallidas.set(new Set());
      this.estado.set('success');
    } catch {
      this.vehiculos.set([]);
      this.estado.set('error');
    }
  }

  actualizarFiltro<K extends keyof FiltrosCatalogo>(campo: K, valor: FiltrosCatalogo[K]): void {
    this.filtros.update((actual) => ({ ...actual, [campo]: valor }));
  }

  actualizarPrecio(valor: number | null): void {
    this.actualizarFiltro('precioMax', valor === null || !Number.isFinite(valor) ? null : Math.max(0, valor));
  }

  limpiarFiltros(): void { this.filtros.set({ ...FILTROS_INICIALES }); }

  imagenFallida(id: string): void {
    this.imagenesFallidas.update((actual) => new Set([...actual, id]));
  }

  formatoPrecio(vehiculo: Vehiculo): string {
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: vehiculo.moneda, maximumFractionDigits: 0 }).format(vehiculo.precio);
  }

  formatoKilometraje(valor: number): string { return new Intl.NumberFormat('es-EC').format(valor); }
}