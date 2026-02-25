import json
import subprocess
import tempfile
import re
from typing import Any, Dict, List, Optional

from analysis.utils import to_int, is_str_list


def analyze_security(
    code: str, options: Optional[Dict[str, Any]] = None, timeout_seconds: int = 10
) -> List[Dict[str, Any]]:
    """
    Ejecuta la herramienta Bandit sobre el código del usuario 'code'.
    Devuelve una lista de issues normalizados.
    """
    options = options or {}

    # Construimos el comando de Bandit para analizar el código desde stdin y obtener salida en JSON.
    cmd = _build_bandit_command(options)

    # Ejecutamos la herramienta en un directorio temporal para aislar el análisis
    # y evitar escribir archivos en el sistema del usuario
    with tempfile.TemporaryDirectory(prefix="tfg_security_") as tmpdir:
        try:
            # Ejecutamos la herramienta externa mediante subprocess y capturamos su salida
            result = subprocess.run(
                cmd,
                input=code,
                text=True,
                capture_output=True,
                cwd=tmpdir,
                timeout=timeout_seconds,
                encoding="utf-8",
            )
        except FileNotFoundError as exc:
            raise RuntimeError(
                "Bandit no está instalado o no se encuentra en el PATH."
            ) from exc

    # Bandit devuelve:
    # - return code 0: sin issues
    # - return code 1: con issues
    # - otros códigos: error ejecutando Bandit
    # - stdout: salida normal de Bandit (en nuestro caso, el JSON de las issues)
    # - stderr: mensajes de error/advertencia de Bandit

    if result.returncode not in (0, 1):
        stderr = (result.stderr or "").strip()
        if options:
            raise ValueError(
                stderr or "Opciones inválidas para Bandit."
            )
        raise RuntimeError(
            stderr or f"Bandit falló con un error (exit code {result.returncode})."
        )

    raw = (result.stdout or "").strip()
    if not raw:
        return []  # No hay issues

    # Parseamos el JSON a estructura de Python
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"No se pudo parsear JSON de Bandit: {exc}") from exc

    # Verificamos que Bandit devuelve un objeto JSON (dict) y que este contiene la lista de issues en "results"
    if not isinstance(data, dict):
        raise RuntimeError("Formato inesperado: Bandit no devolvió una objeto JSON.")

    # Validamos que exista la lista de issues
    results = data.get("results")
    if not isinstance(results, list):
        return []  # No hay issues

    issues: List[Dict[str, Any]] = []
    for issue in results:
        if isinstance(issue, dict):
            issues.append(_normalize_bandit_issue(issue))  # Agregamos a la lista cada issue normalizado

    return issues


def _build_bandit_command(options: Dict[str, Any]) -> List[str]:
    """
    Construye el comando de Bandit, aplicando opciones de entrada.

    Opciones permitidas:
    - severity_level: all|low|medium|high
    - confidence_level: all|low|medium|high
    - skip: lista de IDs (ej. ["B101","B603"])
    - tests: lista de IDs (ej. ["B101","B301"])
    """
    cmd = [
        "bandit",  # Herramienta empleada
        "-f", "json",  # Formato de salida JSON
        "-n",  # Número de líneas de código adyacentes al issue detectado (contexto)
        "0",  # No se incluye ninguna línea de código, solo la referencia al problema
    ]

    # Nivel mínimo de severidad que deben tener las vulnerabilidades para ser reportadas
    severity = options.get("severity_level")
    if isinstance(severity, str) and severity.lower() in {"all", "low", "medium", "high"}:
        cmd.append(f"--severity-level={severity.lower()}")  # Bandit solo acepta valores en minúsculas

    # Nivel mínimo de confianza que Bandit asigna a una vulnerabilidad
    confidence = options.get("confidence_level")
    if isinstance(confidence, str) and confidence.lower() in {"all","low","medium","high"}:
        cmd.append(f"--confidence-level={confidence.lower()}")

    # Reglas de seguridad que se deben ignorar
    skip = options.get("skip")
    if is_str_list(skip):
        cmd += ["--skip", ",".join(s.strip().upper() for s in skip)]

    # Reglas de seguridad que se deben ejecutar
    tests = options.get("tests")
    if is_str_list(tests):
        cmd += ["--tests", ",".join(t.strip().upper() for t in tests)]

    # Leer desde stdin
    cmd.append("-")
    return cmd


# -----------------
# Normalización
# -----------------


def _normalize_bandit_issue(issue: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normaliza el issue a un formato base.
    Se extrae la información relevante para el usuario y se descartan campos que el usuario no necesita.
    """
    # Obtenemos los campos relevantes a partir del issue sin normalizar
    rule_code = str(issue.get("test_id") or "")
    message = str(issue.get("issue_text") or "").strip()
    line = to_int(issue.get("line_number"))

    bandit_sev = str(issue.get("issue_severity") or "").upper()
    severity = _severity_from_bandit(bandit_sev)

    confidence: Optional[str] = str(issue.get("issue_confidence") or "").upper()
    if confidence not in {"LOW", "MEDIUM", "HIGH"}:
        confidence = None

    # Enlace opcional a documentación adicional sobre la vulnerabilidad
    raw_help_url = issue.get("more_info")
    if isinstance(raw_help_url, str) and raw_help_url.strip():
        help_url = _normalize_bandit_help_url(raw_help_url)
    else:
        help_url = None

    suggestion = _suggestion_for_bandit_rule(rule_code)

    return {
        "tool": "bandit",
        "category": "security",
        "code": rule_code,
        "message": message,
        "severity": severity,
        "line": line,
        "column": None,  # Bandit no proporciona información de columnas
        "suggestion": suggestion,
        "confidence": confidence,
        "help_url": help_url,
    }


def _severity_from_bandit(bandit_severity: str) -> str:
    """
    Mapea los niveles de severidad de Bandit (HIGH, MEDIUM, LOW) a los niveles normalizados del sistema (error, warning, info).
    """
    if bandit_severity == "HIGH":
        return "error"  # Problema crítico
    if bandit_severity == "MEDIUM":
        return "warning"

    return "info"


def _suggestion_for_bandit_rule(rule_code: str) -> str:
    """
    Devuelve una sugerencia a partir del código de regla de Bandit.
    """
    # Sugerencias específicas para las reglas más comunes (En Bandit todas las reglas comienzan por "B")
    tips = {
        "B101": "Evita usar 'assert' para validaciones de seguridad; ya que pueden desactivarse cuando Python se ejecuta con optimización.",
        "B105": "Evita credenciales hardcodeadas en el código; utiliza variables de entorno o gestores de secretos.",
        "B301": "Evita 'yaml.load' sin safe_load; usa 'yaml.safe_load' para reducir riesgos.",
        "B307": "Evita el uso de 'eval'; puede ejecutar código arbitrario y supone un riesgo de seguridad.",
        "B404": "El módulo 'subprocess' puede ser peligroso si se usa con entradas no controladas; revisa su uso.",
        "B602": "Revisa el uso de 'subprocess'; ejecutar comandos construidos con entradas no confiables puede ser inseguro.",
        "B603": "Asegúrate de validar las entradas al usar 'subprocess' y evita patrones de ejecución inseguros.",
    }

    if rule_code in tips:
        return tips[rule_code]

    return "Revisa esta alerta de seguridad y ajusta el código para evitar patrones inseguros."


def _normalize_bandit_help_url(url: str) -> str:
    """
    Normaliza enlaces de documentación de Bandit para mostrar la versión 'latest',
    evitando enlaces rotos asociados a versiones antiguas.
    """
    return re.sub(r"/en/[^/]+/", "/en/latest/", url)
