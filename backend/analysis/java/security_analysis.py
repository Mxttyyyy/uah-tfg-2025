import json
import os
import subprocess
import tempfile
from typing import Any, Dict, List, Optional

from analysis.utils import to_int, is_str_list


def analyze_security(
    code: str, options: Optional[Dict[str, Any]] = None, timeout_seconds: int = 10
) -> List[Dict[str, Any]]:
    """
    Ejecuta la herramienta Semgrep (SAST) sobre el código del usuario 'code'.
    Devuelve una lista de issues normalizados.
    """
    options = options or {}

    # Ejecutamos la herramienta en un directorio temporal para aislar el análisis
    # y evitar escribir archivos en el sistema del usuario
    with tempfile.TemporaryDirectory(prefix="tfg_java_security_") as tmpdir:
        filename = "Input.java"
        filepath = os.path.join(tmpdir, filename)

        # Guardamos el código del usuario en un archivo temporal (ya que Semgrep no acepta el código por stdin).
        with open(filepath, "w", encoding="utf-8", newline="\n") as file:
            file.write(code)

        # Construimos el comando de Semgrep para analizar el código desde un archivo y obtener salida.
        cmd = _build_semgrep_command(filename, options)

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
                "Semgrep no está instalado o no se encuentra en el PATH."
            ) from exc

    # Semgrep suele devolver:
    # - 0: ejecución correcta (puede haber o no findings)
    # - 1: ejecución correcta con findings
    # - != 0 y != 1: error real de ejecución

    # Permitimos 0 y 1 (0 = ok, 1 = findings "issues" en ciertos modos)
    if result.returncode not in (0, 1):
        stderr = (result.stderr or "").strip()
        if options:
            raise ValueError(stderr or "Opciones inválidas para Semgrep.")

    raw = (result.stdout or "").strip()
    if not raw:
        if result.returncode == 0:
            return []  # No hay issues

        stderr = (result.stderr or "").strip()
        raise RuntimeError(
            f"Semgrep falló con un error (exit code {result.returncode})."
        )

    # Parseamos el JSON a estructura de Python
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"No se pudo parsear JSON de Semgrep: {exc}")

    # Aunque el returncode sea 0/1, verificamos si el JSON contiene errores
    errors = data.get("errors")
    if isinstance(errors, list) and errors:
        if options:
            raise ValueError(stderr or "Opciones inválidas para Semgrep.")
        
        raise RuntimeError("Semgrep devolvió errores internos en el JSON.")

    results = data.get("results")
    if not isinstance(results, list):
        return []
    
    # Opción personalizada: permitir excluir reglas por sufijo/fragmento del check_id.
    # Semgrep suele exigir el check_id completo para excluir, y puede ser largo (incluye namespace).
    # Con 'exclude_contains', filtramos resultados normalizados si el code contiene alguno de estos fragment
    exclude_contains = options.get("exclude_contains")
    if isinstance(exclude_contains, list):
        cleaned = []
        for x in exclude_contains:
            if isinstance(x, (str, int)):
                value = str(x).strip().lower()
                if value:
                    cleaned.append(value)

        exclude_contains = cleaned

    else:
        exclude_contains = []

    issues: List[Dict[str, Any]] = []
    for issue in results:
        if not isinstance(issue, dict):
            continue
        
        rule_id = str(issue.get("check_id") or "").strip().lower()
        # Excluir issues cuyo rule_id contenga alguno de los tokens indicados
        if exclude_contains and any(token in rule_id for token in exclude_contains):
            continue
        issues.append(_normalize_semgrep_issue(issue))  # Agregamos a la lista cada issue normalizado

    return issues


def _build_semgrep_command(filename: str, options: Dict[str, Any]) -> List[str]:
    """
    Construye el comando de Semgrep, aplicando opciones de entrada.
    Las flags repetibles (--config, --exclude-rule, --severity)
    se añaden tantas veces como valores existan.
    """
    cmd = [
        "semgrep",  # Herramienta empleada
        "scan",  # Modo análisis
        "--json",  # Formato de salida JSON
        "--quiet", # Reduce mensajes informativos en stdout, por ejemplo, no muestra "Scanning 15 files..."
        "--metrics", "off", # Desactivamos el cálculo de métricas
    ]

    # Opciones para filtrar reglas de Semgrep
    # Semgrep permite repetir flags para múltiples valores.
    # Por ejemplo: semgrep scan --config p/java --config p/ci --json Input.java

    # ------- config: str o list[str] -------
    config = options.get("config", "p/findsecbugs")

    # Si config es un string, lo agregamos
    if isinstance(config, str) and config.strip():
        cmd += ["--config", config.strip()]

    elif is_str_list(config):
        for c in config:
            cmd += ["--config", c.strip()]

    else:
        cmd += ["--config", "p/findsecbugs"]

    # ------- exclude_rules: str o list[str] -------
    exclude_rules = options.get("exclude_rules")

    if isinstance(exclude_rules, str) and exclude_rules.strip():
        cmd += ["--exclude-rule", exclude_rules.strip()]

    elif is_str_list(exclude_rules):
        for er in exclude_rules:
            cmd += ["--exclude-rule", er.strip()]

    # ------- severity: str o list[str] -------
    severity = options.get("severity")
    if isinstance(severity, str) and severity.strip():
        cmd += ["--severity", (severity.strip().upper())]

    elif is_str_list(severity):
        for s in severity:
            cmd += ["--severity", (s.strip().upper())]

    cmd.append(filename)
    return cmd


# -----------------
# Normalización
# -----------------


