import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { AreasService } from '../../../../core/services/areas.service';
import { TurnosService } from '../../../../core/services/turnos.service';
import { UsuariosService } from '../../../../core/services/usuarios.service';
import { MUESTRA_MINIMA_CONFIABLE, calcularEstadisticas } from '../../../../core/utils/estadisticas.util';

@Component({
  selector: 'app-estadisticas-admin',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './estadisticas-admin.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstadisticasAdmin {
  private readonly turnosService = inject(TurnosService);
  private readonly areasService = inject(AreasService);
  private readonly usuariosService = inject(UsuariosService);

  private readonly turnos = toSignal(this.turnosService.turnosRecientes(1000), { initialValue: [] });
  private readonly areas = toSignal(this.areasService.listar(), { initialValue: [] });
  private readonly usuarios = toSignal(this.usuariosService.listarTodos(), { initialValue: [] });

  readonly stats = computed(() => calcularEstadisticas(this.turnos()));

  /** Positivo: se espera más de lo prometido. Negativo: se espera menos. Es la métrica más honesta del sistema. */
  readonly deltaEsperaMin = computed(() => {
    const s = this.stats();
    return s.esperaPromedioRealMin !== null && s.esperaPromedioEstimadaMin !== null
      ? s.esperaPromedioRealMin - s.esperaPromedioEstimadaMin
      : null;
  });

  readonly maxPorArea = computed(() => Math.max(1, ...this.stats().porArea.map((c) => c.total)));
  readonly maxPorAsesor = computed(() => Math.max(1, ...this.stats().porAsesor.map((c) => c.total)));
  readonly maxPorDia = computed(() => Math.max(1, ...this.stats().porDia.map((c) => c.total)));
  readonly maxPorHora = computed(() => Math.max(1, ...this.stats().porHora.map((c) => c.total)));

  /** Un promedio sobre pocos turnos existe, pero no dice mucho todavía — la UI lo marca en vez de fingir certeza. */
  esPreliminar(n: number): boolean {
    return n > 0 && n < MUESTRA_MINIMA_CONFIABLE;
  }

  nombreArea(areaId: string): string {
    return this.areas().find((a) => a.id === areaId)?.nombre ?? areaId;
  }

  nombreAsesor(uid: string): string {
    return this.usuarios().find((u) => u.uid === uid)?.nombre ?? 'Sin asesor';
  }

  anchoPct(total: number, max: number): number {
    return max ? (total / max) * 100 : 0;
  }

  alturaPct(total: number, max: number): number {
    return max ? (total / max) * 100 : 0;
  }

  /** Piso visual mínimo para que una hora con actividad no desaparezca como una barra de 0px. */
  alturaBarraHora(total: number): number {
    const pct = this.alturaPct(total, this.maxPorHora());
    return total > 0 ? Math.max(pct, 4) : 0;
  }
}
