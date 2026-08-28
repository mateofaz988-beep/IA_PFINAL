import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EvaluationStateService } from '../../../core/services/evaluation-state.service';
import { LatexDirective } from '../../../shared/directives/latex.directive';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [RouterLink, LatexDirective],
  templateUrl: './results.html',
})
export class Results {
  private readonly evaluationState = inject(EvaluationStateService);
  private readonly router = inject(Router);

  readonly result = this.evaluationState.result;
  readonly request = this.evaluationState.request;

  readonly scorePercentage = computed(() => {
    const result = this.result();
    if (!result || result.max_score === 0) {
      return 0;
    }
    return Math.round((result.total_score / result.max_score) * 100);
  });

  constructor() {
    if (!this.result()) {
      this.router.navigateByUrl('/dashboard');
    }
  }

  scoreColorClass(scorePct: number): string {
    if (scorePct >= 80) return 'text-emerald-600';
    if (scorePct >= 60) return 'text-amber-600';
    return 'text-red-600';
  }

  exercisePercentage(score: number, maxScore: number): number {
    return maxScore === 0 ? 0 : Math.round((score / maxScore) * 100);
  }

  newEvaluation(): void {
    this.evaluationState.clear();
    this.router.navigateByUrl('/dashboard');
  }
}
