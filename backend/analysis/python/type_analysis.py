import re
import subprocess
import tempfile
import os
from typing import Any, Dict, List, Optional

from analysis.utils import to_int, is_str_list


def analyze_types(
    code: str, options: Optional[Dict[str, Any]] = None, timeout_seconds: int = 10
) -> List[Dict[str, Any]]:
    """
    Ejecuta la herramienta Mypy sobre el código del usuario 'code'.
    Devuelve una lista de issues normalizados.
    """
    options = options or {}

    # Ejecutamos la herramienta en un directorio temporal para aislar el análisis
    # y evitar escribir archivos en el sistema del usuario
    with tempfile.TemporaryDirectory(prefix="tfg_types_") as tmpdir:
        filename = "input.py"
        file_path = os.path.join(tmpdir, filename)

        # Guardamos el código del usuario en un archivo temporal (ya que Mypy no acepta el código por stdin).
        with open(file_path, "w", encoding="utf-8", newline="\n") as file:
            file.write(code)

        # Construimos el comando de Mypy para analizar el código desde un archivo y obtener salida.
        cmd = _build_mypy_command(filename, options)

        try:
            # Ejecutamos la herramienta externa mediante subprocess y capturamos su salida
            result = subprocess.run(
                cmd,
                text=True,
                capture_output=True,
                cwd=tmpdir,
                timeout=timeout_seconds,
            )
        except FileNotFoundError as exc:
            raise RuntimeError(
                "Mypy no está instalado o no se encuentra en el PATH."
            ) from exc

    # Mypy devuelve:
    # - return code 0: sin issues
    # - return code 1: con issues
    # - otros códigos: errores de ejecución o configuración de Mypy; aun así intentamos parsear la salida por si trae issues
    # - stdout: salida normal de Mypy (en nuestro caso, un único string multilínea)
    # - stderr: mensajes de error/advertencia de Mypy

    # Comprobamos la salida cruda de Mypy (sin normalizar)
    raw = (result.stdout or "").strip()
    if not raw:
        raw = (result.stderr or "").strip()

    if not raw:
        return []  # No hay issues

    issues: List[Dict[str, Any]] = []
    last_issue_index: Optional[int] = None

    # Recorremos la salida de mypy
    for line in raw.splitlines():  # divide el output (un único string multilínea) en una lista de líneas
        line = line.strip()
        if not line:
            continue

        # Quitamos líneas de resumen típicas ("Found X errors..." , "Success: no issues found...", etc.)
        if line.startswith("Found ") or line.startswith("Success:"):
            continue

        # Si se activa la opción --show-error-code-links, Mypy devuelve 2 líneas para un mismo issue, por ejemplo:
        # input.py:3: error: Incompatible types in assignment  [assignment]
        # input.py:3: note: See 'https://...' for more info
        # Para estos casos, se asocia la URL al último issue detectado mediante la variable last_issue_index
        help_url = _extract_help_url_from_note(line)
        
        if help_url and last_issue_index is not None:
            issues[last_issue_index]["help_url"] = help_url  # Asociamos el enlace de ayuda al último issue detectado
            continue
        
        # Extraemos los campos relevantes de la línea
        fields = _extract_mypy_fields(line)
        if not fields:
            continue
        
        # Si es note pero no es URL, no la tratamos como issue separado:
        # la guardamos como "nota" dentro del último issue.
        if fields.get("kind") == "note":
            if last_issue_index is not None:
                issues[last_issue_index].setdefault("notes", []).append(str(fields.get("msg") or "").strip())
                continue
        
        # Si es ERROR, lo normalizamos y lo annadimos como issue
        issues.append(_normalize_mypy_issue(fields))
        last_issue_index = len(issues) - 1

    # Si Mypy devuelve un returncode raro pero hemos podido parsear issues, lo damos por válido.
    # Si no hay issues y el returncode es raro, lo tratamos como error.
    if result.returncode not in (0, 1) and not issues:
        stderr = (result.stderr or "").strip()
        raise RuntimeError(
            stderr or f"Mypy falló con un error (exit code {result.returncode})."
        )

    return issues


