import json
import subprocess
import tempfile
from typing import Any, Dict, List, Optional

def analyze_style(code: str, options: Optional[Dict[str, Any]] = None, timeout_seconds: int = 10) -> List[Dict[str, Any]]:
    """
    Ejecuta la herramienta Ruff sobre el código del usuario 'code' sin ejecutarlo.
    Devuelve una lista de issues normalizados.
    """
    options = options or {}

    # Construimos el comando de Ruff para analizar el código desde stdin y obtener salida en JSON.
    cmd = _build_ruff_command(options)

    with tempfile.TemporaryDirectory(prefix="static_code_analysis") as tmpdir:
        result = subprocess.run(
            cmd,
            input=code,
            text=True,
            capture_output=True,
            cwd=tmpdir,
            timeout=timeout_seconds,
        )

    # Ruff devuelve:
    # - exit code 0: sin issues
    # - exit code 1: con issues
    # - exit code 2: error de ejecución/config/CLI
    if result.returncode == 2:
        stderr = (result.stderr or "").strip()
        raise RuntimeError(stderr or "Ruff falló con un error (exit code 2).")

    raw = (result.stdout or "").strip()
    if not raw:
        return [] # No hay issues

    # Parseamos el JSON a estructura de Python
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"No se pudo parsear JSON de Ruff: {exc}")

    if not isinstance(data, list):
        raise RuntimeError("Formato inesperado: Ruff no devolvió una lista JSON.")

    issues: List[Dict[str, Any]] = []
    for item in data:
        if isinstance(item, dict):
            issues.append(_normalize_ruff_issue(item)) # Annadimos a la lista cada issue normalizado

    return issues


def _build_ruff_command(options: Dict[str, Any]) -> List[str]:
    """
    Construye el comando de Ruff, aplicando opciones de entrada.
    """
    cmd = [
        "ruff", # Herramienta empleada
        "check", # Modo lint
        "--isolated", # Ignora cualquier config externa
        "--no-cache", # Evita cache (para que el análisis depende solo del código actual)
        "--output-format", "json", # Formato de salida JSON
        "--stdin-filename", "input.py", # Archivo ficticio para tratar el código como .py
    ]

    # Opciones para filtrar reglas de Ruff
    select = options.get("select")
    ignore = options.get("ignore")
    extend_select = options.get("extend_select") or options.get("extend-select")

    # Annadimos flags solo si las opciones son listas de strings válidas ["F401", "E501", etc]
    if _is_str_list(select):
        cmd += ["--select", ",".join(select)]
    if _is_str_list(ignore):
        cmd += ["--ignore", ",".join(ignore)]
    if _is_str_list(extend_select):
        cmd += ["--extend-select", ",".join(extend_select)]

    # Leer desde stdin
    cmd.append("-") 
    return cmd


def _normalize_ruff_issue(item: Dict[str, Any]) -> Dict[str, Any]:
    
    return item

def _is_str_list(value: Any) -> bool:
    return value
