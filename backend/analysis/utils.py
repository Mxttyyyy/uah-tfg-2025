from typing import Any, Optional

def to_int(value: Any) -> Optional[int]:
    """
    Intenta convertir el valor a entero (no usamos el casteo int(), ya que necesitamos controlar posibles valores None)
    """
    try:
        if value is None:
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def is_str_list(value: Any) -> bool:
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