def _normalize_semgrep_issue(issue: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normaliza el issue a un formato base.
    Eliminamos campos que el usuario no necesita
    """
    # Obtenemos los campos relevantes a partir del issue sin normalizar
    rule_id = str(issue.get("check_id") or "").strip()

    #path = str(issue.get("path") or "Input.java")

    start = issue.get("start") if isinstance(issue.get("start"), dict) else {}
    end = issue.get("end") if isinstance(issue.get("end"), dict) else {}

    line = to_int(start.get("line"))
    column = to_int(start.get("col"))
    end_line = to_int(end.get("line"))
    end_column = to_int(end.get("col"))

    # Extraer información adicional
    extra = issue.get("extra") if isinstance(issue.get("extra"), dict) else {}
    message = str(extra.get("message") or "").strip()

    semgrep_sev = str(extra.get("severity") or "").strip().upper()
    severity = _severity_from_semgrep(semgrep_sev)
    suggestion = str(extra.get("fix") or "").strip() or _suggestion_for_rule(rule_id, message)
    help_url = _extract_help_url(extra)

    # Construimos el issue normalizado en base a los campos obtenidos
    return {
        "tool": "semgrep",
        "category": "security",
        "code": rule_id,
        "message": message,
        "severity": severity,
        #"path": path,
        "line": line,
        "column": column,
        "suggestion": suggestion,
        "end_line": end_line,
        "end_column": end_column,
        "help_url": help_url,
    }


def _severity_from_semgrep(semgrep_sev: str) -> str:
    """
    Normaliza la severidad reportada por Semgrep al esquema interno del sistema
    ('error', 'warning', 'info').

    Soporta el esquema nuevo de Semgrep (LOW/MEDIUM/HIGH/CRITICAL) y mantiene
    compatibilidad con el esquema antiguo (INFO/WARNING/ERROR).

    Mapeo:
    - CRITICAL, HIGH  -> error
    - MEDIUM          -> warning
    - LOW             -> info
    - ERROR           -> error
    - WARNING         -> warning
    - INFO            -> info
    - Desconocido     -> warning
    """
    sev = (semgrep_sev or "").strip().upper()

    if sev in ("CRITICAL", "HIGH", "ERROR"):
        return "error"
    if sev in ("MEDIUM", "WARNING"):
        return "warning"
    if sev in ("LOW", "INFO", "NOTE"):
        return "info"
    return "warning"


def _extract_help_url(extra: Dict[str, Any]) -> Optional[str]:
    """
    Extrae la URL de ayuda desde metadata si está disponible.
    """
    metadata = extra.get("metadata")
    if not isinstance(metadata, dict):
        return None

    # Intentamos obtener los campos típicos
    url = metadata.get("url") or metadata.get("reference") or metadata.get("help")
    if isinstance(url, str) and url.strip():
        return url.strip()

    return None

def _suggestion_for_rule(rule_id: str, message: str) -> str:
    """
    Devuelve una sugerencia a partir del código de regla de Semgrep.
    """
    code = (rule_id or "").strip().lower()
    msg = (message or "").strip().lower()

    # Sugerencias específicas para las reglas más comunes
    tips_contains = {
        "sql-injection": "Evita concatenar SQL con entradas del usuario; usa consultas parametrizadas (PreparedStatement).",
        "command-injection": "Evita ejecutar comandos con datos no confiables; valida/escapa o usa APIs seguras.",
        "path-traversal": "Valida/normaliza rutas y evita usar input del usuario para construir paths directamente.",
        "xxe": "Desactiva entidades externas en parsers XML para evitar XXE.",
        "deserialization": "Evita deserialización de datos no confiables; valida tipos permitidos o usa formatos seguros.",
        "insecure-random": "No uses Random para tokens/seguridad; usa SecureRandom.",
        "weak-crypto": "Evita algoritmos/parametrizaciones débiles; usa primitivas modernas.",
        "hardcoded-password": "No hardcodees credenciales; usa variables de entorno/secret manager.",
        "open-redirect": "Valida destinos de redirección; usa listas permitidas.",
    }

    # En Semgrep, el 'check_id' puede venir con distintos prefijos/namespaces según el ruleset
    # (p. ej. "java.lang.correctness.unused-import" vs "p/java.unused-import").
    # Por eso normalizamos y comparamos por sufijo/último segmento en vez de hacer match exacto.
    for key, tip in tips_contains.items():
        if code.endswith(key) or key in code:
            return tip

    # Fallback por "familia"
    if code.startswith("java.lang.security") or "security" in code:
        return "Revisa este problema: puede implicar un riesgo de seguridad. Aplica mitigaciones recomendadas."

    # Fallback por keywords del mensaje
    if "sql" in msg and "inject" in msg:
        return "Evita concatenar SQL con entradas del usuario; usa consultas parametrizadas."
    if "deserialize" in msg:
        return "Evita deserialización de datos no confiables o limita tipos permitidos."
    if "xxe" in msg or ("xml" in msg and "entity" in msg):
        return "Revisa configuración del parser XML y desactiva entidades externas (XXE)."
    if "md5" in msg or "sha1" in msg:
        return "Evita algoritmos hash débiles; usa SHA-256 o superior."
    if "ecb" in msg or " des " in f" {msg}":
        return "Evita DES o ECB; usa AES/GCM."
    if "hardcoded" in msg or "password" in msg:
        return "No hardcodes credenciales; usa variables de entorno o un vault."
    if "sql" in msg:
        return "Evita concatenación SQL; usa consultas preparadas."


    return "Revisa este hallazgo de seguridad y aplica la mitigación recomendada."

