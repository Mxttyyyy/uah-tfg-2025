from typing import Any, Dict, List, Optional
import time

from analysis.python.style_analysis import analyze_style
from analysis.python.security_analysis import analyze_security
from analysis.python.metrics_analysis import analyze_metrics
from analysis.python.dead_code_analysis import analyze_dead_code
from analysis.python.type_analysis import analyze_types

# Tipos de análisis permitidos
_ALLOWED_ANALYSES = {"style", "security", "metrics", "dead_code", "types"}

def run_analysis(
    language: str, code: str, options: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Coordinador del análisis.
    Valida entradas, llama a los distintos módulos y devuelve el resultado JSON.
    """
    start = time.perf_counter()  # Inicio del contador para calcular analysis_time_ms
    language = (language or "").strip().lower()

    options = options or {}

    # Validamos que el código del usuario no esté vacío
    if not code or not code.strip():
        return _error_response(
            language=language,
            message="El campo 'code' no puede estar vacío.",
            http_status=400,
            analysis_time_ms=int((time.perf_counter() - start) * 1000),
        )

    # Validamos que las opciones sean un objeto JSON (dict)
    if not isinstance(options, dict):
        return _error_response(
            language=language,
            message="El campo 'options' debe ser un objeto JSON (por ejemplo: {}).",
            http_status=400,
            analysis_time_ms=int((time.perf_counter() - start) * 1000),
        )

    # Validamos el lenguaje
    if language != "python":
        return _error_response(
            language=language,
            message="Lenguaje no disponible. Por ahora solo se admite 'python'.",
            http_status=400,
            analysis_time_ms=int((time.perf_counter() - start) * 1000),
        )

    # Validamos que las opciones por módulo (style/security/metrics/type/dead_code) sean objetos JSON (dict)
    for key in _ALLOWED_ANALYSES:
        if key in options and not isinstance(options.get(key), dict):
            return _error_response(
                language=language,
                message=f"options.{key} debe ser un objeto JSON (por ejemplo: {{}}).",
                http_status=400,
                analysis_time_ms=int((time.perf_counter() - start) * 1000),
            )

    # Validamos la opción enabled (opción que permitirá al usuario seleccionar el/los análisis a ejecutar)
    enabled_raw = options.get("enabled")
    if isinstance(enabled_raw, list) and enabled_raw:
        enabled = set()  # No queremos duplicados
        for x in enabled_raw:
            analysis = str(x).strip()
            if analysis:
                enabled.add(analysis)
        enabled = enabled & _ALLOWED_ANALYSES  # Nos quedamos solo con análisis válidos
        if not enabled:
            enabled = set(_ALLOWED_ANALYSES)

    # Si falla algo, se ejecutan todos los análisis
    else:
        enabled = set(_ALLOWED_ANALYSES)

    # Validamos el timeout
    timeout_seconds = options.get("timeout_seconds", 10)
    if "timeout_seconds" in options and (not isinstance(timeout_seconds, int) or timeout_seconds <= 0):
        return _error_response(
            language=language,
            message="options.timeout_seconds debe ser un entero positivo.",
            http_status=400,
            analysis_time_ms=int((time.perf_counter() - start) * 1000),
        )

    # Una vez sabemos que son valores válidos, obtenemos las opciones
    style_options = options.get("style", {})
    security_options = options.get("security", {})
    metrics_options = options.get("metrics", {})
    dead_code_options = options.get("dead_code", {})
    types_options = options.get("types", {})

    # ---------------------- Ejecutamos los análisis ----------------------

    # Resultados por defecto
    style_issues : List[Dict[str, Any]] = []
    security_issues : List[Dict[str, Any]] = []
    dead_code_issues : List[Dict[str, Any]] = []
    types_issues : List[Dict[str, Any]] = []
    metrics : Dict[str, Any] = {}

    # STYLE
    if "style" in enabled:
        try:
            style_issues = analyze_style(
                code=code, options=style_options, timeout_seconds=timeout_seconds
            )

        # Si ha ocurrido algún fallo en el análisis, devolvemos un mensaje de error
        except ValueError as exc:
            return _error_response(
                language=language,
                message=f"Opciones inválidas: {exc}",
                http_status=400,
                analysis_time_ms=int((time.perf_counter() - start) * 1000),
            )
        
        except Exception as exc:
            return _error_response(
                language=language,
                message=f"Error ejecutando análisis de estilo: {exc}",
                http_status=500,
                analysis_time_ms=int((time.perf_counter() - start) * 1000),
            )
    # SECURITY
    if "security" in enabled:
        try:
            security_issues = analyze_security(
                code=code, options=security_options, timeout_seconds=timeout_seconds
            )

        except ValueError as exc:
            return _error_response(
                language=language,
                message=f"Opciones inválidas: {exc}",
                http_status=400,
                analysis_time_ms=int((time.perf_counter() - start) * 1000),
            )
        
        except Exception as exc:
            return _error_response(
                language=language,
                message=f"Error ejecutando análisis de seguridad: {exc}",
                http_status=500,
                analysis_time_ms=int((time.perf_counter() - start) * 1000),
            )
    # METRICS
    if "metrics" in enabled:
        try:
            metrics = analyze_metrics(
                code=code, options=metrics_options, timeout_seconds=timeout_seconds
            )
        
        except ValueError as exc:
            return _error_response(
                language=language,
                message=f"Opciones inválidas: {exc}",
                http_status=400,
                analysis_time_ms=int((time.perf_counter() - start) * 1000),
            )

        except Exception as exc:
            return _error_response(
                language=language,
                message=f"Error ejecutando análisis de métricas: {exc}",
                http_status=500,
                analysis_time_ms=int((time.perf_counter() - start) * 1000),
            )
    # DEAD CODE
    if "dead_code" in enabled:
        try:
            dead_code_issues = analyze_dead_code(
                code=code, options=dead_code_options, timeout_seconds=timeout_seconds
            )

        except ValueError as exc:
            return _error_response(
                language=language,
                message=f"Opciones inválidas: {exc}",
                http_status=400,
                analysis_time_ms=int((time.perf_counter() - start) * 1000),
            )

        except Exception as exc:
            return _error_response(
                language=language,
                message=f"Error ejecutando análisis de código muerto: {exc}",
                http_status=500,
                analysis_time_ms=int((time.perf_counter() - start) * 1000),
            )
    # TYPES
    if "types" in enabled:
        try:
            types_issues = analyze_types(
                code=code, options=types_options, timeout_seconds=timeout_seconds
            )

        except Exception as exc:
            return _error_response(
                language=language,
                message=f"Error ejecutando análisis de tipos: {exc}",
                http_status=500,
                analysis_time_ms=int((time.perf_counter() - start) * 1000),
            )

    # Unificamos todas las issues para generar el resumen global
    all_issues = style_issues + security_issues + dead_code_issues + types_issues
    summary = _build_summary(all_issues)

    analysis_time_ms = int((time.perf_counter() - start) * 1000)
    return {
        "language": "python",
        "analysis_time_ms": analysis_time_ms,
        "summary": summary,
        "analysis": {
            "style": style_issues,
            "security": security_issues,
            "metrics": metrics,
            "dead_code": dead_code_issues,
            "types": types_issues,
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


def _error_response(
    language: str, message: str, http_status: int, analysis_time_ms: int
) -> Dict[str, Any]:
    """
    Genera una respuesta de error con un formato estable.
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
