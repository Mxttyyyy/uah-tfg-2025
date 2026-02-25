import json
import os
import subprocess
import tempfile
from typing import Any, Dict, List, Optional

from analysis.utils import to_int, is_str_list


# --- Perfiles personalizados con reglas de PMD ---
# Cada profile es una lista de reglas PMD (rule refs) centradas en dead code.
_PROFILE_RULES: Dict[str, List[str]] = {
    "minimal": [
        "category/java/bestpractices.xml/UnusedLocalVariable",
        "category/java/bestpractices.xml/UnusedPrivateMethod",
        "category/java/codestyle.xml/UnnecessaryImport",
    ],
    "default": [
        "category/java/bestpractices.xml/UnusedLocalVariable",
        "category/java/bestpractices.xml/UnusedPrivateField",
        "category/java/bestpractices.xml/UnusedPrivateMethod",
        "category/java/bestpractices.xml/UnusedFormalParameter",
        "category/java/bestpractices.xml/UnusedAssignment",
        "category/java/errorprone.xml/UnreachableCode",
        "category/java/codestyle.xml/UnnecessaryImport",
    ],
    # Incluye el default y annade algunas reglas habituales que pueden indicar "código innecesario".
    "strict": [
        "category/java/bestpractices.xml/UnusedLocalVariable",
        "category/java/bestpractices.xml/UnusedPrivateField",
        "category/java/bestpractices.xml/UnusedPrivateMethod",
        "category/java/bestpractices.xml/UnusedFormalParameter",
        "category/java/bestpractices.xml/UnusedAssignment",
        "category/java/errorprone.xml/UnreachableCode",
        "category/java/errorprone.xml/EmptyIfStmt",
        "category/java/errorprone.xml/EmptyStatementBlock",
        "category/java/codestyle.xml/UnnecessaryImport",
        "category/java/bestpractices.xml/AvoidReassigningParameters",
        "category/java/bestpractices.xml/UnusedPrivateConstructor",
        "category/java/bestpractices.xml/UselessOverridingMethod",
    ],
}


def analyze_dead_code(
    code: str, options: Optional[Dict[str, Any]] = None, timeout_seconds: int = 20,
) -> List[Dict[str, Any]]:
    """
    Ejecuta la herramienta PMD (launcher local en tools/pmd/bin) sobre el código del usuario 'code'.
    Devuelve una lista de issues normalizados.
    """
    options = options or {}

    # Ejecutamos la herramienta en un directorio temporal para aislar el análisis
    # y evitar escribir archivos en el sistema del usuario
    with tempfile.TemporaryDirectory(prefix="tfg_java_dead_code_") as tmpdir:
        filename = "Input.java"
        filepath = os.path.join(tmpdir, filename)

        # Guardamos el código del usuario en un archivo temporal (ya que PMD no acepta el código por stdin).
        with open(filepath, "w", encoding="utf-8", newline="\n") as f:
            f.write(code)

        # Construimos el comando de PMD para analizar el código desde un archivo y obtener salida.
        cmd = _build_pmd_command(filename, options)

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
                "No se encontró PMD en backend/tools/pmd/. "
                "Asegúrate de tener la distribución de PMD con bin/ y lib/."
            ) from exc

    # PMD suele devolver:
    # - 0: ejecución correcta sin violations (issues)
    # - 4: ejecución correcta con issues
    # Otros: error real (parámetros/ejecución)
    if result.returncode not in (0, 4):
        stderr = (result.stderr or "").strip()
        if options:
            raise ValueError(stderr or "Opciones inválidas para PMD.")
        raise RuntimeError(stderr or f"PMD falló (exit code {result.returncode}).")

    raw = (result.stdout or "").strip()
    if not raw:
        # Si no hay salida y el returncode es 0, no hay issues
        if result.returncode == 0:
            return []
        # Si returncode 4 pero stdout vacío, algo falló
        stderr = (result.stderr or "").strip()
        raise RuntimeError(stderr or "PMD no devolvió salida en JSON.")

    # Parseamos el JSON a estructura de Python
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        stderr = (result.stderr or "").strip()
        raise RuntimeError(stderr or f"No se pudo parsear JSON de PMD: {exc}") from exc

    # Extraemos los issues
    violations = _extract_pmd_violations(data)
    if not isinstance(violations, list):
        raise RuntimeError("Formato inesperado: PMD no devolvió una lista de violations.")

    issues: List[Dict[str, Any]] = []
    for issue in violations:
        if isinstance(issue, dict):
            issues.append(_normalize_pmd_issue(issue)) # Agregamos a la lista cada issue normalizado

    return issues


