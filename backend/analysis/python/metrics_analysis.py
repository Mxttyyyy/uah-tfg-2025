import json
import subprocess
import tempfile
import os
from typing import Any, Dict, List, Optional

from analysis.utils import to_int, to_float


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

    # Ejecutamos la herramienta en un directorio temporal para aislar el análisis
    # y evitar escribir archivos en el sistema del usuario
    with tempfile.TemporaryDirectory(prefix="tfg_metrics_") as tmpdir:
        filename = "input.py"
        filepath = os.path.join(tmpdir, filename)

        # Guardamos el código del usuario en un archivo temporal (ya que Radon no acepta el código por stdin).
        with open(filepath, "w", encoding="utf-8", newline="\n") as file:
            file.write(code)

        # Ejecutamos los distintos subcomandos de Radon para obtener las métricas
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
        "cyclomatic_complexity": _normalize_cc(cc_json, filename),
        "maintainability_index": _normalize_mi(mi_json, filename),
        "raw_metrics": _normalize_raw(raw_json, filename),
    }


# --------------------------------------
# Comandos de Radon para cada métrica
# --------------------------------------


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
        # Ejecutamos la herramienta externa mediante subprocess y capturamos su salida
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
        return {}  # No hay salida procesable de Radon

    # Parseamos el JSON a estructura de Python
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"No se pudo parsear el JSON de Radon: {exc}") from exc


# -----------------
# Normalización
# -----------------


def _get_file_result(data: Any, filename: str) -> Any:
    """
    Radon normalmente devuelve un dict { "input.py": <resultado> }.
    Aquí extraemos el resultado del archivo que nos interesa.
    """
    if isinstance(data, dict):
        if filename in data:  # (si "input.py" es una de las claves del dict)
            return data[filename]

        # Si solo hay un elemento, lo devolvemos, aunque la clave no coincida con el nombre del archivo
        # Así evitamos fallos si Radon usa una clave distinta para el archivo analizado
        if len(data) == 1:
            return next(iter(data.values()))
    # Si en un futuro hay multiples archivos, devolvemos todo el dict completo
    return data


def _normalize_cc(data: Any, filename: str) -> Dict[str, Any]:
    """
    Normaliza el JSON de la métrica CC a un formato base.
    """
    file_result = _get_file_result(data, filename)  # Obtenemos todos los campos de la métrica

    blocks = []  # Lista para guardar cada bloque analizado (función, método, clase)
    if isinstance(file_result, list):
        for block in file_result:
            if not isinstance(block, dict):
                continue
            blocks.append(
                {
                    "name": str(block.get("name") or ""),  # Nombre de la función/método/clase
                    "type": str(block.get("type") or ""),  # Function/method/class (según Radon)
                    "line": to_int(block.get("lineno")),  # Línea de inicio
                    "column": to_int(block.get("col_offset")),  # Columna de inicio
                    "complexity": to_int(block.get("complexity")),  # CC numérica
                    "rank": str(block.get("rank") or ""),  # Letra A-F
                }
            )

    return {
        "file": filename,
        "blocks": blocks,
        "total_blocks": len(blocks),
    }


def _normalize_mi(data: Any, filename: str) -> Dict[str, Any]:
    """
    Normaliza el JSON de la métrica MI a un formato base.
    El formato puede variar según versión/opciones, así que lo hacemos tolerante.
    """
    file_result = _get_file_result(data, filename)

    # Casos típicos: dict con {"rank": "...", "mi": ...} o valores simples
    if isinstance(file_result, dict):
        score = (file_result.get("mi") if "mi" in file_result else file_result.get("score"))  # Algunas versiones usan "mi", otras usan "score"
        rank = file_result.get("rank")
        return {
            "file": filename,
            "score": to_float(score),
            "rank": str(rank or ""),
        }

    # Algunos formatos de salida pueden devolver solo el valor numérico del MI
    if isinstance(file_result, (int, float)):
        return {"file": filename, "score": float(file_result), "rank": ""}

    # En algunos casos Radon puede devolver únicamente el rank (A, B, C)
    if isinstance(file_result, str):
        return {"file": filename, "score": None, "rank": file_result}

    return {"file": filename, "score": None, "rank": ""}


def _normalize_raw(data: Any, filename: str) -> Dict[str, Any]:
    """
    Normaliza el JSON de las métricas básicas a un formato base.
    """
    file_result = _get_file_result(data, filename)

    # Comprobamos que el resultado obtenido sea un dict
    if not isinstance(file_result, dict):
        return {"file": filename}

    # Función auxiliar para normalizar valores numéricos
    def get_int(key: str) -> Optional[int]:
        return to_int(file_result.get(key))

    return {
        "file": filename,
        "loc": get_int("loc"),
        "lloc": get_int("lloc"),
        "sloc": get_int("sloc"),
        "comments": get_int("comments"),
        "multi": get_int("multi"),
        "blank": get_int("blank"),
    }