def _build_mypy_command(filename: str, options: Dict[str, Any]) -> List[str]:
    """
    Construye el comando de Mypy, aplicando opciones de entrada.

    Opciones permitidas:
    - ignore_missing_imports
    - python_version
    - strict
    - show_error_code_links
    - enable_error_codes
    - disable_error_codes
    """
    cmd = [
        "mypy",  # Herramienta empleada
        "--config-file=",  # Ignora cualquier configuración local (mypy.ini/pyproject)
        "--no-error-summary",  # Quita la línea resumen final
        "--no-color-output",  # Desactiva el color en la salida para obtener texto plano fácil de procesar
        "--show-error-end",  # Incluye el rango completo (inicio/fin) del error para un marcado más preciso
        "--follow-imports", "skip",  # Evita analizar dependencias externas no incluidas explícitamente en el código del usuario
    ]

    # En el código del usuario, los imports pueden no resolverse, por lo que Mypy los ignora por defecto
    ignore_missing = options.get("ignore_missing_imports", True)
    if isinstance(ignore_missing, bool) and ignore_missing:
        cmd.append("--ignore-missing-imports")

    # Permite fijar versión de Python
    py_version = options.get("python_version")
    if isinstance(py_version, str) and py_version.strip():
        cmd += ["--python-version", py_version.strip()]

    # Modo estricto (opcional, ya que activa muchas comprobaciones adicionales)
    if options.get("strict") is True:
        cmd.append("--strict")

    # Agrega una nota con URL a la documentación del código
    show_error_code_links = options.get("show_error_code_links", False)
    if isinstance(show_error_code_links, bool) and show_error_code_links:
        cmd.append("--show-error-code-links")

    # Activar o desactivar códigos de error concretos (listas de strings)
    enable_codes = options.get("enable_error_codes")
    disable_codes = options.get("disable_error_codes")

    if is_str_list(enable_codes):
        for c in enable_codes:
            cmd += ["--enable-error-code", c]

    if is_str_list(disable_codes):
        for c in disable_codes:
            cmd += ["--disable-error-code", c]

    cmd.append(filename)
    return cmd


# -----------------
# Normalización
# -----------------


def _extract_help_url_from_note(line: str) -> Optional[str]:
    """
    Extrae la URL de ayuda incluida en una línea 'note' de Mypy.
    Este tipo de líneas aparecen al usar la opción --show-error-code-links en el comando de ejecución de Mypy
    y no representan un issue nuevo, sino información adicional asociada al error previo.

    Ejemplo de línea esperada:
    - input.py:8: note: See https://... for more info
    """

    if "note:" not in line:
        return None
 
    # Buscamos directamente una URL dentro de la línea
    for token in line.split():
        if token.startswith(("http://", "https://")):
            return token.strip()

    return None


# Expresión regular para parsear una línea de salida de Mypy.
# Ejemplos de líneas de salida de Mypy:
#  input.py:3: error: mensaje
#  input.py:3:5: error: mensaje
#  input.py:3:5:7:9: note: mensaje

_MYPY_RE = re.compile(
    r"^(?P<path>.+?):"  # Ruta del archivo (hasta el primer ':')
    r"(?P<line>\d+)"  # Número de línea
    r"(?::(?P<col>\d+))?"  # Columna inicial (campo opcional)
    r"(?::(?P<end_line>\d+))?"  # Línea final del rango (campo opcional)
    r"(?::(?P<end_col>\d+))?"  # Columna final del rango (campo opcional)
    r":\s+(?P<kind>error|note):"  # Tipo de diagnóstico (error o note)
    r"\s+(?P<msg>.+)$"  # Mensaje completo hasta el final de la línea
)


def _extract_mypy_fields(line: str) -> Optional[Dict[str, Any]]:
    """
    Extrae los campos relevantes de una linea de salida de Mypy.
    Esta función aplica una expresión regular sobre una línea del output de Mypy y, si el formato coincide,
    devuelve un diccionario con los campos extraídos.
    """

    # Intentamos hacer coincidir la línea completa con el patrón de Mypy
    m = _MYPY_RE.match(line)
    if not m:
        return None  # Línea no válida (falla la expresión regular)

    # Construimos el diccionario de salida
    return {
        "path": m.group("path"),
        "line": to_int(m.group("line")),
        "col": to_int(m.group("col")),
        "end_line": to_int(m.group("end_line")),
        "end_col": to_int(m.group("end_col")),
        "kind": m.group("kind"),
        "msg": m.group("msg"),
    }


