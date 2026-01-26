// Utilidades de formato para la UI: formatea tiempos/severidad/localización y ordena issues.

/**
 * Convierte milisegundos a un string legible:
 * - < 1000 => "123 ms"
 * - >= 1000 => "1.23 s"
 */
export function formatAnalysisTime(ms) {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "-";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/**
 * Normaliza severidad a los 3 valores esperados por el sistema:
 * info | warning | error
 */
export function normalizeSeverity(sev) {
  if (sev === "info" || sev === "warning" || sev === "error") return sev;
  return "warning";
}

/**
 * Etiqueta de severidad para mostrar en la UI.
 */
export function severityLabel(sev) {
  const s = normalizeSeverity(sev);
  if (s === "error") return "Error";
  if (s === "warning") return "Warning";
  return "Info";
}

/**
 * Construye un texto corto con la localización del issue.
 * Ejemplo: "input.py · línea 12, col 5"
 */
export function formatIssueLocation(issue) {

  // Si no hay objeto válido, no mostramos nada
  if (!issue || typeof issue !== "object") return "";

  // Si el path no viene, usamos un nombre ficticio para el código pegado en la UI
  const path = typeof issue.path === "string" && issue.path.trim() ? issue.path.trim() : "input.py";

  // line/col: si no son número finitos, los tratamos como no disponibles
  const line = typeof issue.line === "number" && Number.isFinite(issue.line) ? issue.line : null;
  const col = typeof issue.column === "number" && Number.isFinite(issue.column) ? issue.column : null;

  // Construimos el texto según los campos disponibles
  if (line == null && col == null) return path;
  if (line != null && col == null) return `${path} · línea ${line}`;
  if (line == null && col != null) return `${path} · col ${col}`;

  return `${path} · línea ${line}, col ${col}`;
}

/**
 * Ordena issues por línea/columna (si existen).
 * Si no hay línea/columna, quedan al final.
 */
export function sortIssuesByLocation(issues) {

  // Entrada inválida, devolvemos lista vacía
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
 * Convierte un string tipo "E501, F401  ,W293" a ["E501","F401","W293"].
 * Si el resultado queda vacío, devuelve null (para NO mandar [] al backend).
 */
export function parseCommaList(text) {
  if (typeof text !== "string") return null;

  const parts = text
    .split(",") // Convierte el string en un array separado por comas, por ejemplo: text = "E501, F401  , ,W293" --> ["E501"," F401 "," ","W293"]
    .map((x) => x.trim()) // Recorre el array y quita espacios de cada elemento --> ["E501","F401","","W293"]
    .filter((x) => x.length > 0); // Se queda solo con los elementos que cumplan la condición --> ["E501","F401","W293"]

  return parts.length > 0 ? parts : null;
}