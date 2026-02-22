// Define opciones por defecto y construye la petición base para /analyze.

// Tipos de análisis permitidos por el backend (options.enabled)
export const ANALYSIS_KEYS = ["style", "security", "metrics", "dead_code", "types"];

export const DEFAULT_LANGUAGE = "python";
export const DEFAULT_TIMEOUT_SECONDS = 10;

/**
 * Crea un objeto NUEVO con las opciones por defecto para Python.
 * Se devuelve un objeto nuevo para evitar referencias compartidas en React state.
 */
export function createDefaultPythonOptions() {
  return {
    // Por defecto, activamos todos los análisis
    enabled: [...ANALYSIS_KEYS],

    // Timeout global que el backend aplica al ejecutar sus herramientas de análisis
    timeout_seconds: DEFAULT_TIMEOUT_SECONDS,

    // ------- Opciones por módulo (objetos serializables a JSON) -------
    // Establecemos los valores por defecto

    // Ruff (style_analysis): select/ignore/extend_select son listas de strings (si se usan)
    style: {
      select: [],
      ignore: [],
      extend_select: [],
    },

    // Bandit (security_analysis): severity_level / confidence_level admiten all|low|medium|high
    // skip/tests son listas de IDs tipo ["B101", "B603"] (si se usan)
    security: {
      severity_level: "all",
      confidence_level: "all",
      skip: [],
      tests: [],
    },

    // Radon (metrics_analysis): filtros por rangos (letras) opcionales
    // cc_min/cc_max: A..F
    // mi_min/mi_max: A..C
    metrics: {
      cc_min: "",
      cc_max: "",
      mi_min: "",
      mi_max: "",
    },

    // Vulture (dead_code_analysis): min_confidence 0-100; ignore_* listas de nombres
    dead_code: {
      min_confidence: 60,
      ignore_names: [],
      ignore_decorators: [],
    },

    // Mypy (type_analysis): python_version "" = auto; enable/disable_error_codes = ["name-defined", ...]
    types: {
      ignore_missing_imports: true,
      python_version: "",
      strict: false,
      show_error_code_links: false,
      enable_error_codes: [],
      disable_error_codes: [],
    },
  };
}

/**
 * Crea un objeto NUEVO con las opciones por defecto para Java.
 * Se devuelve un objeto nuevo para evitar referencias compartidas en React state.
 */
export function createDefaultJavaOptions() {
  return {

    enabled: [...ANALYSIS_KEYS],
    
    timeout_seconds: DEFAULT_TIMEOUT_SECONDS,

    // Checkstyle
    style: {
      min_severity: "",
    },

    // Semgrep
    security: {
      config: [],
      exclude_rules: [],
      exclude_contains: [],
      severity: [],
    },

    // Lizard
    metrics: {
      cc_min: 1,
      nloc_min: 1,
      args_min: 1,
    },

    // PMD
    dead_code: {
      profile: "default",
      exclude_rules: [],
      minimum_priority: "",
    },

    // Javac
    types: {
      release: 17,
      lint: true,
    },
  };
}

/**
 * Devuelve las opciones por defecto según el lenguaje seleccionado.
 * Si no es Java, caemos a Python.
 */
export function createDefaultAnalyzeOptions(language) {
  return language === "java"
    ? createDefaultJavaOptions()
    : createDefaultPythonOptions();
}

