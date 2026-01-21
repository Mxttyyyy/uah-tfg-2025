import json
import subprocess
import tempfile
from typing import Any, Dict, List, Optional

from analysis.utils import to_int, is_str_list


def analyze_style(
    code: str, options: Optional[Dict[str, Any]] = None, timeout_seconds: int = 10
) -> List[Dict[str, Any]]:
    """
    Ejecuta la herramienta Ruff sobre el código del usuario 'code'.
    Devuelve una lista de issues normalizados.
    """
    options = options or {}

    # Construimos el comando de Ruff para analizar el código desde stdin y obtener salida en JSON.
    cmd = _build_ruff_command(options)

    # Ejecutamos la herramienta en un directorio temporal para aislar el análisis
    # y evitar escribir archivos en el sistema del usuario
    with tempfile.TemporaryDirectory(prefix="tfg_style_") as tmpdir:
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
                "Ruff no está instalado o no se encuentra en el PATH."
            ) from exc

    # Ruff devuelve:
    # - return code 0: sin issues
    # - return code 1: con issues
    # - return code != 0 y != 1: error al ejecutar Ruff
    # - stdout: salida normal de Ruff (en nuestro caso, el JSON de las issues)
    # - stderr: mensajes de error/advertencias de Ruff

    if result.returncode not in (0, 1):
        stderr = (result.stderr or "").strip()
        raise RuntimeError(
            stderr or f"Ruff falló con un error (exit code {result.returncode})."
        )

    raw = (result.stdout or "").strip()
    if not raw:
        return []  # No hay issues

    # Parseamos el JSON a estructura de Python
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"No se pudo parsear JSON de Ruff: {exc}")

    if not isinstance(data, list):
        raise RuntimeError("Formato inesperado: Ruff no devolvió una lista JSON.")

    issues: List[Dict[str, Any]] = []
    for issue in data:
        if isinstance(issue, dict):
            issues.append(_normalize_ruff_issue(issue))  # Agregamos a la lista cada issue normalizado

    return issues


def _build_ruff_command(options: Dict[str, Any]) -> List[str]:
    """
    Construye el comando de Ruff, aplicando opciones de entrada.
    """
    cmd = [
        "ruff",  # Herramienta empleada
        "check",  # Modo lint
        "--isolated",  # Ignora cualquier config externa
        "--no-cache",  # Evita cache (para que el análisis dependa solo del código actual)
        "--output-format", "json",  # Formato de salida JSON
        "--stdin-filename", "input.py",  # Archivo ficticio para tratar el código como un .py
    ]

    # Opciones para filtrar reglas de Ruff
    select = options.get("select")
    ignore = options.get("ignore")
    extend_select = options.get("extend_select")

    # Agregamos flags solo si las opciones son listas de strings válidas (ej. ["F401", "E501"])
    if is_str_list(select):
        cmd += ["--select", ",".join(select)]
    if is_str_list(ignore):
        cmd += ["--ignore", ",".join(ignore)]
    if is_str_list(extend_select):
        cmd += ["--extend-select", ",".join(extend_select)]

    # Leer desde stdin
    cmd.append("-")
    return cmd


# -----------------
# Normalización
# -----------------


def _normalize_ruff_issue(issue: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normaliza el issue a un formato base.
    Eliminamos campos que el usuario no necesita (como cell, fix, etc.)
    """
    # Obtenemos los campos relevantes a partir del issue sin normalizar
    rule_code = str(issue.get("code") or "")
    message = str(issue.get("message") or "").strip()

    filename = str(issue.get("filename") or "input.py")
    location = issue.get("location") if isinstance(issue.get("location"), dict) else {}
    line = to_int(location.get("row"))
    column = to_int(location.get("column"))

    suggestion = _suggestion_for_rule_code(rule_code)
    severity = _severity_from_rule_code(rule_code)

    help_url = issue.get("url")
    if not isinstance(help_url, str) or not help_url.strip():
        help_url = None

    # Construimos el issue normalizado en base a los campos obtenidos
    return {
        "tool": "ruff",
        "category": "style",
        "code": rule_code,
        "message": message,
        "severity": severity,
        "path": filename,
        "line": line,
        "column": column,
        "suggestion": suggestion,
        "help_url": help_url,
    }


def _severity_from_rule_code(rule_code: str) -> str:
    """
    Define el nivel de severidad según el prefijo del código de la regla.
    - error: problemas que impiden ejecutar el código.
    - warning: incidencias importantes de calidad y limpieza.
    - info: recomendaciones de estilo y convenciones.
    """
    if not rule_code:
        return "warning"

    # Reglas que suelen indicar fallo real (en runtime o por sintaxis)
    error_codes = {
        "E999",  # syntax-error
        "F821",  # undefined-name -> NameError
        "F823",  # undefined-local -> UnboundLocalError
        "F701",  # break-outside-loop -> SyntaxError
        "F702",  # continue-outside-loop -> SyntaxError
        "F706",  # return-outside-function -> SyntaxError
    }

    if rule_code in error_codes:
        return "error"

    if rule_code.startswith(("E", "F", "W")):
        return "warning"

    # Resto (I, N, D, etc)
    return "info"


def _suggestion_for_rule_code(rule_code: str) -> str:
    """
    Devuelve una sugerencia a partir del código de regla de Ruff.
    """
    # Sugerencias específicas para las reglas más comunes
    tips = {
        # Pyflakes (F)
        "F401": "Elimina el import si no se usa.",
        "F841": "Elimina la variable sin uso o úsala. Si es intencional, nómbrala con '_' (por ejemplo: _x).",
        "F811": "Has redefinido un nombre (ya estaba definido). Renombra una de las variables o elimina la redefinición.",
        "F821": "Estás usando un nombre no definido. Revisa si falta un import, una definición o hay un typo.",
        "F823": "Variable local usada antes de asignarse. Asegúrate de asignarla antes de usarla.",
        # Pycodestyle (E/W)
        "E501": "Divide la línea o reformatea para respetar la longitud máxima.",
        "E711": "Para comparar con None usa 'is None' o 'is not None' (no '== None').",
        "E712": "Evita '== True/False'. Usa 'if cond:' / 'if not cond:' (o 'is True/False' si buscas identidad).",
        "E722": "Evita 'except:' a secas. Captura una excepción concreta o usa 'except Exception:' si procede.",
        # Pyupgrade (UP)
        "UP006": "Si tu proyecto usa Python 3.9+, cambia typing.List/Dict por list[]/dict[] (PEP 585).",
        "UP007": "Si tu proyecto usa Python 3.10+, usa 'X | Y' en vez de 'Union[X, Y]' (PEP 604).",
        # isort/imports (I)
        "I001": "Ordena los imports y mantén un orden consistente.",
    }

    if rule_code in tips:
        return tips[rule_code]

    # Sugerencias genéricas según la familia/prefijo de la regla
    prefix = rule_code[:1] if rule_code else ""

    if prefix == "F":
        return "Revisa variables/imports; suele indicar problemas de uso (p. ej., imports o nombres no definidos)."
    if prefix in ("E", "W"):
        return ("Ajusta estilo/formato; revisa el mensaje y aplica la corrección sugerida.")
    if prefix == "I":
        return "Reordena los imports y mantén un orden consistente."
    if prefix == "N":
        return "Revisa las convenciones de nombres (PEP 8): clases, funciones, variables, constantes."
    if rule_code.startswith("UP"):
        return "Moderniza la sintaxis según tu versión de Python (pyupgrade)."

    return "Revisa este aviso y ajusta el código según la recomendación."
