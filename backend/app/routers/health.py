import logging
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Response, status
from pydantic import BaseModel
from sqlalchemy import Engine, text
from sqlalchemy.exc import SQLAlchemyError

from app.database import get_engine

router = APIRouter(prefix="/api", tags=["health"])
logger = logging.getLogger(__name__)


class HealthResponse(BaseModel):
    status: Literal["ok", "error"]
    database: Literal["connected", "unavailable"]


@router.get("/health", response_model=HealthResponse, responses={503: {"model": HealthResponse}})
def health(response: Response, engine: Annotated[Engine, Depends(get_engine)]) -> HealthResponse:
    """Disponibilidad real de MySQL; nunca expone credenciales ni excepciones SQL."""
    response.headers["Cache-Control"] = "no-store"
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1")).scalar_one()
    except SQLAlchemyError as error:
        # No imprimir la excepción: puede contener URL, usuario o parámetros SQL.
        logger.warning("MySQL no disponible en health (%s).", type(error).__name__)
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return HealthResponse(status="error", database="unavailable")
    return HealthResponse(status="ok", database="connected")
