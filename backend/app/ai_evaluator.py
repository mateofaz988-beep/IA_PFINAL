"""Punto de integración con el agente de IA evaluador ya existente.

Este proyecto asume que el equipo ya tiene un script en Python que recibe
imágenes en base64 + enunciados, y retorna un JSON estructurado con Pydantic
(total_score, max_score, general_feedback, exercises[...]).

Para conectar ese script real:
  1. Copia su código (o impórtalo como paquete) dentro de esta carpeta `app/`,
     por ejemplo en `app/evaluator_core.py`.
  2. Reemplaza el cuerpo de `evaluate_submission` de abajo por la llamada a
     tu función/clase real, adaptando sus modelos Pydantic a los definidos
     en `app/models.py` (o reutiliza los tuyos si ya coinciden).
  3. Si tu script usa una API externa (OpenAI, Vertex, Anthropic, etc.),
     mueve las credenciales a variables de entorno (ver `app/config.py`).

Mientras tanto, esta función retorna una evaluación simulada para que el
resto del stack (frontend, auth, endpoint) se pueda desarrollar y probar
de punta a punta sin depender del modelo real.
"""

from app.models import EvaluationRequest, EvaluationResult, ExerciseResult, Step


def evaluate_submission(request: EvaluationRequest) -> EvaluationResult:
    """Evalúa las respuestas del estudiante para todos los ejercicios enviados.

    TODO: sustituir esta implementación de ejemplo por la llamada al agente
    de IA real (por ejemplo: `return evaluator_core.run(request)`).
    """

    exercises: list[ExerciseResult] = []

    for exercise in request.exercises:
        procedure_score = round(exercise.weight * 0.6, 2)
        final_answer_score = round(exercise.weight * 0.4, 2)

        steps = [
            Step(
                step_number=1,
                description="Planteamiento de las ecuaciones / fórmulas de análisis automotriz.",
                student_work="(pendiente de extraer de la imagen)",
                is_correct=True,
                score=round(procedure_score / 2, 2),
                max_score=round(exercise.weight * 0.3, 2),
                feedback="Placeholder: aquí el agente de IA describe si el planteamiento fue correcto.",
            ),
            Step(
                step_number=2,
                description="Desarrollo algebraico / numérico del procedimiento.",
                student_work="(pendiente de extraer de la imagen)",
                is_correct=True,
                score=round(procedure_score / 2, 2),
                max_score=round(exercise.weight * 0.3, 2),
                feedback="Placeholder: aquí el agente de IA describe la calidad del desarrollo.",
            ),
        ]

        exercises.append(
            ExerciseResult(
                exercise_id=exercise.exercise_id,
                title=exercise.title,
                student_answer="(respuesta extraída de la imagen por el agente de IA)",
                expected_answer=exercise.expected_answer,
                procedure_score=procedure_score,
                final_answer_score=final_answer_score,
                score=round(procedure_score + final_answer_score, 2),
                max_score=exercise.weight,
                steps=steps,
                feedback="Placeholder: retroalimentación específica de este ejercicio.",
            )
        )

    total_score = round(sum(e.score for e in exercises), 2)
    max_score = round(sum(e.max_score for e in exercises), 2)

    return EvaluationResult(
        total_score=total_score,
        max_score=max_score,
        general_feedback=(
            "Evaluación simulada: conecta app/ai_evaluator.py con el script real "
            "del agente de IA para obtener retroalimentación genuina."
        ),
        exercises=exercises,
    )
