from typing import Any, Dict, Optional
import time
from analysis.python.style_analysis import analyze_style
from analysis.python.security_analysis import analyze_security

def run_analysis(language: str, code: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Coordinador del análisis.
    Valida entradas, llama a los distintos módulos y devuelve el resultado JSON.
    """
    start = time.perf_counter() # Inicio del contador para calcular analisis_time_ms
    language = (language or "").strip().lower()
    options = options or {}

    if language != "python":
        return build_error_response(
            language=language,
            message="Lenguaje no soportado. Por ahora solo se admite 'python'.",
            http_status=400,
            analysis_time_ms=int((time.perf_counter() - start) * 1000),
        )

    # Validaciones de posibles opciones del usuario (mediante checkboxes en el frontend)
    style_options = (options.get("style") if isinstance(options.get("style"), dict) else {})
    security_options = (options.get("security") if isinstance(options.get("security"), dict) else {})

    timeout_seconds = options.get("timeout_seconds", 10)
    if not isinstance(timeout_seconds, int) or timeout_seconds <= 0:
        timeout_seconds = 10

    # Ejecutamos el análisis
    try:
        style_issues = analyze_style(code=code, options=style_options, timeout_seconds=timeout_seconds)
        security_issues = analyze_security(code=code, options=security_options, timeout_seconds=timeout_seconds)

    # Si ha ocurrido algún fallo en el análisis, devolvemos un mensaje de error
    except Exception as exc:
        return build_error_response(
            language=language,
            message=f"Error ejecutando análisis de estilo: {exc}",
            http_status=500,
            analysis_time_ms=int((time.perf_counter() - start) * 1000),
        )
    
    all_issues = style_issues + security_issues
    summary = _build_summary(all_issues)

    analysis_time_ms = int((time.perf_counter() - start) * 1000)
    return {
        "language": "python",
        "analysis_time_ms": analysis_time_ms,
        "summary": summary,
        "analysis": {
            "style": style_issues,
            "security": security_issues,
            "metrics": {},
            "dead_code": [],
            "types": [],
        },
    }


def _build_summary(issues: list[dict]) -> dict:
    """
    Construye un resumen de las issues por severidad.
    """
    by_severity = {"info": 0, "warning": 0, "error": 0}
    for item in issues:
        sev = item.get("severity", "warning")
        if sev not in by_severity:
            sev = "warning"
        by_severity[sev] += 1

    return {
        "total_issues": len(issues),
        "by_severity": by_severity,
    }


def build_error_response(language: str, message: str, http_status: int, analysis_time_ms: int) -> Dict[str, Any]:
    """
    Genera una respuesta de error con formato estable para el frontend
    """
    return {
        "language": language or "unknown",
        "analysis_time_ms": analysis_time_ms,
        "error": {
            "message": message,
            "http_status": http_status,
        },
        # Summary a 0, ya que no se pudo analizar
        "summary": {
            "total_issues": 0,
            "by_severity": {"info": 0, "warning": 0, "error": 0},
        },
        "analysis": {
            "style": [],
            "security": [],
            "metrics": {},
            "dead_code": [],
            "types": [],
        },
    }
