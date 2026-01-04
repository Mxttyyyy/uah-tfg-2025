import json
import subprocess
import tempfile
from typing import Any, Dict, List, Optional


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
    # - stdout: salida normal de Ruff (en nuestro caso, el JSON de las issues)
    # - stderr: mensajes de error/advertencias de Ruff

    if result.returncode == 2:
        stderr = (result.stderr or "").strip()
        raise RuntimeError(stderr or "Ruff falló con un error (exit code 2).")

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
            issues.append(_normalize_ruff_issue(issue))  # Annadimos a la lista cada issue normalizado

    return issues


def _build_ruff_command(options: Dict[str, Any]) -> List[str]:
    """
    Construye el comando de Ruff, aplicando opciones de entrada.
    """
    cmd = [
        "ruff",  # Herramienta empleada
        "check",  # Modo lint
        "--isolated",  # Ignora cualquier config externa
        "--no-cache",  # Evita cache (para que el análisis depende solo del código actual)
        "--output-format",
        "json",  # Formato de salida JSON
        "--stdin-filename",
        "input.py",  # Archivo ficticio para tratar el código como .py
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


def _normalize_ruff_issue(issue: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normaliza el issue a un formato base.
    Eliminamos campos que el usuario no necesita (como cell, fix, url, etc.)
    """
    rule_code = str(issue.get("code") or "")
    message = str(issue.get("message") or "").strip()

    # filename = str(issue.get("filename") or "input.py")
    location = issue.get("location") if isinstance(issue.get("location"), dict) else {}
    line = _to_int(location.get("row"))
    column = _to_int(location.get("column"))

    suggestion = _suggestion_for_rule_code(rule_code, message)
    severity = _severity_from_rule_code(rule_code)

    help_url = issue.get("url")

    return {
        "tool": "ruff",
        "category": "style",
        "code": rule_code,
        "message": message,
        "severity": severity,
        # "path": filename,
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

    # Reglas que suelen indicar fallo real (en runtime o por sintaxis) (ampliable)
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


def _suggestion_for_rule_code(rule_code: str, message: str) -> str:
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
        return "Ajusta estilo/formato; revisa el mensaje y aplica la corrección sugerida."
    if prefix == "I":
        return "Reordena los imports y mantén un orden consistente."
    if prefix == "N":
        return "Revisa las convenciones de nombres (PEP 8): clases, funciones, variables, constantes."
    if rule_code.startswith("UP"):
        return "Moderniza la sintaxis según tu versión de Python (pyupgrade)."

    if message:
        return "Revisa este aviso y ajusta el código según la recomendación."

    return "Revisa este aviso."


def _to_int(value: Any) -> Optional[int]:
    """
    Intenta convertir el valor a entero (no usamos el casteo int(), ya que necesitamos controlar posibles valores None)
    """
    try:
        if value is None:
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def _is_str_list(value: Any) -> bool:
    """
    Comprueba si el valor es una lista de strings
    """
    if not isinstance(value, list):
        return False

    for x in value:
        if not isinstance(x, str):
            return False
        if x.strip() == "":  # Vacío o solo espacios
            return False

    return True
