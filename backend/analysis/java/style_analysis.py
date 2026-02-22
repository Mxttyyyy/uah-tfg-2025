import os
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from typing import Any, Dict, List, Optional

from analysis.utils import to_int, is_str_list

# Ubicación del directorio "Checkstyle"
_CHECKSTYLE_DIR = os.path.join(
    os.path.dirname(__file__), "..", "..", "tools", "checkstyle"
)

# Jar de Checkstyle
CHECKSTYLE_JAR_PATH = os.path.join(_CHECKSTYLE_DIR, "checkstyle.jar")
# Configuración por defecto
GOOGLE_CONFIG_PATH = os.path.join(_CHECKSTYLE_DIR, "google_checks.xml")


def analyze_style(
    code: str, options: Optional[Dict[str, Any]] = None, timeout_seconds: int = 15,
) -> List[Dict[str, Any]]:
    """
    Ejecuta la herramienta Checkstyle sobre el código del usuario 'code'.
    Devuelve una lista de issues normalizados.
    """
    options = options or {}

    # Ejecutamos la herramienta en un directorio temporal para aislar el análisis
    # y evitar escribir archivos en el sistema del usuario
    with tempfile.TemporaryDirectory(prefix="tfg_java_style_") as tmpdir:
        filename = _pick_java_filename(code)
        filepath = os.path.join(tmpdir, filename)

        # Guardamos el código del usuario en un archivo temporal (ya que Checkstyle no acepta el código por stdin).
        with open(filepath, "w", encoding="utf-8", newline="\n") as f:
            f.write(code)

        # Construimos el comando de Checkstyle para analizar el código desde un archivo y obtener salida.
        cmd = _build_checkstyle_command(filepath)

        try:
            # Ejecutamos la herramienta externa mediante subprocess y capturamos su salida
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
                encoding="utf-8",
            )
        except FileNotFoundError as exc:
            raise RuntimeError(
                "Java no está instalado o no se encuentra en el PATH."
            ) from exc

    # Checkstyle devuelve:
    # 0 -> sin issues
    # 1 -> con issues
    # >1 -> error
    if result.returncode not in (0, 1):
        stderr = (result.stderr or "").strip()
        if options:
            raise ValueError(stderr or "Opciones inválidas para Checkstyle.")
        
        raise RuntimeError(stderr or "Checkstyle falló en la ejecución.")

    raw_xml = (result.stdout or "").strip()
    if not raw_xml:
        return []

    # Parseamos el XML a estructura de Python
    try:
        root = ET.fromstring(raw_xml)
    except ET.ParseError as exc:
        raise RuntimeError(f"No se pudo parsear XML de Checkstyle: {exc}")

    issues: List[Dict[str, Any]] = []
    exclude_checks = options.get("exclude_checks")
    
    # Normalizamos los valores de la lista de checks a excluir
    exclude_terms = []
    if is_str_list(exclude_checks):
        exclude_terms = [str(t).strip().lower() for t in exclude_checks if str(t).strip()]


    for file_elem in root.findall("file"):
        # En Checkstyle, error = issue
        for issue in file_elem.findall("error"):

            issue_normalized = _normalize_checkstyle_issue(issue) # Agregamos a la lista cada issue normalizado
            rule_code = str(issue_normalized.get("code") or "").lower()

            # Si cualquier término aparece dentro del rule_code, lo excluimos
            if exclude_terms and any(term in rule_code for term in exclude_terms):
                continue

            issues.append(issue_normalized)
            
    # Opción personalizada para filtrar issues por severidad
    min_sev = options.get("min_severity")
    if isinstance(min_sev, str) and min_sev.strip():
        issues = _filter_by_min_severity(issues, min_sev.strip().lower())

    return issues


def _build_checkstyle_command(filepath: str) -> List[str]:
    """
    Construye el comando de ejecución de Checkstyle, aplicando opciones de entrada.
    Se utilizará una configuración fija (Google Java Style) para garantizar consistencia y simplicidad
    en el análisis, evitando variaciones de resultados debidas configuraciones personalizadas.
    """

    return [
        "java",
        "-jar",
        CHECKSTYLE_JAR_PATH,
        "-c",
        GOOGLE_CONFIG_PATH,
        "-f",
        "xml",
        filepath,
    ]


# ------------------------
# Normalización
# ------------------------

