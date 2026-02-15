from typing import Any, Optional

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

    if not value:
        return False

    for x in value:
        if not isinstance(x, str):
            return False
        if x.strip() == "":  # Vacío o solo espacios
            return False

    return True

def is_probably_java(code: str) -> bool:
    """
    Valida Java de forma best-effort usando javalang.
    Import lazy para no romper el arranque del backend si javalang no está instalado
    (p. ej. si solo analizas Python).
    """
    try:
        import javalang
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "Falta la dependencia 'javalang'. Instálala para validar Java."
        ) from exc

    candidates = [
        code,
        f"public class Input {{\n{code}\n}}\n",
        "public class Input {\n"
        "  public static void main(String[] args) {\n"
        f"{code}\n"
        "  }\n"
        "}\n",
    ]

    for src in candidates:
        try:
            javalang.parse.parse(src)
            return True
        except (
            javalang.parser.JavaSyntaxError,
            javalang.tokenizer.LexerError,
            IndexError,
            TypeError,
            StopIteration,
        ):
            continue

    return False
