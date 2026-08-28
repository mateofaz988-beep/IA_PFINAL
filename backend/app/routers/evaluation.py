from fastapi import APIRouter, Depends, HTTPException

from app.ai_evaluator import evaluate_submission
from app.auth import get_current_user
from app.models import EvaluationRequest, EvaluationResult

router = APIRouter(prefix="/api", tags=["evaluation"])


@router.post("/evaluate", response_model=EvaluationResult)
async def evaluate(
    payload: EvaluationRequest,
    current_user: dict = Depends(get_current_user),
) -> EvaluationResult:
    """Recibe el enunciado, las respuestas esperadas y las imágenes del
    estudiante, y retorna la evaluación generada por el agente de IA."""

    try:
        return evaluate_submission(payload)
    except Exception as exc:  # noqa: BLE001 - se traduce cualquier error del agente a 502
        raise HTTPException(
            status_code=502,
            detail=f"El agente de IA evaluador no pudo procesar la solicitud: {exc}",
        ) from exc
