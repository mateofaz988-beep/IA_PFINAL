import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { TurnosService } from '../../../../core/services/turnos.service';
import { AreasService } from '../../../../core/services/areas.service';
import { EstadoTurno } from '../../../../core/models/turno.model';

@Component({
  selector: 'app-historial-turnos',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './historial.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistorialTurnos {
  private readonly turnosService = inject(TurnosService);
  private readonly areasService = inject(AreasService);

  readonly turnos = toSignal(this.turnosService.misTurnos(), { initialValue: [] });
  readonly areas = toSignal(this.areasService.listar(), { initialValue: [] });

  readonly estadisticas = computed(() => {
    const todos = this.turnos();
    return {
      total: todos.length,
      activos: todos.filter((t) => t.estado === 'en_espera' || t.estado === 'en_atencion').length,
      pendientes: todos.filter((t) => t.estado === 'pendiente').length,
      enEspera: todos.filter((t) => t.estado === 'en_espera').length,
      enAtencion: todos.filter((t) => t.estado === 'en_atencion').length,
      atendidos: todos.filter((t) => t.estado === 'atendido').length,
      cancelados: todos.filter((t) => t.estado === 'cancelado').length,
    };
  });

  nombreArea(areaId: string): string {
    return this.areas().find((a) => a.id === areaId)?.nombre ?? 'Área';
  }

  claseEstado(estado: string): string {
    switch (estado) {
      case 'pendiente':
        return 'text-blue-600 border-blue-600/40 bg-blue-50';
      case 'en_espera':
        return 'text-signal-amber border-signal-amber/40 bg-signal-amber/10';
      case 'en_atencion':
        return 'text-verdigris border-verdigris/40 bg-verdigris/10';
      case 'atendido':
        return 'text-steel border-steel/40 bg-steel/10';
      case 'cancelado':
        return 'text-rust border-rust/40 bg-rust/10';
      default:
        return 'text-steel border-steel/30';
    }
  }

  labelEstado(estado: EstadoTurno): string {
    const labels: Record<EstadoTurno, string> = {
      pendiente: 'Pendiente',
      en_espera: 'En Espera',
      en_atencion: 'En Atención',
      atendido: 'Atendido',
      cancelado: 'Cancelado',
    };
    return labels[estado];
  }

  iconoEstado(estado: EstadoTurno): string {
    const iconos: Record<EstadoTurno, string> = {
      pendiente: '⏳',
      en_espera: '🕐',
      en_atencion: '✨',
      atendido: '✅',
      cancelado: '❌',
    };
    return iconos[estado];
  }

  obtenerHoraEstimada(turno: any): string {
    const desde = turno.estimacion.desde.toDate();
    const hasta = turno.estimacion.hasta.toDate();
    const desdeStr = desde.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const hastaStr = hasta.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    return `${desdeStr} - ${hastaStr}`;
  }
}
