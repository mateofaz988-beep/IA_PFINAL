import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { AreasService } from '../../../../core/services/areas.service';
import { TurnosService } from '../../../../core/services/turnos.service';
import { EstadoTurno, Turno } from '../../../../core/models/turno.model';

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
  readonly procesando = signal<string | null>(null);
  readonly error = signal<string | null>(null);

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

  readonly estadisticas = computed(() => {
    const todos = this.turnos();
    return {
      total: todos.length,
      pendientes: todos.filter((t) => t.estado === 'pendiente').length,
      enEspera: todos.filter((t) => t.estado === 'en_espera').length,
      enAtencion: todos.filter((t) => t.estado === 'en_atencion').length,
      atendidos: todos.filter((t) => t.estado === 'atendido').length,
      cancelados: todos.filter((t) => t.estado === 'cancelado').length,
    };
  });

  readonly turnosNuevos = computed(() => {
    const ahora = new Date();
    const hace5Min = new Date(ahora.getTime() - 5 * 60 * 1000);
    return this.turnos().filter((t) => {
      const creado = t.creadoEn.toDate();
      return creado >= hace5Min && t.estado === 'en_espera';
    }).length;
  });

  esTurnoNuevo(turno: Turno): boolean {
    const hace5Min = new Date(Date.now() - 5 * 60 * 1000);
    return turno.creadoEn.toDate() >= hace5Min && turno.estado === 'en_espera';
  }

  nombreArea(areaId: string): string {
    return this.areas().find((a) => a.id === areaId)?.nombre ?? areaId;
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

  puedeAtender(turno: Turno): boolean {
    return turno.estado === 'en_espera';
  }

  puedeFinalizar(turno: Turno): boolean {
    return turno.estado === 'en_atencion';
  }

  puedeCancelar(turno: Turno): boolean {
    return turno.estado === 'pendiente' || turno.estado === 'en_espera' || turno.estado === 'en_atencion';
  }

  async atenderTurno(turnoId: string): Promise<void> {
    if (!confirm('¿Cambiar estado a "En Atención"?')) return;

    this.procesando.set(turnoId);
    this.error.set(null);
    try {
      // Llamar al método apropiado del servicio
      await this.turnosService.llamarSiguiente(this.turnos().find((t) => t.id === turnoId)?.moduloId || '');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo cambiar el estado.');
    } finally {
      this.procesando.set(null);
    }
  }

  async finalizarTurno(turnoId: string): Promise<void> {
    if (!confirm('¿Marcar turno como "Atendido"?')) return;

    this.procesando.set(turnoId);
    this.error.set(null);
    try {
      await this.turnosService.finalizarAtencion(turnoId);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo finalizar el turno.');
    } finally {
      this.procesando.set(null);
    }
  }

  async cancelarTurno(turnoId: string): Promise<void> {
    if (!confirm('¿Cancelar este turno?')) return;

    this.procesando.set(turnoId);
    this.error.set(null);
    try {
      await this.turnosService.cancelar(turnoId);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo cancelar el turno.');
    } finally {
      this.procesando.set(null);
    }
  }

  obtenerHoraEstimada(turno: Turno): string {
    const desde = turno.estimacion.desde.toDate();
    const hasta = turno.estimacion.hasta.toDate();
    const desdeStr = desde.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const hastaStr = hasta.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    return `${desdeStr} - ${hastaStr}`;
  }
}
