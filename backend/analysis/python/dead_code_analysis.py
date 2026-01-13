import subprocess
import tempfile
import os
from typing import Any, Dict, List, Optional

from analysis.utils import to_int, is_str_list


def analyze_dead_code(
    code: str, options: Optional[Dict[str, Any]] = None, timeout_seconds: int = 10
) -> List[Dict[str, Any]]:
    """
    Ejecuta la herramienta Vulture sobre el código del usuario 'code'.
    Devuelve una lista de issues normalizados.
    """
    options = options or {}

    # Construimos el comando de Vulture para analizar el código desde stdin y obtener salida en JSON.
    cmd = _build_vulture_command(options)

    # Ejecutamos la herramienta en un directorio temporal para aislar el análisis
    # y evitar escribir archivos en el sistema del usuario
    with tempfile.TemporaryDirectory(prefix="tfg_dead_code_") as tmpdir:
        filename = "input.py"
        file_path = os.path.join(tmpdir, filename)
        
        # Guardamos el código del usuario en un archivo temporal (ya que Vulture no acepta el código por stdin).
        with open(file_path, "w", encoding="utf-8", newline="\n") as file:
            file.write(code)
        
        try:
            # Ejecutamos la herramienta externa mediante subprocess y capturamos su salida
            result = subprocess.run(
                cmd,
                input=code,
                text=True,
                capture_output=True,
                cwd=tmpdir,
                timeout=timeout_seconds,
            )
        except FileNotFoundError as exc:
            raise RuntimeError(
                "Vulture no está instalado o no se encuentra en el PATH."
            ) from exc

    # Vulture devuelve:
    # - return code 0: no se ha detectado dead code
    # - return code 3: dead code encontrado
    # - return code 1: error al analizar el archivo (entrada inválida, sintaxis, etc.)
    # - return code 2: argumentos inválidos de Vulture
    # - stdout: informe de Vulture con los elementos no usados (imports, variables, funciones, clases)
    # - stderr: mensajes de error/advertencia de Vulture

    if result.returncode in (1, 2):
        stderr = (result.stderr or "").strip()
        stdout = (result.stdout or "").strip()
        raise RuntimeError(stderr or stdout or f"Vulture falló con un error (exit code {result.returncode}).")

    raw = (result.stdout or "").strip()
    if not raw:
        return []  # No hay issues

    issues: List[Dict[str, Any]] = []
    for line in raw.splitlines():
        parsed = _normalize_vulture_line(line.strip())
        if parsed:
            issues.append(parsed)

    return issues


def _build_vulture_command(filename: str, options: Dict[str, Any]) -> List[str]:
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
        "-f","json",  # Formato de salida JSON
        "-n",  # Número de líneas de código adyacentes al issue detectado (contexto)
        "0",  # No se incluye ninguna línea de código, solo la referencia al problema
    ]

    # Nivel mínimo de severidad que deben tener las vulnerabilidades para ser reportadas
    severity = options.get("severity-level")
    if isinstance(severity, str) and severity.lower() in {"all", "low", "medium", "high"}:
        cmd.append(f"--severity-level={severity.lower()}")  # Bandit solo acepta valores en minúsculas

    # Nivel mínimo de confianza que Bandit asgina a una vulnerabilidad
    confidence = options.get("confidence-level")
    if isinstance(confidence, str) and confidence.lower() in {"all", "low", "medium", "high"}:
        cmd.append(f"--confidence-level={confidence.lower()}")

    # Reglas de seguridad que se deben ignorar
    skip = options.get("skip")
    if is_str_list(skip):
        cmd += ["--skip", ",".join(skip)]

    # Reglas de seguridad que se deben ejecutar
    tests = options.get("tests")
    if is_str_list(tests):
        cmd += ["--tests", ",".join(tests)]

    # Leer desde stdin
    cmd.append(filename)
    return cmd


def _normalize_vulture_line(issue: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normaliza el issue a un formato base.
    Se extrae la información relevante para el usuario y se descartan campos que el usuario no necesita.
    """
    rule_code = str(issue.get("test_id") or "")
    message = str(issue.get("issue_text") or "").strip()
    filename = str(issue.get("filename") or "input.py")
    line = to_int(issue.get("line_number"))

    bandit_sev = str(issue.get("issue_severity") or "").upper()
    severity = _severity_from_bandit(bandit_sev)

    confidence = str(issue.get("issue_confidence") or "").upper()
    if confidence not in {"LOW", "MEDIUM", "HIGH"}:
        confidence = None

    # Enlace opcional a documentación adicional sobre la vulnerabilidad
    raw_help_url = issue.get("more_info")
    if not isinstance(raw_help_url, str) or not raw_help_url.strip():
        raw_help_url = None

    help_url = _normalize_bandit_help_url(raw_help_url)
    suggestion = _suggestion_for_bandit_rule(rule_code, message)

    return {
        "tool": "vulture",
        "category": "dead_code",
        "code": rule_code,
        "message": message,
        "severity": severity,
        "path": filename,
        "line": line,
        "column": None,  # Bandit no proporciona información de columnas
        "suggestion": suggestion,
        "confidence": confidence,
        "help_url": help_url,
    }


def _severity_from_confidence(bandit_severity: str) -> str:
    """
    Mapea los niveles de severidad de Bandit (HIGH, MEDIUM, LOW) a los niveles normalizados del sistema (error, warning, info).
    """
    if bandit_severity == "HIGH":
        return "error" # Problema crítico
    if bandit_severity == "MEDIUM":
        return "warning"

    return "info"


def _suggestion_for_vulture_rule(rule_code: str, message: str) -> str:
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

    if message:
        return "Revisa esta alerta de seguridad y ajusta el código para evitar patrones inseguros."

    return "Revisa esta alerta de seguridad."
