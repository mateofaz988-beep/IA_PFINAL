import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AreasService } from '../../../core/services/areas.service';
import { UsuariosService } from '../../../core/services/usuarios.service';

interface CatalogSample {
  file: string;
  model: string;
  body: string;
}

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHome {
  private readonly usuariosService = inject(UsuariosService);
  private readonly areasService = inject(AreasService);

  readonly rol = this.usuariosService.rol;

  private readonly areasTodas = toSignal(this.areasService.listar(), { initialValue: [] });
  readonly areasActivas = computed(() => this.areasTodas().filter((a) => a.activa));

  /** Muestra fotográfica del catálogo del clasificador — no es un listado completo de los 196 modelos. */
  readonly catalogSample: CatalogSample[] = [
    { file: 'bmw-m3.jpg', model: 'BMW M3', body: 'Coupé' },
    { file: 'toyota-corolla.jpg', model: 'Toyota Corolla', body: 'Sedán' },
    { file: 'dodge-charger-srt8.jpg', model: 'Dodge Charger SRT8', body: 'Sedán' },
    { file: 'volkswagen-beetle.jpg', model: 'Volkswagen Beetle', body: 'Hatchback' },
    { file: 'hummer-h3t.jpg', model: 'Hummer H3T', body: 'Pickup' },
    { file: 'honda-odyssey.jpg', model: 'Honda Odyssey', body: 'Minivan' },
  ];
}
