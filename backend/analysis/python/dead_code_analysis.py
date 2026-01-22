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

    # Ejecutamos la herramienta en un directorio temporal para aislar el análisis
    # y evitar escribir archivos en el sistema del usuario
    with tempfile.TemporaryDirectory(prefix="tfg_dead_code_") as tmpdir:
        filename = "input.py"
        file_path = os.path.join(tmpdir, filename)

        # Guardamos el código del usuario en un archivo temporal (ya que Vulture no acepta el código por stdin).
        with open(file_path, "w", encoding="utf-8", newline="\n") as file:
            file.write(code)

        # Construimos el comando de Vulture para analizar el código desde un archivo y obtener salida.
        cmd = _build_vulture_command(filename, options)

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
                "Vulture no está instalado o no se encuentra en el PATH."
            ) from exc

    # Vulture devuelve:
    # - return code 0: no se ha detectado dead code
    # - return code 3: dead code encontrado
    # - return code 1: error al analizar el archivo (entrada inválida, sintaxis, etc.)
    # - return code 2: argumentos inválidos de Vulture
    # - stdout: informe de Vulture en texto plano (un único string multilínea).
    #   Cada línea describe un elemento no utilizado (imports, variables, funciones o clases)
    # - stderr: mensajes de error/advertencia de Vulture

    if result.returncode in (1, 2):
        stderr = (result.stderr or "").strip()
        stdout = (result.stdout or "").strip()
        if options:
            raise ValueError(
                stderr or stdout or "Opciones inválidas para Vulture."
            )
        raise RuntimeError(
            stderr or stdout or f"Vulture falló con un error (exit code {result.returncode})."
            )

    raw = (result.stdout or "").strip()
    if not raw:
        return []  # No hay issues (código muerto)

    issues: List[Dict[str, Any]] = []
    for line in raw.splitlines():  # splitlines() divide el output (un único string multilínea) en una lista de líneas
        parsed = _normalize_vulture_line(line.strip())
        if parsed:
            issues.append(parsed)

    return issues


def _build_vulture_command(filename: str, options: Dict[str, Any]) -> List[str]:
    """
    Construye el comando de Vulture, aplicando las opciones de entrada.

    Opciones permitidas:
    - --min-confidence N: filtra por confianza (60..100 típicamente).
    - --ignore-names: ignora nombres por patrón.
    - --ignore-decorators: ignora funciones decoradas por ciertos decoradores, como @app.post().
    """
    cmd = ["vulture"]

    # Validamos los campos
    min_confidence = options.get("min_confidence", 60)
    if isinstance(min_confidence, int) and 0 <= min_confidence <= 100:
        cmd += ["--min-confidence", str(min_confidence)]

    ignore_names = options.get("ignore_names")
    if is_str_list(ignore_names):
        cmd += ["--ignore-names", ",".join(i_n.strip().upper() for i_n in ignore_names)]

    ignore_decorators = options.get("ignore_decorators")
    if is_str_list(ignore_decorators):
        cmd += ["--ignore-decorators", ",".join(i_d.strip().upper() for i_d in ignore_decorators)]

    cmd.append(filename)
    return cmd


# -----------------
# Normalización
# -----------------


def _normalize_vulture_line(line: str) -> Dict[str, Any]:
    """
    Normaliza las líneas devueltas por Vulture a un formato base.
    Se extrae la información relevante para el usuario y se descartan campos que el usuario no necesita.
    - Formato de línea devuelta por Vulture:  <path>: <message> (NN% confidence).
    - Por ejemplo: input.py:1: unused import 'os' (90% confidence)
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
    suggestion = _suggestion_for_vulture_rule(rule_code)

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


def _extract_confidence(raw_msg: str) -> tuple[str, Optional[int]]:
    """
    Extrae el mensaje y el porcentaje de confianza incluido en un mensaje de Vulture.
    - Formato de entrada esperado: "<message> (NN% confidence)".
    - Por ejemplo: "unused import 'os' (90% confidence)"
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
        parts = msg.split(" ", 2)  # Obtenemos: ["unused", "<tipo>", ...]
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


def _suggestion_for_vulture_rule(rule_code: str) -> str:
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

    return "Revisa este aviso: puede ser un falso positivo si hay usos dinámicos."
