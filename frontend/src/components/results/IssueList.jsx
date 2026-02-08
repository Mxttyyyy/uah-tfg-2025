import {
  isPlainObject,
  formatIssueLocation,
  applySeverityPriority,
  normalizeSeverity,
  toInt,
} from "../../utils/uiUtils";

/**
 * Lista desplegable de issues detectados por el análisis.
 *
 * Muestra las incidencias de forma estructurada, ordenadas por
 * ubicación en el código fuente y priorizadas visualmente según
 * la severidad seleccionada.
 *
 * Props:
 * - title: string (título del bloque de issues)
 * - subtitle: string | null (texto descriptivo opcional)
 * - issues: array (lista de issues devueltos por el análisis)
 * - emptyText: string (mensaje mostrado cuando no hay issues)
 * - onIssueSelect: function (callback al seleccionar un issue)
 * - severitySelected: string | null (severidad priorizada)
 * - leftBorderClass: string (clase tailwind para el borde lateral)
 */
export default function IssueList({
  title,
  subtitle,
  issues: rawIssues,
  emptyText = "Sin incidencias.",
  onIssueSelect,
  severitySelected = null,
  leftBorderClass = "border-l-blue-500",
}) {
  const issues = Array.isArray(rawIssues) ? rawIssues : [];

  // Ordenamos los issues por severidad y ubicación
  const sortedIssues = applySeverityPriority(issues, severitySelected);
  const issueCount = sortedIssues.length;

  return (
    <details
      open={issueCount > 0}
      className={`
        rounded-lg border border-gray-200 hover:border-blue-200
        bg-gray-50/60 hover:bg-blue-50/80 transition ${leftBorderClass}
      `}
    >
      <summary
        className={`
          flex cursor-pointer list-item items-center justify-between
          gap-3 px-3 py-2 text-sm font-semibold text-gray-900 hover:text-blue-700
        `}
      >
        {/* Título del issue y contador */}
        <span className="flex items-center gap-2">
          {title}
          <span className="text-xs font-semibold text-gray-600">
            ({issueCount})
          </span>
        </span>
      </summary>

      {/* Descripción */}
      <div className="px-3 pb-3">
        {subtitle ? (
          <p className="mb-3 text-sm text-gray-600">{subtitle}</p>
        ) : null}
        {/* Lista de issues */}
        {issueCount === 0 ? (
          <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
            {emptyText}
          </div>
        ) : (
          <ul className="space-y-2">
            {sortedIssues.map((issue, index) => (
              <li key={issueKey(issue, index)}>
                <IssueCard issue={issue} onSelect={onIssueSelect} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

/**
 * Representa un issue individual con su severidad,
 * mensaje, localización y sugerencias asociadas.
 */
function IssueCard({ issue: raw_issue, onSelect }) {
  // Obtenemos todos los campos del issue y los normalizamos para evitar errores
  const issue = isPlainObject(raw_issue) ? raw_issue : {};
  const severity = normalizeSeverity(issue.severity);

  const message = String(issue.message || "Issue");
  const rule_code = typeof issue.code === "string" ? issue.code : "";
  const tool = typeof issue.tool === "string" ? issue.tool : "";
  const category = typeof issue.category === "string" ? issue.category : "";

  const suggestion = typeof issue.suggestion === "string" ? issue.suggestion : "";
  const helpUrl = typeof issue.help_url === "string" ? issue.help_url : "";
  const notes = Array.isArray(issue.notes) ? issue.notes : [];

  const location = formatIssueLocation(issue);

  return (
    <div className="rounded-md border border-gray-200 bg-white p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          
          {/* Labels informativos */}
          <div className="flex flex-wrap items-center gap-2">
            <SeverityLabel severity={severity} />
            {tool ? <IssueLabel label={tool} /> : null}
            {category ? <IssueLabel label={category} /> : null}
            {rule_code ? <IssueLabel label={rule_code} /> : null}
          </div>

          {/* Mensaje del issue */}
          <p className="mt-2 text-sm font-medium text-gray-900 break-words">
            {message}
          </p>

          {/* Ubicación del issue */}
          {location ? (
            <p className="mt-1 text-xs text-gray-600">
              Ubicación: {/* Link a la ubicación del issue en el código */}
              <span
                onClick={() => onSelect(issue)}
                className="font-medium cursor-pointer text-blue-700 hover:text-blue-800 hover:underline"
              >
                {location}
              </span>
            </p>
          ) : null}
        </div>
      </div>

      {/* Sugerencia */}
      {suggestion ? (
        <div className="mt-3 rounded-md border border-blue-100 bg-blue-50/50 px-3 py-2">
          <p className="text-xs font-semibold text-blue-900">Sugerencia</p>
          <p className="mt-1 text-sm text-blue-950">{suggestion}</p>
        </div>
      ) : null}

      {/* Posibles notas */}
      {notes.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold text-gray-700">Notas</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-gray-700">
            {notes.map((n, i) => (
              <li key={`${i}-${String(n).slice(0, 12)}`}>{String(n)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Posible enlace de ayuda */}
      {helpUrl ? (
        <div className="mt-3">
          <a
            href={helpUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-blue-700 hover:text-blue-800 hover:underline"
          >
            Abrir enlace de ayuda
          </a>
        </div>
      ) : null}
    </div>
  );
}

/* ----------------------------- Componentes auxiliares ---------------------------- */

/**
 * Label para metadatos del issue (herramienta, código, categoría).
 */
function IssueLabel({ label }) {
  return (
    <span
      className={`
        inline-flex items-center rounded-full border border-gray-200
        bg-gray-50 px-2 py-0.5 text-xs font-semibold text-gray-700
      `}
    >
      {label}
    </span>
  );
}

/**
 * Indicador visual de severidad (error, warning, info).
 */
function SeverityLabel({ severity }) {
  const map = {
    error: "border-red-200 bg-red-50 text-red-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    info: "border-blue-200 bg-blue-50 text-blue-800",
  };

  const label =
    severity === "error"
      ? "ERROR"
      : severity === "warning"
        ? "WARNING"
        : "INFO";
  const severityClass = map[severity] || map.warning;

  return (
    <span
      className={`
        inline-flex items-center rounded-full border
        px-2 py-0.5 text-xs font-bold ${severityClass}
      `}
    >
      {label}
    </span>
  );
}

/* ----------------------------- Funciones auxiliares ---------------------------- */

/**
 * Genera una clave única para usar como 'key' en listas renderizadas con '.map()'.
 */
function issueKey(issue, index) {
  const tool = typeof issue?.tool === "string" ? issue.tool : "tool";
  const code = typeof issue?.code === "string" ? issue.code : "";
  const line = toInt(issue?.line);
  const col = toInt(issue?.column);
  return `${tool}-${code}-${line ?? "x"}-${col ?? "x"}-${index}`;
}