# -----------------------
# Build command
# -----------------------


def _build_pmd_command(filename: str, options: Dict[str, Any]) -> List[str]:
    """
    Construye el comando PMD, aplicando opciones de entrada.

    Options soportadas:
    - profile: "minimal" | "default" | "strict" (por defecto "default")
    - exclude_rules: list[str] con nombres cortos (p.ej. ["UnusedFormalParameter"])
    - minimum_priority: int 1..5 (1 = más grave)
    """
    # Obtenemos la ruta del launcher
    launcher = _get_pmd_launcher()

    cmd = [
        *launcher, # Insertamos el launcher (path al script pmd.bat)
        "check", # Modo análisis
        "-f", "json", # Formato de salida JSON
    ]

    # ------- profile -------
    # Perfil de reglas predefinido
    profile = options.get("profile", "default")

    if not isinstance(profile, str) or not profile.strip():
        profile = "default"
    profile = profile.strip().lower()

    # Validamos que el perfil exista
    if profile not in _PROFILE_RULES:
        raise ValueError("options.dead_code.profile debe ser 'minimal', 'default' o 'strict'.")

    rule_list = list(_PROFILE_RULES[profile])

    # ------- exclude_rules (list[str]) -------
    # Permite desactivar reglas concretas dentro del perfil
    exclude_rules = options.get("exclude_rules")
    exclude_rules_list: List[str] = []
   
    if is_str_list(exclude_rules):
        exclude_rules_list = [r.strip() for r in exclude_rules]
    
    # Aplicamos exclusiones si existen
    if exclude_rules_list:
        rule_list = _apply_exclusions(rule_list, exclude_rules_list)

    # Si tras excluir reglas no queda ninguna activa, es configuración inválida
    if not rule_list:
        raise ValueError("Tras aplicar exclude_rules, no queda ninguna regla activa en el profile.")

    cmd += ["-R", ",".join(rule_list)]

    # ------- minimum_priority (1..5) -------
    # Permite filtrar por severidad mínima
    min_prio = options.get("minimum_priority")

    if min_prio is not None and str(min_prio).strip():
        if not isinstance(min_prio, int) or not (1 <= min_prio <= 5):
            raise ValueError("options.dead_code.minimum_priority debe ser un entero entre 1 y 5.")
        cmd += ["--minimum-priority", str(min_prio)]

    cmd.append("-d")
    cmd.append(filename)
    return cmd


def _apply_exclusions(rule_list: List[str], exclude_short_names: List[str]) -> List[str]:
    """
    Filtra una lista de referencias de reglas de PMD eliminando aquellas
    cuyo nombre corto coincida con los indicados por el usuario.

    Parámetros:
        - rule_list: lista de referencias completas de reglas
          (ej. "category/java/bestpractices.xml/UnusedPrivateMethod")

        - exclude_short_names: lista de nombres cortos de reglas a excluir
          (ej. ["UnusedPrivateMethod"]).
    """

    # Normalizamos los exclude names
    excludes = {name.strip() for name in exclude_short_names if name.strip()}
    if not excludes:
        return rule_list

    filtered: List[str] = []
    for ref in rule_list:
        # Cada ref tiene el formato:
        # "category/java/bestpractices.xml/UnusedPrivateMethod"

        # Extraemos el nombre corto de la regla
        short = ref.rsplit("/", 1)[-1]

        # Si ese nombre está en la lista de exclusión, lo omitimos
        if short in excludes:
            continue

        filtered.append(ref)

    return filtered


