import os
import re
import subprocess
import tempfile
from typing import Any, Dict, List, Optional

from analysis.utils import to_int


def analyze_types(
    code: str, options: Optional[Dict[str, Any]] = None, timeout_seconds: int = 10
) -> List[Dict[str, Any]]:
    """
    Ejecuta javac sobre el código Java del usuario para detectar errores de tipos y compilación.

    Devuelve una lista de issues normalizados.
    """
    options = options or {}

    # Ejecutamos la herramienta en un directorio temporal para aislar el análisis
    # y evitar escribir archivos en el sistema del usuario
    with tempfile.TemporaryDirectory(prefix="tfg_java_types_") as tmpdir:

        # Elegimos filename intentando respetar la regla de Java:
        # si hay una clase pública "X", el fichero debe llamarse X.java
        filename = _pick_java_filename(code)
        file_path = os.path.join(tmpdir, filename)

        # Guardamos el código del usuario en un archivo temporal .java (ya que javac no acepta el código por stdin).
        with open(file_path, "w", encoding="utf-8", newline="\n") as f:
            f.write(code)

        # Carpeta de salida para los .class generados por javac (no ensuciamos el directorio temporal raíz).
        out_dir = os.path.join(tmpdir, "out")
        os.makedirs(out_dir, exist_ok=True)

        # Construimos el comando de javac para analizar el código desde un archivo y obtener salida.
        cmd = _build_javac_command(filename, out_dir, options)

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
                "javac no está instalado o no se encuentra en el PATH (necesitas un JDK)."
            ) from exc

    # javac suele devolver:
    # - 0: compilación correcta (puede haber warnings, pero no hay errores)
    # - 1: errores de compilación (issues de tipo/compilación)
    # - 2: error de uso/argumentos (flags inválidas o sintaxis de comando)
    # - 3/4: error interno o finalización anómala (fallo de herramienta/entorno)

    # javac normalmente escribe diagnósticos en stderr
    raw = (result.stderr or "").strip()
    if not raw:
        # Si no hay salida en stderr, miramos en stdout
        raw = (result.stdout or "").strip()

    # Si no hay salida, entonces no hay issues
    if not raw:
        if result.returncode == 0:
            return []
        if options:
            raise ValueError("Opciones inválidas para javac o salida vacía.")
        raise RuntimeError(f"javac falló (exit code {result.returncode}).")

    # returncode 2 --> error de argumentos/uso (flags inválidas)
    if result.returncode == 2:
        # Si el usuario pasó opciones, entonces el error es por opciones inválidas
        if options:
            raise ValueError("Opciones inválidas para javac.")
        raise RuntimeError(f"javac falló (exit code {result.returncode}).")

    diagnostics = _parse_javac_output(raw)

    issues: List[Dict[str, Any]] = []
    for diag in diagnostics:
        if isinstance(diag, dict):
            issues.append(_normalize_javac_issue(diag))

    # Si javac devolvió error y no hemos podido extraer issues, es salida inesperada
    if result.returncode != 0 and not issues:
        if options:
            raise ValueError("Opciones inválidas para javac o salida inesperada.")
        raise RuntimeError(f"javac falló (exit code {result.returncode}).")

    return issues


# -----------------------
# Build command
# -----------------------


def _build_javac_command(filename: str, out_dir: str, options: Dict[str, Any]) -> List[str]:
    """
    Construye el comando de javac, aplicando opciones de entrada.

    Options soportadas:
    - release: int (ej. 17, 21)
    - lint: true/false
    """
    cmd = [
        "javac", # Compilador de Java
        "-encoding", "UTF-8", # Fuerza la codificación a UTF-8
        "-d", out_dir, # Directorio donde se generan los .class
    ]

    # ------- release -------
    # Fija la versión objetivo de Java para la compilación.
    # Javac validará la sintaxis según esa versión.
    release = options.get("release")
    if release is not None:
        if not isinstance(release, int) or release <= 0:
            raise ValueError("options.types.release debe ser un entero positivo (por ejemplo 17 o 21).")
        cmd += ["--release", str(release)]

    # ------- lint -------
    # Si está activado, agregamos -Xlint para que javac también muestre warnings de "type_safety"
    # Si está desactivado, solo reporta errores (cuando el código no compila).
    lint = options.get("lint")

    # Activa warnings de -Xlint relacionados con genéricos (unchecked y rawtypes)
    if lint is True:
        cmd += ["-Xlint:unchecked", "-Xlint:rawtypes"]     

    elif lint not in (None, False):
        raise ValueError("options.types.lint debe ser boolean (true/false).")

    cmd.append(filename)
    return cmd


