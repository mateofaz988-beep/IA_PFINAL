import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { VehiculosService } from '../../core/services/vehiculos.service';
import { Vehiculo } from '../../core/models/vehiculo.model';

@Component({
  selector: 'app-vehiculo-detalle',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './vehiculo-detalle.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehiculoDetalle {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly vehiculosService = inject(VehiculosService);

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly vehiculo = signal<Vehiculo | null>(null);
  readonly imagenSeleccionada = signal<string>('');

  readonly galeria = computed(() => {
    const v = this.vehiculo();
    if (!v) return [];
    // Extraer URLs: imagenPrincipal es string, imagenes son ImagenVehiculo[]
    const urls: string[] = [];
    if (v.imagenPrincipal) {
      urls.push(v.imagenPrincipal);
    }
    if (v.imagenes && v.imagenes.length > 0) {
      urls.push(...v.imagenes.map(img => img.url));
    }
    return urls;
  });

  constructor() {
    effect(() => {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        this.cargarVehiculo(id);
      }
    });
  }

  private async cargarVehiculo(id: string): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const vehiculo = await this.vehiculosService.obtenerPorId(id);
      if (!vehiculo) {
        this.error.set('Vehículo no encontrado.');
        return;
      }
      this.vehiculo.set(vehiculo);
      this.imagenSeleccionada.set(vehiculo.imagenPrincipal || '');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo cargar el vehículo.');
    } finally {
      this.cargando.set(false);
    }
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

  seleccionarImagen(imagen: string): void {
    this.imagenSeleccionada.set(imagen);
  }

  contactar(): void {
    const v = this.vehiculo();
    if (!v) return;
    
    const mensaje = `Hola, estoy interesado en el ${v.marca} ${v.modelo} ${v.anio}`;
    const whatsapp = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(whatsapp, '_blank');
  }

  compartir(): void {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `${this.vehiculo()?.marca} ${this.vehiculo()?.modelo}`,
        url: url,
      });
    } else {
      navigator.clipboard.writeText(url);
      alert('Enlace copiado al portapapeles');
    }
  }
}
