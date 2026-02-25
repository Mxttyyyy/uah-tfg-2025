from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import logging

from analysis.runner import run_analysis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Definimos la app
app = FastAPI(
    title="TFG - Analizador Estático (Backend)",
    description="API para análisis estático de código",
    version="0.1.0",
)


# Modelo/Plantilla de la solicitud
class AnalyzeRequest(BaseModel):
    language: str
    code: str
    options: Optional[Dict[str, Any]] = None  # Campo para flags del analizador

# ----------------------------ENDPOINTS----------------------------

# Endpoint para comprobar si el backend está funcionando
@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


# Endpoint para analizar el código
@app.post("/analyze")
def analyze(request: AnalyzeRequest) -> Dict[str, Any]:

    logger.info(f"Petición recibida para lenguaje: {request.language}")

    # Validaciones
    if not request.code or not request.code.strip():
        raise HTTPException(status_code=400, detail="El campo 'code' está vacío.")

    # Llamamos al runner
    result = run_analysis(
        language=request.language,
        code=request.code,
        options=request.options,
    )

    # Comprobamos si hay un error
    if "error" in result and isinstance(result["error"], dict):
        status = int(result["error"].get("http_status", 500))
        logger.error(result["error"]["message"])
        return JSONResponse(status_code=status, content=result)

    logger.info("Ánalisis completado con exito")
    return result
