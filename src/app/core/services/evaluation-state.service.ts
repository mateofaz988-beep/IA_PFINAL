import { Injectable, signal } from '@angular/core';
import { EvaluationRequest, EvaluationResult } from '../models/evaluation.model';

/**
 * Guarda en memoria el último resultado de evaluación para que la vista de
 * resultados lo pueda leer tras la navegación, sin volver a llamar al backend.
 */
@Injectable({ providedIn: 'root' })
export class EvaluationStateService {
  readonly result = signal<EvaluationResult | null>(null);
  readonly request = signal<EvaluationRequest | null>(null);

  setResult(result: EvaluationResult, request: EvaluationRequest): void {
    this.result.set(result);
    this.request.set(request);
  }

  clear(): void {
    this.result.set(null);
    this.request.set(null);
  }
}
