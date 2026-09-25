import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EvaluationRequest, EvaluationResult } from '../models/evaluation.model';

@Injectable({ providedIn: 'root' })
export class EvaluationService {
  private readonly http = inject(HttpClient);

  evaluate(payload: EvaluationRequest): Observable<EvaluationResult> {
    return this.http.post<EvaluationResult>(`${environment.apiUrl}/evaluate`, payload);
  }
}
