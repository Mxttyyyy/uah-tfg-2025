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

    # Construimos el comando de Vulture para analizar el código desde stdin y obtener salida en JSON.
    cmd = _build_vulture_command(options)

    # Ejecutamos la herramienta en un directorio temporal para aislar el análisis
    # y evitar escribir archivos en el sistema del usuario
    with tempfile.TemporaryDirectory(prefix="tfg_dead_code_") as tmpdir:
        filename = "input.py"
        file_path = os.path.join(tmpdir, filename)
        
        # Guardamos el código del usuario en un archivo temporal (ya que Vulture no acepta el código por stdin).
        with open(file_path, "w", encoding="utf-8", newline="\n") as file:
            file.write(code)
        
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
        raise RuntimeError(stderr or stdout or f"Vulture falló con un error (exit code {result.returncode}).")

    raw = (result.stdout or "").strip()
    if not raw:
        return []  # No hay issues (código muerto)

    issues: List[Dict[str, Any]] = []
    for line in raw.splitlines(): # splitlines() divide el output (un único string con varias líneas) en una lista de líneas
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

    min_confidence = options.get("min_confidence", 60)
    if isinstance(min_confidence, int) and 0 <= min_confidence <= 100:
        cmd += ["--min-confidence", str(min_confidence)]

    ignore_names = options.get("ignore_names")
    if is_str_list(ignore_names):
        cmd += ["--ignore-names", ",".join(ignore_names)]

    ignore_decorators = options.get("ignore_decorators")
    if is_str_list(ignore_decorators):
        cmd += ["--ignore-decorators", ",".join(ignore_decorators)]

    cmd.append(filename)
    return cmd


def _normalize_vulture_line(line: str) -> Dict[str, Any]:
    """
    Normaliza las líneas devueltas por Vulture a un formato base.
    Se extrae la información relevante para el usuario y se descartan campos que el usuario no necesita.
    Formato de línea devuelta por Vulture:  input.py:1: unused import 'os' (90% confidence).
    """
    if not line:
        return None

    # Dividimos la linea en tres partes: archivo, número de línea y mensaje
    parts = line.split(":", 2)
    if len(parts) != 3:
        return None

    # Obtenemos cada parte
    path = parts[0].strip() or "input.py"
    line_no = to_int(parts[1].strip())
    raw_message = parts[2].strip()

    # A partir de raw_msg se obtiene la información necesaria para clasificar el issue
    message, confidence = _extract_confidence(raw_message)

    rule_code = _rule_code_from_message(message)
    severity = _severity_from_confidence(confidence)
    suggestion = _suggestion_for_rule(rule_code, message)

    return {
        "tool": "vulture",
        "category": "dead_code",
        "code": rule_code,
        "message": message,
        "severity": severity,
        "path": path,
        "line": line_no,
        "column": None, # Vulture no proporciona información de columnas
        "suggestion": suggestion,
        "confidence": confidence,
    }


def _extract_confidence(raw_msg: str) -> tuple[str, Optional[int]]:
    """
    Extrae el mensaje y el porcentaje de confianza incluido en un mensaje de Vulture.
    El formato esperado de entrada es: "<mensaje> (NN% confidence)".
    Por ejemplo: "unused import 'os' (90% confidence)"
    """
    # Comprobación para descartar mensajes que no contienen confianza
    if " (" not in raw_msg or not raw_msg.endswith(")"):
        return raw_msg, None

    # Separamos y obtenemos ambos campos
    msg_part, tail = raw_msg.rsplit(" (", 1)   # quedaría --> msg_part: "<mensaje>", tail: "90% confidence)"
    tail = tail[:-1].strip()               # quedaría --> tail: "90% confidence"

    # Validación del formato esperado
    if not tail.endswith("confidence") or "%" not in tail:
        return raw_msg, None

    # Obtenemos el valor numérico de la confianza
    num_str = tail.split("%", 1)[0].strip() # tail: "90"

    return msg_part.strip(), to_int(num_str)


def _severity_from_confidence(bandit_severity: str) -> str:
    """
    Mapea los niveles de severidad de Bandit (HIGH, MEDIUM, LOW) a los niveles normalizados del sistema (error, warning, info).
    """
    if bandit_severity == "HIGH":
        return "error" # Problema crítico
    if bandit_severity == "MEDIUM":
        return "warning"

    return "info"


def _suggestion_for_vulture_rule(rule_code: str, message: str) -> str:
    """
    Devuelve una sugerencia a partir del código de regla de Bandit.
    """
    # Sugerencias específicas para las reglas más comunes (En Bandit todas las reglas comienzan por "B")
    tips = {
        "B101": "Evita usar 'assert' para validaciones de seguridad; ya que pueden desactivarse cuando Python se ejecuta con optimización.",
        "B105": "Evita credenciales hardcodeadas en el código; utiliza variables de entorno o gestores de secretos.",
        "B301": "Evita 'yaml.load' sin safe_load; usa 'yaml.safe_load' para reducir riesgos.",
        "B307": "Evita el uso de 'eval'; puede ejecutar código arbitrario y supone un riesgo de seguridad.",
        "B404": "El módulo 'subprocess' puede ser peligroso si se usa con entradas no controladas; revisa su uso.",
        "B602": "Revisa el uso de 'subprocess'; ejecutar comandos construidos con entradas no confiables puede ser inseguro.",
        "B603": "Asegúrate de validar las entradas al usar 'subprocess' y evita patrones de ejecución inseguros.",
    }

    if rule_code in tips:
        return tips[rule_code]

    if message:
        return "Revisa esta alerta de seguridad y ajusta el código para evitar patrones inseguros."

    return "Revisa esta alerta de seguridad."
