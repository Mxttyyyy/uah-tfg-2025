from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import FastAPI
from pydantic import BaseModel

# Definimos la app
app = FastAPI(title="TFG - Analizador Estático (Backend)")

# Modelo/Plantilla de la solicitud, con validaciones
class AnalyzeRequest(BaseModel):
    language: str
    code: str
    options: Optional[Dict[str, Any]] = None  # Campo para flags del analizador