def _normalize_checkstyle_issue(issue_elem: ET.Element) -> Dict[str, Any]:
    """
    Normaliza el issue a un formato base.
    Eliminamos campos que el usuario no necesita.
    """
    # Obtenemos los campos relevantes a partir del issue sin normalizar
    line = to_int(issue_elem.get("line"))
    column = to_int(issue_elem.get("column"))
    message = (issue_elem.get("message") or "").strip()
    source = (issue_elem.get("source") or "").strip()

    severity = _severity_from_checkstyle(issue_elem.get("severity"))

    # Extraer el código de la regla (último elemento de la lista de strings)
    # Por ejemplo: "com.puppycrawl.tools.checkstyle.checks.javadoc.PackageJavadocCheck" --> "PackageJavadocCheck"
    rule_code = source.split(".")[-1] if source else ""

    # Quitamos el sufijo "Check" de los códigos para facilitar las sugerencias
    if rule_code.endswith("Check"):
        rule_code = rule_code[:-5]
    

    return {
        "tool": "checkstyle",
        "category": "style",
        "code": rule_code,
        "message": message,
        "severity": severity,
        "line": line,
        "column": column,
        "suggestion": _suggestion_for_rule(rule_code),
    }

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


def _severity_from_checkstyle(sev: Optional[str]) -> str:
    """
    Checkstyle usa:
    error / warning / info
    """
    sev = (sev or "").lower()

    if sev == "error":
        return "error"
    if sev == "warning":
        return "warning"
    if sev == "info":
        return "info"
    
    return "warning"


def _suggestion_for_rule(rule_code: str) -> str:
    """
    Devuelve una sugerencia a partir del nombre del check de Checkstyle.
    Se cubren los checks más comunes de Google Java Style.
    """
    code = (rule_code or "").strip()

    # Sugerencias específicas para las reglas más comunes
    tips = {
        # -------- Imports --------
        "UnusedImports": "Elimina los imports que no se utilizan.",
        "AvoidStarImport": "Evita imports con '*'; importa solo las clases necesarias.",
        "ImportOrder": "Reordena los imports según la convención definida (agrupados y ordenados).",
        # -------- Formato / Espacios --------
        "LineLength": "Reduce la longitud de la línea para mejorar la legibilidad.",
        "Indentation": "Ajusta la indentación para mantener un estilo consistente.",
        "WhitespaceAround": "Añade o ajusta espacios alrededor de operadores y símbolos.",
        "WhitespaceAfter": "Añade un espacio después de comas y ciertos símbolos.",
        "NoWhitespaceBefore": "Evita espacios innecesarios antes de ciertos símbolos.",
        "NeedBraces": "Añade llaves incluso en bloques de una sola línea (if/for/while).",
        # -------- Naming --------
        "MethodName": "Usa camelCase para nombres de métodos.",
        "ParameterName": "Revisa la convención de nombres para parámetros (camelCase).",
        "LocalVariableName": "Usa nombres descriptivos en camelCase para variables locales.",
        "MemberName": "Revisa la convención de nombres para atributos de clase.",
        "ConstantName": "Las constantes deben ir en MAYÚSCULAS con guiones bajos.",
        "TypeName": "Las clases e interfaces deben comenzar en mayúscula (PascalCase).",
        # -------- Documentación --------
        "JavadocMethod": "Añade o completa la documentación Javadoc del método.",
        "JavadocType": "Añade documentación Javadoc a la clase o interfaz.",
        "MissingJavadocMethod": "Añade documentación Javadoc al método.",
        "MissingJavadocType": "Añade documentación Javadoc a la clase.",
        # -------- Buenas prácticas --------
        "FinalLocalVariable": "Marca la variable como 'final' si no se modifica.",
        "MagicNumber": "Evita números mágicos; usa constantes con nombre descriptivo.",
        "EmptyBlock": "Evita bloques vacíos; añade lógica o elimina el bloque.",
    }

    if code in tips:
        return tips[code]

    # Fallback genérico
    return "Revisa esta regla de estilo según Google Java Style."


def _filter_by_min_severity(issues: List[Dict[str, Any]], min_sev: str) -> List[Dict[str, Any]]:
    """
    Filtra una lista de issues según una severidad mínima.
    Solo se devuelven aquellos cuya severidad sea igual o superior.
    """
    # Jerarquía interna para poder comparar
    order = {"info": 0, "warning": 1, "error": 2}
    # Si el valor recibido no es válido, no filtramos
    if min_sev not in order:
        return issues  

    min_value = order[min_sev]
    filtered: List[Dict[str, Any]] = []
    for issue in issues:
        # Obtenemos severidad del issue
        sev = str(issue.get("severity") or "warning").lower()
        
        # Conservamos solo los issues con severidad igual o superior al mínimo indicado
        if order.get(sev, 1) >= min_value:
            filtered.append(issue)

    return filtered