# ----------------------------------
# Parsing / Normalización
# ----------------------------------

# Cabecera típica de javac:
# Input.java:5: error: cannot find symbol
# Input.java:12: warning: [unchecked] unchecked conversion
_JAVAC_HEADER_RE = re.compile(
    r"^(?P<path>.+?\.java):(?P<line>\d+):\s+(?P<kind>error|warning):\s+(?P<msg>.+)$"
)

# Extrae códigos tipo [unchecked], [rawtypes], [deprecation] que aparecen en warnings con -Xlint
_JAVAC_LINT_CODE_RE = re.compile(r"\[(?P<code>[a-zA-Z0-9_-]+)\]")


def _parse_javac_output(raw: str) -> List[Dict[str, Any]]:
    """
    Convierte el output de javac (texto plano) en una lista estructurada de diagnósticos.
    Cada diagnóstico contiene:
      - path, line, kind (error|warning), msg, block, etc.
      - block: líneas asociadas (código, marcador '^', notas, etc.)
    El output típico de javac tiene esta estructura:
    
      Input.java:10: error: incompatible types
          int x = "hola";
                  ^
      1 error
    """

    # Dividimos el texto completo en líneas individuales,
    # eliminando solo el salto de línea final (\n)
    lines = [line.rstrip("\n") for line in raw.splitlines()]

    diagnostics: List[Dict[str, Any]] = []
    current: Optional[Dict[str, Any]] = None  # Diagnóstico en construcción

    for line in lines:
        # Intentamos detectar si la línea es una cabecera de diagnóstico
        match = _JAVAC_HEADER_RE.match(line.strip())
        if match:
            # Si ya estábamos construyendo un diagnóstico,
            # lo cerramos y lo agregamos a la lista
            if current is not None:
                diagnostics.append(current)

            # Creamos un nuevo diagnóstico a partir de la cabecera detectada
            current = {
                "path": match.group("path"),
                "line": to_int(match.group("line")),
                "kind": (match.group("kind") or "").strip().lower(),
                "msg": (match.group("msg")or "").strip(),
                "block": [],
            }
            continue
        
        # Si todavía no hemos encontrado una cabecera, ignoramos la línea
        if current is None:
            continue

        # Líneas asociadas al diagnóstico (código, notas, etc.)
        block = current.get("block")
        if isinstance(block, list):
            block.append(line)

    # Agregamos el último diagnóstico pendiente
    if current is not None:
        diagnostics.append(current)

    return diagnostics


