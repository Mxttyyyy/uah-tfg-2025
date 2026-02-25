from typing import Any, Optional
import re
def to_int(value: Any) -> Optional[int]:
    """
    Intenta convertir el valor a entero (no usamos el casteo int() directamente, ya que necesitamos controlar posibles valores None)
    """
    try:
        if value is None:
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def to_float(value: Any) -> Optional[float]:
    """
    Intenta convertir el valor a float
    """
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def is_str_list(value: Any) -> bool:
    """
    Comprueba si el valor es una lista de strings
    """
    if not isinstance(value, list):
        return False

    # Lista vacía []
    if not value:
        return False

    for x in value:
        if not isinstance(x, str):
            return False
        if x.strip() == "":  # Vacío o solo espacios
            return False

    return True

# Expresión regular para detectar cualquier declaración de tipo (pública o no)
_TYPE_DECL_RE = re.compile(r"\b(class|interface|enum|record|@interface)\b")

def is_probably_java(code: str, timeout_seconds: int = 5) -> bool:
    """
    Valida Java usando javac.
    Devuelve True si compila sintácticamente.
    """
    import tempfile
    import os
    import subprocess

    src = code or ""
    
    # Si no hay ninguna clase/interfaz/enum/record, lo consideramos Java inválido
    # Evita snippets sueltos tipo "int x = 5;"
    if not _TYPE_DECL_RE.search(src):
        return False

    with tempfile.TemporaryDirectory() as tmpdir:
        filename = _pick_java_filename(code)
        file_path = os.path.join(tmpdir, filename)

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(code)

        cmd = [
            "javac",
            "-encoding", "UTF-8",
            "--release", "17",
            "-proc:none",
            file_path,
        ]

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
                cwd=tmpdir,
            )
        except FileNotFoundError:
            raise RuntimeError("javac no está instalado o no está en el PATH.")

    output = ((result.stderr or "") + (result.stdout or "")).lower()
    output = output.lower()
    print(result.returncode, output)
    # Detectamos errores típicos de sintaxis pura
    syntax_indicators = [
        "reached end of file while parsing",
        "';' expected",
        "'}' expected",
        "'{' expected",
        "class, interface, enum, or record expected",
        "illegal start of type",
        "illegal character",
        "not a statement",
    ]

    for indicator in syntax_indicators:
        if indicator in output:
            return False

    # Si no detectamos errores de sintaxis estructural,
    # consideramos que es Java válido (aunque tenga errores semánticos)
    return True
    
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
