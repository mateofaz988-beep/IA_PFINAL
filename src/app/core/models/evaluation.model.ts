// Estos tipos reflejan uno a uno los modelos Pydantic del backend
// (ver backend/app/models.py) para que el payload viaje sin transformaciones.

export interface ExpectedExercise {
  exercise_id: number;
  title: string;
  statement: string;
  expected_answer: string;
  weight: number;
}

export interface EvaluationRequest {
  problem_title: string;
  general_statement: string;
  exercises: ExpectedExercise[];
  images_base64: string[];
  student_name: string;
}

export interface Step {
  step_number: number;
  description: string;
  student_work: string;
  is_correct: boolean;
  score: number;
  max_score: number;
  feedback: string;
}

export interface ExerciseResult {
  exercise_id: number;
  title: string;
  student_answer: string;
  expected_answer: string;
  procedure_score: number;
  final_answer_score: number;
  score: number;
  max_score: number;
  steps: Step[];
  feedback: string;
}

export interface EvaluationResult {
  total_score: number;
  max_score: number;
  general_feedback: string;
  exercises: ExerciseResult[];
}
