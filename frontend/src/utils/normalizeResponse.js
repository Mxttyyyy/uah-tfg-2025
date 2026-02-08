// Normaliza la respuesta de /analyze para que la UI siempre reciba un objeto válido.

/** 
 * Plantilla con valores por defecto para la UI
 * para garantizar claves y tipos aunque falten datos del backend
 */
function createEmptyResponse() {
  return {
    language: "unknown",
    analysis_time_ms: 0,
    error: null,
    summary: {
      total_issues: 0,
      by_severity: { info: 0, warning: 0, error: 0 },
    },
    analysis: {
      style: [],
      security: [],
      metrics: {},
      dead_code: [],
      types: [],
    },
  };
}

// ------ Funciones para validar y normalizar valores ------

/**
 * DevuelveTrue si es un objeto JSON "normal" (no null y no array)
 */
function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * Devuelve un número finito o el valor por defecto
 */
function asNumber(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Devuelve un string o el valor por defecto
 */
function asString(value, fallback) {
  return typeof value === "string" ? value : fallback;
}

/**
 * Devuelve un array o [] si no lo es
 */
function asArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Normaliza la respuesta del backend a un formato SIEMPRE estable para la UI.
 * Aunque el backend ya intenta devolver una respuesta estable, aquí reforzamos la UI
 * frente a nulls, tipos raros o respuestas parciales.
 */
export function normalizeAnalyzeResponse(raw) {
  // Plantilla con valores por defecto
  const out = createEmptyResponse();

  if (!isPlainObject(raw)) {
    return out;
  }

  // Normalizamos campos raíz
  out.language = asString(raw.language, out.language);
  out.analysis_time_ms = asNumber(raw.analysis_time_ms, out.analysis_time_ms);

  // Rellenamos error (si existe)
  if (isPlainObject(raw.error)) {
    out.error = {
      message: asString(raw.error.message, "Error desconocido"),
      http_status: asNumber(raw.error.http_status, 500),
      error_code: asString(raw.error.error_code, null),
    };
  }

  // Rellenamos summary (si existe)
  if (isPlainObject(raw.summary)) {
    out.summary.total_issues = asNumber(raw.summary.total_issues, 0);

    if (isPlainObject(raw.summary.by_severity)) {
      out.summary.by_severity = {
        info: asNumber(raw.summary.by_severity.info, 0),
        warning: asNumber(raw.summary.by_severity.warning, 0),
        error: asNumber(raw.summary.by_severity.error, 0),
      };
    }
  }

  // Rellenamos análisis por módulos (si existen)
  if (isPlainObject(raw.analysis)) {
    out.analysis.style = asArray(raw.analysis.style);
    out.analysis.security = asArray(raw.analysis.security);
    out.analysis.dead_code = asArray(raw.analysis.dead_code);
    out.analysis.types = asArray(raw.analysis.types);

    // Comprobamos que metrics es un objeto
    out.analysis.metrics = isPlainObject(raw.analysis.metrics) ? raw.analysis.metrics : {};
  }

  return out;
}

/**
 * Devuelve la plantilla de respuesta por defecto, marcándola como error de cliente (red, timeout, etc.)
 * De esta manera, la UI puede pintar errores 
 */
export function makeClientErrorResponse(message) {
  // Plantilla con valores por defecto
  const out = createEmptyResponse();

  // Normalizamos el error de cliente (mensaje + sin status HTTP real)
  out.error = {
    message: typeof message === "string" && message.trim() ? message : "Error de red",
    http_status: 0, // 0 --> "sin respuesta HTTP"
  };
  return out;
}