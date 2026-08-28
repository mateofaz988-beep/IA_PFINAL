from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Solicitud: lo que el profesor arma en el dashboard de Angular
# ---------------------------------------------------------------------------


class ExpectedExercise(BaseModel):
    """Un ejercicio del examen definido por el profesor."""

    exercise_id: int
    title: str = ""
    statement: str = Field(..., description="Enunciado del ejercicio, puede incluir LaTeX (p. ej. $$...$$).")
    expected_answer: str = Field(..., description="Respuesta / procedimiento esperado.")
    weight: float = Field(..., gt=0, description="Ponderación del ejercicio (puntaje máximo que aporta a la nota).")


class EvaluationRequest(BaseModel):
    """Payload enviado por el frontend al endpoint de evaluación."""

    problem_title: str = Field(..., description="Título del problema de análisis automotriz.")
    general_statement: str = Field(default="", description="Enunciado general / contexto del problema, admite LaTeX.")
    exercises: list[ExpectedExercise] = Field(..., min_length=1)
    images_base64: list[str] = Field(
        ..., min_length=1, description="Hojas de respuesta del estudiante, codificadas en base64 (data URL o raw)."
    )
    student_name: str = ""


# ---------------------------------------------------------------------------
# Respuesta: lo que retorna el agente de IA evaluador
# ---------------------------------------------------------------------------


class Step(BaseModel):
    """Un paso individual dentro de la evaluación de un ejercicio."""

    step_number: int
    description: str = Field(..., description="Qué se evaluó en este paso del procedimiento.")
    student_work: str = Field(default="", description="Lo que escribió el estudiante en este paso (transcrito por la IA).")
    is_correct: bool
    score: float
    max_score: float
    feedback: str


class ExerciseResult(BaseModel):
    """Resultado de la evaluación de un ejercicio."""

    exercise_id: int
    title: str = ""
    student_answer: str
    expected_answer: str
    procedure_score: float = Field(..., description="Puntaje obtenido por el procedimiento.")
    final_answer_score: float = Field(..., description="Puntaje obtenido por la respuesta final.")
    score: float = Field(..., description="Puntaje total del ejercicio (procedimiento + respuesta final).")
    max_score: float
    steps: list[Step] = []
    feedback: str = ""


class EvaluationResult(BaseModel):
    """Resultado completo devuelto por el agente evaluador."""

    total_score: float
    max_score: float
    general_feedback: str
    exercises: list[ExerciseResult]
