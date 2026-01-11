import json
import subprocess
import tempfile
import os
from typing import Any, Dict, List, Optional

from analysis.utils import to_int, is_str_list


def analyze_metrics(
    code: str, options: Optional[Dict[str, Any]] = None, timeout_seconds: int = 10
) -> Dict[str, Any]:
    """
    Calcula métricas de código con Radon.
    Devuelve un diccionario con:
    - cyclomatic_complexity: complejidad ciclomática por bloque (cc)
    - maintainability_index: índice de mantenibilidad del código (mi)
    - raw_metrics: LOC/LLOC/SLOC, comentarios, líneas en blanco... (raw)
    """
    options = options or {}

    # En Windows, Radon puede necesitar que fuerces el encoding a UTF-8.
    env = os.environ.copy()
    env.setdefault("RADONFILESENCODING", "utf-8")

    with tempfile.TemporaryDirectory(prefix="tfg_metrics_") as tmpdir:
        filename = "input.py"
        filepath = os.path.join(tmpdir, filename)

        # Guardamos el código del usuario en un archivo temporal (solo para que Radon lo analice).
        with open(filepath, "w", encoding="utf-8", newline="\n") as f:
            f.write(code)

        cc_json = _run_radon_json(
            _build_radon_cc_command(filename, options),
            cwd=tmpdir,
            env=env,
            timeout_seconds=timeout_seconds,
        )
        mi_json = _run_radon_json(
            _build_radon_mi_command(filename, options),
            cwd=tmpdir,
            env=env,
            timeout_seconds=timeout_seconds,
        )
        raw_json = _run_radon_json(
            _build_radon_raw_command(filename),
            cwd=tmpdir,
            env=env,
            timeout_seconds=timeout_seconds,
        )

    return {
        "cyclomatic_complexity": cc_json,
        "maintainability_index": mi_json,
        "raw_metrics": raw_json
    }


# ----------------
# Comandos de Radon
# ----------------


def _build_radon_cc_command(filename: str, options: Dict[str, Any]) -> List[str]:
    """
    Construye el comando de Radon para calcular la complejidad ciclomática.
    """
    cmd = [
        "radon",  # Herramienta empleada
        "cc",  # Métrica empleada: complejidad ciclomática
        "-j",  # Formato de salida JSON
        "-s",  # Incluye el valor numérico de complejidad
    ]

    # Permite filtrar por rango (A-F). Si no se pasa la opción, Radon usa sus defaults (A-F).
    cc_min = options.get("cc_min") or options.get("min")
    cc_max = options.get("cc_max") or options.get("max")

    if isinstance(cc_min, str) and cc_min.strip():
        cmd += ["--min", cc_min.strip().upper()]
    if isinstance(cc_max, str) and cc_max.strip():
        cmd += ["--max", cc_max.strip().upper()]

    cmd.append(filename)
    return cmd


def _build_radon_mi_command(filename: str, options: Dict[str, Any]) -> List[str]:
    """
    Construye el comando de Radon para calcular el índice de mantenibilidad.
    """
    cmd = [
        "radon",  # Herramienta empleada
        "mi",  # Métrica empleada: índice de mantenibilidad (MI)
        "-j",  # Formato de salida JSON
        "-s",  # Incluye el valor numérico de MI
    ]

    # Permite filtrar por rango (A-F). Si no se pasa la opción, Radon usa sus defaults (A-C).
    mi_min = options.get("mi_min")
    mi_max = options.get("mi_max")
    if isinstance(mi_min, str) and mi_min.strip():
        cmd += ["--min", mi_min.strip().upper()]
    if isinstance(mi_max, str) and mi_max.strip():
        cmd += ["--max", mi_max.strip().upper()]

    cmd.append(filename)
    return cmd


def _build_radon_raw_command(filename: str) -> List[str]:
    """
    Construye el comando de Radon para calcular métricas básicas,
    como LOC/LLOC/SLOC, líneas en blanco y comentarios.
    """
    return [
        "radon",  # Herramienta empleada
        "raw",  # Métrica empleada: métricas básicas
        "-j",  # Formato de salida JSON
        filename,  # Archivo a analizar (en este caso, el archivo temporal "input.py")
    ]


def _run_radon_json(
    cmd: list[str], cwd: str, env: Dict[str, str], timeout_seconds: int
) -> Any:
    """
    Ejecuta Radon y parsea su salida JSON.
    """
    try:
        result = subprocess.run(
            cmd,
            text=True,
            capture_output=True,
            cwd=cwd,
            env=env,
            timeout=timeout_seconds,
        )
    except FileNotFoundError as exc:
        raise RuntimeError(
            "Radon no está instalado o no se encuentra en el PATH."
        ) from exc


    # Radon:
    # - return code 0: ejecución correcta (devuelve métricas por stdout en JSON)
    # - return code != 0: error al ejecutar Radon (CLI/config/archivo)
    # - stdout: salida normal (métricas en JSON)
    # - stderr: mensajes de error/diagnóstico

    if result.returncode != 0:
        stderr = (result.stderr or "").strip()
        stdout = (result.stdout or "").strip()
        raise RuntimeError(stderr or stdout or "Radon falló al ejecutar el comando.")

    raw = (result.stdout or "").strip()
    if not raw:
        return {} # No hay salida procesable de Radon

    # Parseamos el JSON a estructura de Python
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"No se pudo parsear el JSON de Radon: {exc}") from exc


def _normalize_cc(issue: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normaliza el issue a un formato base.
    Se extrae la información relevante para el usuario y se descartan campos que el usuario no necesita.
    """
    rule_code = str(issue.get("test_id") or "")
    message = str(issue.get("issue_text") or "").strip()
    # filename = str(issue.get("filename") or "input.py")
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
        "tool": "radon",
        "category": "security",
        "code": rule_code,
        "message": message,
        "severity": severity,
        # "path": filename,
        "line": line,
        "column": None,  # Bandit no proporciona información de columnas
        "suggestion": suggestion,
        "confidence": confidence,
        "help_url": help_url,
    }


def _normalize_mi(issue: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normaliza el issue a un formato base.
    Se extrae la información relevante para el usuario y se descartan campos que el usuario no necesita.
    """
    rule_code = str(issue.get("test_id") or "")
    message = str(issue.get("issue_text") or "").strip()
    # filename = str(issue.get("filename") or "input.py")
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
        "tool": "radon",
        "category": "security",
        "code": rule_code,
        "message": message,
        "severity": severity,
        # "path": filename,
        "line": line,
        "column": None,  # Bandit no proporciona información de columnas
        "suggestion": suggestion,
        "confidence": confidence,
        "help_url": help_url,
    }


def _normalize_raw(issue: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normaliza el issue a un formato base.
    Se extrae la información relevante para el usuario y se descartan campos que el usuario no necesita.
    """
    rule_code = str(issue.get("test_id") or "")
    message = str(issue.get("issue_text") or "").strip()
    # filename = str(issue.get("filename") or "input.py")
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
        "tool": "radon",
        "category": "security",
        "code": rule_code,
        "message": message,
        "severity": severity,
        # "path": filename,
        "line": line,
        "column": None,  # Bandit no proporciona información de columnas
        "suggestion": suggestion,
        "confidence": confidence,
        "help_url": help_url,
    }
