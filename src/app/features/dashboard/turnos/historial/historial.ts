import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { TurnosService } from '../../../../core/services/turnos.service';

@Component({
  selector: 'app-historial-turnos',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './historial.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistorialTurnos {
  private readonly turnosService = inject(TurnosService);

  readonly turnos = toSignal(this.turnosService.misTurnos(), { initialValue: [] });

  claseEstado(estado: string): string {
    switch (estado) {
      case 'en_espera':
        return 'text-signal-amber border-signal-amber/40';
      case 'en_atencion':
        return 'text-verdigris border-verdigris/40';
      case 'cancelado':
        return 'text-rust border-rust/40';
      default:
        return 'text-steel border-steel/30';
    }
  }
}
