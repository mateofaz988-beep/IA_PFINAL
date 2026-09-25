import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogoService } from '../../core/services/catalogo.service';
import { Vehiculo } from '../../core/models/vehiculo.model';
import { ApiService } from '../../core/services/api.service';
import { apiErrorMessage } from '../../core/utils/api-error.util';

@Component({
  selector: 'app-vehiculo-detalle',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './vehiculo-detalle.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehiculoDetalle {
  private readonly api = inject(ApiService);
  readonly actionMessage = signal('');
  readonly actionBusy = signal(false);
  async favorito(): Promise<void> {
    if (this.actionBusy() || !this.vehiculo()) return;
    this.actionBusy.set(true);
    try { await this.api.post(`/favoritos/${this.vehiculo()!.id}`); this.actionMessage.set('Vehículo guardado en tus favoritos.'); }
    catch (error) { this.actionMessage.set(apiErrorMessage(error)); }
    finally { this.actionBusy.set(false); }
  }
  private readonly route = inject(ActivatedRoute);
  private readonly parametros = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  private readonly catalogoService = inject(CatalogoService);
  private cargaActual = 0;

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
    return [...new Set(urls)];
  });

  constructor() {
    effect(() => {
      const id = this.parametros().get('id');
      if (id) {
        this.cargarVehiculo(id);
      }
    });
  }

  private async cargarVehiculo(id: string): Promise<void> {
    const carga = ++this.cargaActual;
    this.cargando.set(true);
    this.error.set(null);
    this.vehiculo.set(null);
    try {
      const vehiculo = await this.catalogoService.obtenerPorId(id);
      if (carga !== this.cargaActual) return;
      if (!vehiculo) {
        this.error.set('Vehículo no encontrado.');
        return;
      }
      this.vehiculo.set(vehiculo);
      this.imagenSeleccionada.set(vehiculo.imagenPrincipal || '');
    } catch (err) {
      console.error('[Catálogo] No se pudo cargar el detalle.', err);
      if (carga === this.cargaActual) this.error.set('No pudimos cargar el vehículo. Inténtalo nuevamente en unos momentos.');
    } finally {
      if (carga === this.cargaActual) this.cargando.set(false);
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