def _normalize_javac_issue(diag: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normaliza un diagnóstico de javac al formato de issue del sistema.
    """

    # Obtenemos los campos relevantes a partir del diagnóstico sin normalizar
    raw_msg = str(diag.get("msg") or "").strip()
    kind = str(diag.get("kind") or "").strip().lower()

    block = diag.get("block")
    if not isinstance(block, list):
        block = []

    lint_code = _extract_lint_code(raw_msg)
    clean_msg = _remove_lint_prefix(raw_msg)

    column = _extract_column_from_block(block)

    severity = "error" if kind == "error" else "warning"

    # Construimos el issue normalizado en base a los campos obtenidos
    return {
        "tool": "javac",
        "category": "types",
        "code": lint_code or "",
        "message": clean_msg,
        "severity": severity,
        "line": to_int(diag.get("line")),
        "column": column,
        "suggestion": _suggestion_for_javac(clean_msg, lint_code),
    }


def _extract_lint_code(msg: str) -> Optional[str]:
    """
    Extrae el código de advertencia de javac cuando se usa la opción -Xlint.

    En estos casos, javac puede poner al principio del mensaje un identificador
    entre corchetes, por ejemplo:
        "[unchecked] unchecked cast"

    Devuelve el código sin corchetes y en minúsculas (ej. "unchecked"),
    o None si no se detecta ningún identificador.
    """
    match = _JAVAC_LINT_CODE_RE.search(msg or "")
    if not match:
        return None
    code = (match.group("code") or "").strip().lower()
    return code or None


def _remove_lint_prefix(msg: str) -> str:
    """
    Elimina el prefijo de código de lint (ej. "[unchecked]") del mensaje
    para dejar solo el texto descriptivo.

    Solo elimina la primera aparición del patrón "[codigo]".
    """
    if not msg:
        return ""
    # elimina solo el primer [code]
    return _JAVAC_LINT_CODE_RE.sub("", msg, count=1).strip() # Devuelve el msg original si no se encuentra el patrón


def _extract_column_from_block(block: List[str]) -> Optional[int]:
    """
    Extrae la columna del error a partir del bloque textual de javac.

    Busca el carácter '^' que indica la posición del problema
    y devuelve su índice como columna.
    """
    for line in block:
        if "^" in line:
            idx = line.find("^")
            if idx >= 0:
                return idx + 1 # Sumamos 1 ya que Java usa columnas empezando en 1 (no 0)
    return None


# -----------------------------------
# Helpers / Sugerencias
# -----------------------------------

# Detecta declaraciones de tipos públicos en Java (class, interface, enum, record, @interface)
# y captura el nombre del tipo para poder generar un nombre de archivo válido (<Nombre>.java).
_PUBLIC_TYPE_RE = re.compile(
    r"\bpublic\s+(?:\w+\s+)*?(?:class|interface|enum|record|@interface)\s+([A-Za-z_][\w$]*)\b"
)

def _pick_java_filename(code: str) -> str:
    """
    Si detectamos un tipo público (public class X / public interface X / ...),
    el fichero se llamará X.java para evitar el error:
    'class X is public, should be declared in a file named X.java'.
    """
    match = _PUBLIC_TYPE_RE.search(code or "")
    if match:
        name = (match.group(1) or "").strip()
        if name:
            return f"{name}.java"
    return "Input.java"


def _suggestion_for_javac(message: str, lint_code: Optional[str]) -> str:
    """
    Devuelve una sugerencia a partir del código de regla de javac.
    """
    msg = (message or "").lower()
    code = (lint_code or "").lower()

    # Warnings típicos de -Xlint
    if code == "unchecked":
        return "Evita conversiones sin comprobar (unchecked). Revisa el uso de genéricos y añade tipos explícitos o casts seguros."
    if code == "rawtypes":
        return "Evita usar tipos raw (sin genéricos). Especifica el tipo, por ejemplo List<String> en lugar de List."
    if code == "deprecation":
        return "Estás usando una API marcada como obsoleta (deprecated). Revisa la documentación y usa la alternativa recomendada."

    # Sugerencias específicas para las reglas más comunes
    if "cannot find symbol" in msg:
        return "Revisa nombres (posibles typos), imports y que la clase/variable/método exista en el alcance actual."
    if "incompatible types" in msg:
        return "Asegúrate de que los tipos coinciden. Revisa asignaciones, valores de retorno y uso de genéricos."
    if "package" in msg and "does not exist" in msg:
        return "El package no existe en el classpath. Revisa el import o añade la dependencia correspondiente."
    if "class" in msg and "is public" in msg and "should be declared in a file named" in msg:
        return "El nombre del archivo debe coincidir con la clase pública. Renombra la clase o el archivo."
    if "reached end of file while parsing" in msg or ("';' expected" in msg) or ("'}' expected" in msg):
        return "Parece un error de sintaxis (llaves/puntos y coma). Revisa que el código esté completo y correctamente cerrado."
    if "class, interface, enum, or record expected" in msg:
        return "Parece que hay código fuera de una clase o la estructura Java no es válida. Asegúrate de declarar una clase."
    if "missing return statement" in msg:
        return "Falta devolver un valor en un método cuyo tipo de retorno no es void."

    return "Revisa el mensaje de javac y ajusta el código para corregir el error de compilación."