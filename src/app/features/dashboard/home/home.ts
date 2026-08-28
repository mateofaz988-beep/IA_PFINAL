import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

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
  /** Muestra fotográfica del catálogo — no es un listado completo de los 196 modelos. */
  readonly catalogSample: CatalogSample[] = [
    { file: 'bmw-m3.jpg', model: 'BMW M3', body: 'Coupé' },
    { file: 'toyota-corolla.jpg', model: 'Toyota Corolla', body: 'Sedán' },
    { file: 'ferrari-458-italia.jpg', model: 'Ferrari 458 Italia', body: 'Coupé' },
    { file: 'lamborghini-aventador.jpg', model: 'Lamborghini Aventador', body: 'Coupé' },
    { file: 'dodge-charger-srt8.jpg', model: 'Dodge Charger SRT8', body: 'Sedán' },
    { file: 'volkswagen-beetle.jpg', model: 'Volkswagen Beetle', body: 'Hatchback' },
    { file: 'hummer-h3t.jpg', model: 'Hummer H3T', body: 'Pickup' },
    { file: 'bugatti-veyron.jpg', model: 'Bugatti Veyron', body: 'Coupé' },
    { file: 'fisker-karma.jpg', model: 'Fisker Karma', body: 'Sedán' },
    { file: 'honda-odyssey.jpg', model: 'Honda Odyssey', body: 'Minivan' },
  ];
}
