from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from analysis.runner import run_analysis

# Definimos la app
app = FastAPI(title="TFG - Analizador Estático (Backend)")

# Modelo/Plantilla de la solicitud
class AnalyzeRequest(BaseModel):
    language: str
    code: str
    options: Optional[Dict[str, Any]] = None  # Campo para flags del analizador

#----------------------------ENDPOINTS----------------------------

# Endpoint para comprobar si el backend está funcionando
@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


# Endpoint para analizar el código
@app.post("/analyze")
def analyze(request: AnalyzeRequest) -> Dict[str, Any]:

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
        raise HTTPException(
            status_code=int(result["error"].get("http_status", 500)),
            detail=str(result["error"].get("message", "Error desconocido")),
        )

    return result
