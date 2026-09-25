from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import appointments, auth, evaluation, favorites, health, users, vehicles

app = FastAPI(
    title="AutoScan Motors API",
    description="API de AutoScan Motors. Migración gradual de servicios a MySQL.",
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
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(vehicles.router)
app.include_router(favorites.router)
app.include_router(appointments.router)
app.mount('/media/vehiculos', StaticFiles(directory=settings.storage_dir / 'vehiculos', check_dir=False), name='vehicle-images')


@app.exception_handler(RequestValidationError)
async def validation_error(request, error):
    # FastAPI incluye input por defecto: podría devolver contraseña o tarjeta.
    return JSONResponse(status_code=422, content={"detail": [
        {"loc": list(item['loc']), "msg": item['msg'], "type": item['type']}
        for item in error.errors()
    ]})


@app.exception_handler(SQLAlchemyError)
async def database_error(request, error):
    return JSONResponse(status_code=503, content={"detail": "No se pudo completar la operación en la base de datos."})