def _normalize_mypy_issue(fields: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normaliza un issue detectado por Mypy a un formato base.
    Se extrae la información relevante para el usuario y se descartan campos que el usuario no necesita.
    """
    raw_msg = str(fields.get("msg") or "").strip()
    message, error_code = _extract_error_code(raw_msg)

    rule_code = error_code or ""

    # Mypy no usa warnings, solo distingue entre error y info
    severity = "error" if fields.get("kind") == "error" else "info"

    # Construimos el issue en base a los campos obtenidos
    issue: Dict[str, Any] = {
        "tool": "mypy",
        "category": "types",
        "code": rule_code,
        "message": message,
        "severity": severity,
        "path": str(fields.get("path") or "input.py"),
        "line": fields.get("line"),
        "column": fields.get("col"),  # Campo opcional, aunque forma parte de la localización básica del issue
        "suggestion": _suggestion_for_mypy_rule(rule_code, message),
    }

    # Campos opcionales menos frecuentes
    if fields.get("end_line") is not None:
        issue["end_line"] = fields.get("end_line")

    if fields.get("end_col") is not None:
        issue["end_column"] = fields.get("end_col")

    return issue


def _extract_error_code(message: str) -> tuple[str, Optional[str]]:
    """
    Extrae el código de error de Mypy si el mensaje termina en '[codigo_error]'.

    Por ejemplo:
    - "Incompatible types in assignment  [assignment]"
    Devuelve -> ("Incompatible types in assignment", "assignment")
    """
    message = message.strip()

    # Si no termina en ']', no hay código de error
    if not message.endswith("]"):
        return message, None

    # Divide el string en 3 partes --> msg_part: "Incompatible types in assignment  ", sep: "[", code_part: "assignment]"
    msg_part, sep, code_part = message.rpartition("[")

    if not sep:
        return message, None

    error_code = code_part[:-1].strip()  # quitamos el último carácter ']'
    if not error_code:
        return message, None

    clean_message = msg_part.strip()

    # Devolvemos el mensaje limpio y el código de error
    return clean_message, error_code


def _suggestion_for_mypy_rule(rule_code: str, message: str) -> str:
    """
    Genera una sugerencia explicativa a partir del código de regla emitido por Mypy.
    """
    # Sugerencias específicas para las reglas generadas
    tips = {
        "arg-type": "Revisa los tipos de los argumentos: el tipo esperado y el que estás pasando no coinciden.",
        "assignment": "Revisa la asignación: la variable y el valor tienen tipos incompatibles.",
        "return-value": "El tipo del valor que devuelves no coincide con el return type anotado.",
        "attr-defined": "Estás accediendo a un atributo que Mypy cree que no existe para ese tipo.",
        "name-defined": "Estás usando un nombre no definido (posible typo o falta de definición/import).",
        "operator": "Estás usando un operador con tipos incompatibles (por ejemplo, sumar int con str).",
        "call-arg": "Revisa los parámetros de la llamada (faltan args, sobran o tienen tipo incorrecto).",
        "index": "Revisa índices/claves: puede que el tipo no soporte indexación o la clave sea incorrecta.",
        "union-attr": "Estás accediendo a un atributo en una unión; asegúrate de acotar el tipo (if/isinstance).",
        "return-type": "El tipo de retorno inferido no coincide con el tipo anotado de la función.",
        "comparison-overlap": "La comparación siempre es falsa o redundante debido a tipos incompatibles.",
        "list-item": "Los elementos de la lista no coinciden con el tipo esperado.",
        "dict-item": "Las claves o valores del diccionario no coinciden con los tipos anotados.",
        "has-type": "Añade anotaciones de tipo explícitas para ayudar a Mypy a inferir correctamente.",
        "call-overload": "La llamada no coincide con ninguna sobrecarga (@overload). Ajusta el tipo del argumento o añade una variante @overload que acepte ese tipo."
    }

    if rule_code in tips:
        return tips[rule_code]

    # Si no tenemos un tip específico, devolvemos una sugerencia genérica
    if rule_code:
        return "Añade o ajusta anotaciones de tipo y revisa el mensaje; Mypy indica una incompatibilidad de tipos."

    if message:
        return "Revisa el mensaje de Mypy y ajusta las anotaciones/uso de tipos."

    return "Revisa el aviso de Mypy."