def _get_pmd_launcher() -> List[str]:
    """
    Localiza el ejecutable/script de PMD dentro del repositorio para poder invocarlo con subprocess.
    - Windows: backend/tools/pmd/bin/pmd.bat
    - Linux/mac: backend/tools/pmd/bin/pmd

    Devuelve una lista con el path al launcher (por ejemplo [".../pmd.bat"]) para poder hacer:
    cmd = [*launcher, "check", ...]
    """
    # Carpeta del archivo actual (java/dead_code_analysis.py)
    here = os.path.dirname(os.path.abspath(__file__))

    # Subimos hasta backend/ y construimos la ruta a backend/tools/pmd
    pmd_home = os.path.abspath(os.path.join(here, "..", "..", "tools", "pmd"))
    bin_dir = os.path.join(pmd_home, "bin")

    # En Windows, PMD se lanza con un .bat (pmd.bat)
    if os.name == "nt":
        bat = os.path.join(bin_dir, "pmd.bat")
        if os.path.isfile(bat):
            return [bat]
        
    # En Linux/macOS, PMD se lanza con el script "pmd"
    else:
        sh = os.path.join(bin_dir, "pmd")
        if os.path.isfile(sh):
            return [sh]

    # Si no existe el launcher esperado, PMD no se podrá ejecutar
    raise RuntimeError(
        "No se encontró el launcher de PMD en backend/tools/pmd/bin/. "
        "Comprueba que has copiado la distribución oficial (bin/ y lib/)."
    )


# -----------------------
# Normalización
# -----------------------


def _normalize_pmd_issue(issue: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normaliza el issue a un formato base.
    Eliminamos campos que el usuario no necesita
    """
    # Obtenemos los campos relevantes a partir del issue sin normalizar
    rule = str(issue.get("rule") or "").strip()
    message = str(issue.get("description") or "").strip()

    line = to_int(issue.get("beginline"))
    column = to_int(issue.get("begincolumn"))

    priority = to_int(issue.get("priority"))
    severity = _severity_from_priority(priority)

    help_url = issue.get("externalInfoUrl")
    if not isinstance(help_url, str) or not help_url.strip():
        help_url = None

    # Construimos el issue normalizado en base a los campos obtenidos
    return {
        "tool": "pmd",
        "category": "dead_code",
        "code": rule,
        "message": message,
        "severity": severity,
        "priority": priority,
        "line": line,
        "column": column,
        "suggestion": _suggestion_for_rule_code(rule),
        "help_url": help_url,
    }


def _extract_pmd_violations(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Convierte el JSON de PMD en una lista plana de violations (issues).
    Estructura típica del JSON que devuelve PMD:
      {
        "files": [
          {
            "filename": "...",
            "violations": [ {...}, {...} ]
          },
          ...
        ]
      }
    """

    # PMD agrupa resultados por archivo
    files = data.get("files")
    if not isinstance(files, list):
        return []

    flat: List[Dict[str, Any]] = []
    for f in files:
        if not isinstance(f, dict):
            continue

        # Lista de issues
        violations = f.get("violations")
        if not isinstance(violations, list):
            continue

        for v in violations:
            # Cada violation debe ser un dict con campos como rule/description/beginline...
            if isinstance(v, dict):
                flat.append(v)

    return flat


def _severity_from_priority(priority: Optional[int]) -> str:
    """
    PMD usa prioridad 1..5 (1 más importante).
    Lo mapeamos al esquema interno del sistema: error/warning/info.
    """
    if priority == 1:
        return "error"
    if priority in (2, 3):
        return "warning"
    if priority in (4, 5):
        return "info"
    return "warning"


def _suggestion_for_rule_code(rule_code: str) -> str:
    """
    Devuelve una sugerencia a partir del código de regla de PMD.
    """
    code = (rule_code or "").strip()

    # Sugerencias específicas para las reglas más comunes
    tips = {
        "UnusedLocalVariable": "Elimina la variable local si no se usa, o úsala si es intencional.",
        "UnusedPrivateField": "Elimina el campo privado si no se usa, o úsalo si debía aportar estado.",
        "UnusedPrivateMethod": "Elimina el método privado si no se usa, o llama a él desde donde corresponda.",
        "UnusedFormalParameter": "Elimina el parámetro si no se usa. Si debe existir por interfaz, documenta su propósito.",
        "UnusedAssignment": "Evita asignaciones que luego se sobrescriben sin usarse; reestructura el flujo.",
        "UnnecessaryImport": "Elimina imports no usados o innecesarios para reducir ruido.",
        "UnusedImports": "Elimina imports que no se usan para reducir ruido.",
        "AvoidReassigningParameters": "Evita reasignar parámetros; usa una variable local si necesitas modificar el valor.",
        "AvoidUnusedPrivateConstructor": "Elimina el constructor privado si no se usa o revisa el patrón (singleton/utility class).",
    }

    if code in tips:
        return tips[code]

    if "unused" in code.lower():
        return "Elimina o usa este elemento no utilizado para mantener el código limpio."

    return "Revisa este aviso y elimina/usa el código indicado."