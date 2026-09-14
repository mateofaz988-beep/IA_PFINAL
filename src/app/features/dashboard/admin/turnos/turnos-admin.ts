import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { AreasService } from '../../../../core/services/areas.service';
import { TurnosService } from '../../../../core/services/turnos.service';
import { EstadoTurno } from '../../../../core/models/turno.model';

@Component({
  selector: 'app-turnos-admin',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './turnos-admin.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TurnosAdmin {
  private readonly turnosService = inject(TurnosService);
  private readonly areasService = inject(AreasService);

  readonly turnos = toSignal(this.turnosService.turnosRecientes(), { initialValue: [] });
  readonly areas = toSignal(this.areasService.listar(), { initialValue: [] });

  readonly busqueda = signal('');
  readonly areaId = signal<string>('');
  readonly estado = signal<EstadoTurno | ''>('');

  readonly filtrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const areaId = this.areaId();
    const estado = this.estado();

    return this.turnos().filter((t) => {
      if (areaId && t.areaId !== areaId) return false;
      if (estado && t.estado !== estado) return false;
      if (texto && !t.codigo.toLowerCase().includes(texto) && !t.clienteNombre.toLowerCase().includes(texto)) {
        return false;
      }
      return true;
    });
  });

  nombreArea(areaId: string): string {
    return this.areas().find((a) => a.id === areaId)?.nombre ?? areaId;
  }

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
