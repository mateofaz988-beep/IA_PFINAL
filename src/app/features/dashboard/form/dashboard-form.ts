import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { EvaluationStateService } from '../../../core/services/evaluation-state.service';
import { EvaluationService } from '../../../core/services/evaluation.service';
import { EvaluationRequest } from '../../../core/models/evaluation.model';
import { fileToBase64 } from '../../../core/utils/file-to-base64.util';
import { LatexDirective } from '../../../shared/directives/latex.directive';

type ExerciseForm = FormGroup<{
  title: FormControl<string>;
  statement: FormControl<string>;
  expected_answer: FormControl<string>;
  weight: FormControl<number>;
}>;

interface UploadedImage {
  name: string;
  base64: string;
}

@Component({
  selector: 'app-dashboard-form',
  standalone: true,
  imports: [ReactiveFormsModule, LatexDirective],
  templateUrl: './dashboard-form.html',
})
export class DashboardForm {
  private readonly fb = inject(FormBuilder);
  private readonly evaluationService = inject(EvaluationService);
  private readonly evaluationState = inject(EvaluationStateService);
  private readonly router = inject(Router);

  readonly images = signal<UploadedImage[]>([]);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    problem_title: ['', Validators.required],
    student_name: [''],
    general_statement: ['', Validators.required],
    exercises: this.fb.array<ExerciseForm>([]),
  });

  get exercises(): FormArray<ExerciseForm> {
    return this.form.controls.exercises;
  }

  constructor() {
    this.addExercise();
  }

  private createExerciseGroup(): ExerciseForm {
    return this.fb.nonNullable.group({
      title: ['', Validators.required],
      statement: ['', Validators.required],
      expected_answer: ['', Validators.required],
      weight: [10, [Validators.required, Validators.min(0.01)]],
    });
  }

  addExercise(): void {
    this.exercises.push(this.createExerciseGroup());
  }

  removeExercise(index: number): void {
    if (this.exercises.length > 1) {
      this.exercises.removeAt(index);
    }
  }

  get totalWeight(): number {
    return this.exercises.controls.reduce((sum, group) => sum + (group.controls.weight.value || 0), 0);
  }

  async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }

    const files = Array.from(input.files);
    const encoded = await Promise.all(
      files.map(async (file) => ({ name: file.name, base64: await fileToBase64(file) })),
    );
    this.images.update((prev) => [...prev, ...encoded]);
    input.value = '';
  }

  removeImage(index: number): void {
    this.images.update((prev) => prev.filter((_, i) => i !== index));
  }

  submit(): void {
    if (this.form.invalid || this.images().length === 0) {
      this.form.markAllAsTouched();
      if (this.images().length === 0) {
        this.errorMessage.set('Sube al menos una imagen de la hoja de respuestas del estudiante.');
      }
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const raw = this.form.getRawValue();
    const payload: EvaluationRequest = {
      problem_title: raw.problem_title,
      general_statement: raw.general_statement,
      student_name: raw.student_name,
      exercises: raw.exercises.map((exercise, index) => ({
        exercise_id: index + 1,
        title: exercise.title,
        statement: exercise.statement,
        expected_answer: exercise.expected_answer,
        weight: exercise.weight,
      })),
      images_base64: this.images().map((image) => image.base64),
    };

    this.evaluationService.evaluate(payload).subscribe({
      next: (result) => {
        this.isSubmitting.set(false);
        this.evaluationState.setResult(result, payload);
        this.router.navigate(['/dashboard/resultados']);
      },
      error: (error: unknown) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(this.extractErrorMessage(error));
      },
    });
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const detail = (error.error as { detail?: string } | null)?.detail;
      return detail ?? 'No se pudo evaluar la solución. Verifica que el backend esté disponible.';
    }
    return 'No se pudo evaluar la solución. Intenta nuevamente.';
  }
}
