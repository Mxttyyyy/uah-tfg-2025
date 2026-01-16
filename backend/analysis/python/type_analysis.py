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
        return [] # No hay issues

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
            issues[last_issue_index]["help_url"] = help_url # Asociamos el enlace de ayuda al último issue detectado
            continue

        # Extraemos los campos relevantes de la línea
        fields = _extract_mypy_fields(line)
        if not fields:
            continue

        issues.append(_normalize_mypy_issue(fields))
        last_issue_index = len(issues) - 1

    # Si Mypy devuelve un returncode raro pero hemos podido parsear issues, lo damos por válido.
    # Si no hay issues y el returncode es raro, lo tratamos como error.
    if result.returncode not in (0, 1) and not issues:
        stderr = (result.stderr or "").strip()
        raise RuntimeError(stderr or f"Mypy falló con un error (exit code {result.returncode}).")

    return issues


def _build_mypy_command(filename: str, options: Dict[str, Any]) -> List[str]:
    """
    Construye el comando de Mypy, aplicando opciones de entrada.

    Opciones permitidas:
    - ignore_missing_imports
    - python_version
    - strict
    - enable_error_codes
    - disable_error_codes
    """
    cmd = [
        "mypy", # Herramienta empleada
        "--config-file=", # Ignora cualquier configuración local (mypy.ini/pyproject)
        "--no-error-summary", # Quita la línea resumen final
        "--no-color-output", # Desactiva el color en la salida para obtener texto plano fácil de procesar
        "--show-error-end", # Incluye el rango completo (inicio/fin) del error para un marcado más preciso
        "--show-error-code-links", # Agrega una nota con URL a la documentación del código
        "--follow-imports", "skip", # Evita analizar dependencias externas no incluidas explícitamente en el código del usuario
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
    Este tipo de líneas aparecen al usar la opción --show-error-code-links.
    """
    # Ejemplo de línea esperada:
    # input.py:8: note: See 'https://...' for more info

    marker = "See '"
    if "note:" not in line or marker not in line:
        return None

    # Localizamos el inicio de la URL
    start = line.find(marker)
    if start == -1:
        return None
    start += len(marker)

    # Localizamos el final de la URL (comilla de cierre)
    end = line.find("'", start)
    if end == -1:
        return None

    # Extraemos y validamos la URL
    url = line[start:end].strip()
    return url if url.startswith(("http://", "https://")) else None


def _normalize_mypy_issue(line: str) -> Dict[str, Any]:
    """
    Normaliza las líneas devueltas por Vulture a un formato base.
    Se extrae la información relevante para el usuario y se descartan campos que el usuario no necesita.
    Formato de línea devuelta por Vulture:  <path>: <message> (NN% confidence).
    Por ejemplo: input.py:1: unused import 'os' (90% confidence)
    """
    if not line:
        return None

    # Dividimos la linea en tres partes: archivo, número de línea y mensaje
    parts = line.split(":", 2)
    if len(parts) != 3:
        return None

    # Obtenemos cada parte
    path = parts[0].strip() or "input.py"  # Obtenemos: "input.py"
    line_number = to_int(parts[1].strip())  # Obtenemos: "1"
    raw_message = parts[2].strip()  # Obtenemos: "unused import 'os' (90% confidence)"

    # A partir de raw_msg se obtiene la información necesaria para clasificar el issue
    message, confidence = _extract_confidence(raw_message)  # Obtenemos --> "unused import 'os'", 90

    rule_code = _rule_code_from_message(message)
    severity = _severity_from_confidence(confidence)
    suggestion = _suggestion_for_vulture_rule(rule_code, message)

    return {
        "tool": "vulture",
        "category": "dead_code",
        "code": rule_code,
        "message": message,
        "severity": severity,
        "path": path,
        "line": line_number,
        "column": None,  # Vulture no proporciona información de columnas
        "suggestion": suggestion,
        "confidence": confidence,
    }


def _extract_mypy_fields(raw_msg: str) -> tuple[str, Optional[int]]:
    """
    Extrae el mensaje y el porcentaje de confianza incluido en un mensaje de Vulture.
    Formato de entrada esperado: "<message> (NN% confidence)".
    Por ejemplo: "unused import 'os' (90% confidence)"
    """
    # Comprobación para descartar mensajes que no contienen confianza
    if " (" not in raw_msg or not raw_msg.endswith(")"):
        return raw_msg, None

    # Separamos y obtenemos ambos campos
    msg_part, tail = raw_msg.rsplit(" (", 1)  # Obtenemos --> msg_part: "<unused import 'os'>", tail: "90% confidence)"
    tail = tail[:-1].strip()  # Obtenemos --> tail: "90% confidence"

    # Validación del formato esperado
    if not tail.endswith("confidence") or "%" not in tail:
        return raw_msg, None

    # Obtenemos el valor numérico de la confianza
    num_str = tail.split("%", 1)[0].strip()  # num_str: "90"

    return msg_part.strip(), to_int(num_str)


def _rule_code_from_message(message: str) -> str:
    """
    Genera un código interno sencillo a partir del mensaje de Vulture.
    Por ejemplo:
      "unused import 'x'" -> "unused-import"
      "unused function 'f'" -> "unused-function"
      "unreachable code after ..." -> "unreachable-code"
    """
    msg = (message or "").strip().lower()

    # Caso 1: elementos no usados ("unused import", "unused function", etc.)
    if msg.startswith("unused "):
        parts = msg.split(" ", 2)  # ["unused", "<tipo>", ...]
        if len(parts) >= 2:
            return f"unused-{parts[1]}"  # Por ejemplo: "unused-import", "unused-function", etc.
        return "unused"

    # Caso 2: código inalcanzable ("unreachable code")
    if msg.startswith("unreachable code"):
        return "unreachable-code"

    return "dead-code"


def _severity_from_confidence(confidence: Optional[int]) -> str:
    """
    Mapea los valores de confianza a los niveles de severidad del sistema (error, warning, info).
    - >= 90: warning
    - < 90: info
    *El nivel de error en este caso no se usa, ya que Vulture no detecta errores de ejecución ni fallos críticos del código.*
    """
    if confidence is None or confidence >= 90:
        return "warning"

    return "info"


def _suggestion_for_vulture_rule(rule_code: str, message: str) -> str:
    """
    Genera una sugerencia explicativa a partir del código de regla generado por una advertencia de Vulture.
    """
    # Sugerencias específicas para las reglas generadas
    tips = {
        "unused-import": "Elimina este import, ya que no se utiliza.",
        "unused-import-from": "Elimina este import específico, ya que no se utiliza.",
        "unused-variable": "Elimina esta variable si no se utiliza. Si es intencional, usa '_' al inicio.",
        "unused-argument": "Elimina este argumento si no se utiliza o renómbralo con '_' si es obligatorio.",
        "unused-function": "Elimina esta función si no se utiliza o añade una llamada real.",
        "unused-method": "Elimina este método si no se utiliza o revisa si se llama de forma dinámica.",
        "unused-class": "Elimina esta clase si no se utiliza o revisa si se instancia o se usa indirectamente.",
        "unused-attribute": "Elimina este atributo si no se utiliza o revisa accesos dinámicos.",
        "unused-property": "Elimina esta propiedad si no se utiliza o revisa accesos indirectos.",
        "unreachable-code": "Elimina este código inalcanzable o reestructura el flujo (return/raise/break antes).",
    }
    if rule_code in tips:
        return tips[rule_code]

    if message:
        return "Revisa este aviso: puede ser un falso positivo si hay usos dinámicos."

    return "Revisa este aviso."
