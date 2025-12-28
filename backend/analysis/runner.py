from typing import Any, Dict, Optional

from analysis.python.style_analysis import analyze_style

def run_analysis(language: str, code: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Orquestador del análisis.
    Valida entradas, llama a los distintos módulos y devuelve el resultado.
    """
    language = (language or "").strip().lower()
    options = options or {}

    if language != "python":
        return _error_response(
            language=language,
            message="Lenguaje no soportado. Por ahora solo se admite 'python'.",
            http_status=400,
        )

    # Validaciones de posibles opciones del usuario (mediante checkboxes en el frontend)
    style_options = (
        options.get("style") if isinstance(options.get("style"), dict) else {}
    )
    timeout_seconds = options.get("timeout_seconds", 10)
    if not isinstance(timeout_seconds, int) or timeout_seconds <= 0:
        timeout_seconds = 10

    try:
        style_issues = analyze_style(
            code=code, options=style_options, timeout_seconds=timeout_seconds
        )
    except Exception as exc:
        # Si ha ocurrido algún fallo en el análisis, devolvemos un mensaje de error
        return _error_response(
            language=language,
            message=f"Error ejecutando análisis de estilo: {exc}",
            http_status=500,
        )

    summary = _build_summary(style_issues)

    return {
        "language": "python",
        "summary": summary,
        "analysis": {
            "style": style_issues,
            "security": [],
            "metrics": {},
            "dead_code": [],
            "types": [],
        },
    }


def _build_summary(issues: list[dict]) -> dict:
    """
    Construye el resumen de las issues
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


def _error_response(language: str, message: str, http_status: int) -> Dict[str, Any]:
    """
    Genera una respuesta de error con formato estable para el frontend
    """
    return {
        "language": language or "unknown",
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
