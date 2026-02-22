import csv
import os
import subprocess
import tempfile
from typing import Any, Dict, List, Optional

from analysis.utils import to_int


def analyze_metrics(
    code: str, options: Optional[Dict[str, Any]] = None, timeout_seconds: int = 10,
) -> Dict[str, Any]:
    """
    Ejecuta Lizard sobre el código Java del usuario y devuelve
    métricas por función.
    """
    options = options or {}

    # Ejecutamos la herramienta en un directorio temporal para aislar el análisis
    # y evitar escribir archivos en el sistema del usuario
    with tempfile.TemporaryDirectory(prefix="tfg_java_metrics_") as tmpdir:
        filename = "Input.java"
        filepath = os.path.join(tmpdir, filename)

        # Guardamos el código del usuario en un archivo temporal (ya que Lizard no acepta el código por stdin).
        with open(filepath, "w", encoding="utf-8", newline="\n") as f:
            f.write(code)

        # Construimos el comando de Lizard para analizar el código desde un archivo y obtener salida.
        cmd = _build_lizard_command(filename)

        try:
            # Ejecutamos la herramienta externa mediante subprocess y capturamos su salida
            result = subprocess.run(
                cmd,
                text=True,
                capture_output=True,
                cwd=tmpdir,
                timeout=timeout_seconds,
                encoding="utf-8",
            )
        except FileNotFoundError as exc:
            raise RuntimeError(
                "Lizard no está instalado o no está en el PATH."
            ) from exc

    # Lizard puede devolver:
    # - 0: ejecución correcta (ninguna función supera los umbrales)
    # - != 0: ejecución correcta pero se han superado los umbrales (no es error real).
    # No hay stdout o stdout no es CSV válido: error real.
    raw = (result.stdout or "").strip()
    if not raw:
        stderr = (result.stderr or "").strip()
        if options:
            raise ValueError(stderr or "Opciones inválidas para Lizard.")
        raise RuntimeError(stderr or "Lizard falló durante la ejecución.")

    # Parseamos el CSV a estructura intermedia (lista de filas)
    rows = _parse_lizard_csv_rows(raw)

    functions: List[Dict[str, Any]] = []
    # Por cada fila, obtenemos y normalizamos los campos más relevantes
    for row in rows:
        parsed = _normalize_lizard_row(row, options)
        if parsed is not None:
            functions.append(parsed)

    return {
        "tool": "lizard",
        "functions": functions,
    }


def _build_lizard_command(filename: str) -> List[str]:
    """
    Construye el comando Lizard.
    """
    cmd = ["lizard", "--languages", "java", "--csv", filename]

    return cmd


# -----------------------
# Normalización
# -----------------------


def _normalize_lizard_row(row: List[str], options: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Normaliza una fila CSV de Lizard y aplica filtros
    personalizados sobre las funciones analizadas.

    Options personalizadas:
    - cc_min (int, opcional):
        Complejidad ciclomática mínima requerida.
        Solo se incluirán funciones cuya CC sea >= a este valor.

    - nloc_min (int, opcional):
        Número mínimo de líneas de código (NLOC).
        Solo se incluirán funciones con tamaño >= a este valor.

    - args_min (int, opcional):
        Número mínimo de parámetros.
        Solo se incluirán funciones con al menos este número de argumentos.
    """
    if not isinstance(row, list) or len(row) < 11:
        return None
    
    # Umbrales opcionales definidos por el usuario
    cc_min = options.get("cc_min")
    nloc_min = options.get("nloc_min")
    args_min = options.get("args_min")

    # Obtenemos los campos relevantes a partir de la fila
    nloc = to_int(row[0])
    cc = to_int(row[1])
    token_count = to_int(row[2])        
    param_count = to_int(row[3])
    length = to_int(row[4])
    # Los campos 5 y 6 no son relevantes
    raw_func_name = row[7] or ""
    raw_long_name = row[8] or ""
    start_line = to_int(row[9])

    # Normalizamos los nombres de las funciones
    func_name = raw_func_name.split("::")[-1]
    long_name = raw_long_name.split("::")[-1]

    # Aplicamos filtros si existen y validamos los umbrales
    if isinstance(cc_min, int) and cc is not None and cc < cc_min:
        return None
    if isinstance(nloc_min, int) and nloc is not None and nloc < nloc_min:
        return None
    if isinstance(args_min, int) and param_count is not None and param_count < args_min:
        return None

    return {
        "name": func_name,
        "long_name": long_name,
        "start_line": start_line,
        "cyclomatic_complexity": cc,
        "nloc": nloc,
        "length": length,
        "parameter_count": param_count,
        "token_count": token_count,
    }


def _parse_lizard_csv_rows(raw_csv: str) -> List[List[str]]:
    """
    Convierte el CSV crudo de Lizard (stdout) en una lista de filas.
    Cada fila es una lista de columnas (strings).

    Formato típico (sin cabecera):
    nloc, ccn, token, param, length, location, file, function, long_name, start_line
    """
    rows: List[List[str]] = []

    # Leemos el CSV de Lizard
    # raw_csv es el conjunto de resultados (líneas) con este formato:
    # 3,1,12,1,3,"Input::simple@2-4@Input.java","Input.java","Input::simple","Input::simple( int a)",2,4

    # csv.reader divide por comas y genera una lista por cada fila
    reader = csv.reader(raw_csv.splitlines())

    for row in reader:
        # Necesitamos al menos 11 columnas para parsear de forma segura
        if isinstance(row, list) and len(row) >= 11:
            rows.append(row)

    return rows