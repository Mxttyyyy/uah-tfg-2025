
/**
 * Normaliza severidad a los 3 valores esperados por el sistema:
 * info | warning | error
 */
export function normalizeSeverity(value) {
  const sev = String(value || "").toLowerCase().trim();
  if (sev === "info" || sev === "warning" || sev === "error") return sev;
  return "warning";
}

/**
 * Cuenta el número de issues por severidad (info, warning, error).
 */
export function buildSeverityCounts(issues) {
  const counts = { info: 0, warning: 0, error: 0 };
  for (const it of issues || []) {
    const sev = normalizeSeverity(it?.severity);
    counts[sev] += 1;
  }
  return counts;
}

/**
 * Aplica una prioridad de severidad a la lista de issues,
 * mostrando primero las de mayor interés y ordenando por ubicación.
 */
export function applySeverityPriority(issues, severitySelected) {

  // Orden normal: por ubicación
  if (!severitySelected || severitySelected === "none") return sortIssuesByLocation(issues);

  // Separamos los que tienen la severidad priorizada
  const prioritizedIssues = [];
  const otherIssues = [];
  for (const issue of issues) {
    const sev = normalizeSeverity(issue?.severity);
    if (sev === severitySelected) prioritizedIssues.push(issue);
    else otherIssues.push(issue);
  }

  // Ordenamos cada bloque por ubicación y concatenamos
  return [...sortIssuesByLocation(prioritizedIssues), ...sortIssuesByLocation(otherIssues)];
}

/**
 * Construye un texto corto con la localización del issue.
 * Ejemplo: "línea 12, col 5"
 */
export function formatIssueLocation(issue) {

  // Obtenemos y normalizamos campos del issue
  const path = typeof issue?.path === "string" ? issue.path : "";
  const line = toInt(issue?.line);
  const column = toInt(issue?.column);

  if (!path && line === null && column === null) return "";
  if (line === null) return path || "";
  
  // Si no hay path, no mostramos el archivo temporal "input.py"
  if (!path) {
    if (column !== null) return `línea ${line}, col ${column}`;
    return `línea ${line}`;
  }

  if (column !== null) return `${path || "input.py"}:${line}:${column}`;
  return `${path || "input.py"}:${line}`;
}

/**
 * Ordena issues por línea/columna (si existen).
 * Si no hay línea/columna, quedan al final.
 */
export function sortIssuesByLocation(issues) {

  if (!Array.isArray(issues)) return [];

  // Copiamos la lista para no modificar la original
  const issuesCopy = [...issues];

  /* Ordenamos la copia con un comparador, internamente sucede lo siguiente:
  - devuelve < 0 si a va antes que b
  - devuelve > 0 si b va antes que a
  - 0 si empatan
  */
  issuesCopy.sort((a, b) => {
    // Si falta line, usamos Infinity para mandarlo al final
    const lineA = typeof a?.line === "number" ? a.line : Number.POSITIVE_INFINITY;
    const lineB = typeof b?.line === "number" ? b.line : Number.POSITIVE_INFINITY;

    // Orden principal: por línea ascendente
    if (lineA !== lineB) return lineA - lineB;

    // Si las líneas son iguales, ordenamos por columna ascendente
    const colA = typeof a?.column === "number" ? a.column : Number.POSITIVE_INFINITY;
    const colB = typeof b?.column === "number" ? b.column : Number.POSITIVE_INFINITY;

    return colA - colB;
  });

  return issuesCopy;
}

/**
 * Comprueba si un valor es un objeto plano válido (no nulo ni array).
 */
export function isPlainObject(v) {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/**
 * Convierte una lista de strings en una representación CSV para mostrar en la UI.
 */
export function listToCsv(v) {
  return Array.isArray(v) ? v.join(", ") : "";
}

/**
 * Convierte una cadena CSV en una lista de strings normalizados en mayúsculas (General)
 */
export function csvToList(text) {
  if (typeof text !== "string") return [];
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.toUpperCase());
}
/**
 * Convierte una cadena CSV en una lista de strings normalizados (Exclusivo de Vulture, para las options ignore_*).
 */
export function csvToListNotUpper(text) {
  if (typeof text !== "string") return [];
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Convierte una cadena CSV en una lista de strings normalizados (Exclusivo de Vulture, para la option de ignore_decorators).
 */
export function csvToListDecorators(text) {
  if (typeof text !== "string") return [];
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(s => (s.startsWith("@") ? s : `@${s}`));
}

/**
 * Convierte un valor en un entero dentro de un rango determinado.
 * Si el valor no es válido, aplica el mínimo como valor por defecto.
 */
export function normalizeIntInRange(n, min, max) {
  const x = Number.isFinite(n) ? Math.floor(n) : min;
  return Math.max(min, Math.min(max, x));
}

/**
 * Convierte un valor a entero seguro.
 * Devuelve null si no puede convertirse a un número finito.
 */
export function toInt(value) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/**
 * Limpia y formatea mensajes de error técnicos (CLI/logs) para mostrarlos mejor en "Ver detalles".
 */
export function cleanErrorDetails(error) {
  // Mensaje crudo
  const msg = typeof error?.message === "string" ? error.message : "";
  if (!msg.trim()) return "";

  // Ruff.
  // Eliminamos la línea típica de CLI
  if (msg.includes("For more information, try '--help'")) {
    return msg
      .split("\n")
      .filter((line) => !line.includes("For more information, try '--help'"))
      .join("\n")
      .trim();
  }

  // Bandit.
  // Su salida incluye tags basura para el usuario
  if (msg.includes("[main]") || msg.includes("[extension_loader]")) {
    // Normalizamos líneas: trim + quitamos vacías
    const lines = msg
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const cleanedLines = [];
    let hasPrefix = false;

    for (const line of lines) {
      const isPrefix = line.toLowerCase().startsWith("opciones inválidas:");
      if (isPrefix) {
        hasPrefix = true;
        // Nos quedamos solo con el prefijo (sin el resto del log INFO)
        cleanedLines.push("Opciones inválidas en Bandit:");
        continue;
      }

      // Quitamos INFO, conservamos WARNING/ERROR
      if (line.includes("\tINFO\t") || line.includes(" INFO ")) continue;

      cleanedLines.push(line);
    }

    const cleaned = cleanedLines.join("\n").trim();
    // Si no existía prefijo, lo agregamos nosotros para dar contexto de herramienta.
    if (!hasPrefix) return `Opciones inválidas en Bandit:\n${cleaned}`;
    return cleaned;
  }

    // Javac
    // Cuando hay error de flags, javac imprime varias líneas.
    // Nos quedamos solo con la primera línea relevante.
    if (msg.includes("Usage: javac")){
      const firstLine = msg.split("\n")[0].trim();
      return firstLine;
    }

  return msg.trim();
}