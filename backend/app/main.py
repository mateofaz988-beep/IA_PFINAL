from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import evaluation

app = FastAPI(
    title="API Evaluador IA - Análisis Automotriz",
    description="Expone el agente de IA evaluador de soluciones matemáticas manuscritas como API REST.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(evaluation.router)


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok"}
