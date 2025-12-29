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

    # Ruff permite analizar desde stdin usando "-" y asignar nombre de fichero con --stdin-filename
    # y salida JSON con --output-format json.
    cmd = _build_ruff_command(options)

    with tempfile.TemporaryDirectory() as tmpdir:
        completed = subprocess.run(
            cmd,
            input=code,
            text=True,
            cwd=tmpdir,
            timeout=timeout_seconds,
        )

    # Ruff devuelve:
    # - exit code 0: sin issues
    # - exit code 1: con issues
    # - exit code 2: error de ejecución/config/CLI
    if completed.returncode == 2:
        stderr = (completed.stderr or "").strip()
        raise RuntimeError(stderr or "Ruff falló con un error (exit code 2).")

    raw = (completed.stdout or "").strip()
    if not raw:
        return []

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"No se pudo parsear JSON de Ruff: {exc}")

    if not isinstance(data, list):
        raise RuntimeError("Formato inesperado: Ruff no devolvió una lista JSON.")

    issues: List[Dict[str, Any]] = []
    for item in data:
        if isinstance(item, dict):
            issues.append(_normalize_ruff_issue(item))

    return issues


def _build_ruff_command(options: Dict[str, Any]) -> List[str]:
    
    return


def _normalize_ruff_issue(item: Dict[str, Any]) -> Dict[str, Any]:
   return


