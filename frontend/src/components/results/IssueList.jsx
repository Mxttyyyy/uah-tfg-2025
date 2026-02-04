import {
  isPlainObject,
  formatIssueLocation,
  applySeverityPriority,
  normalizeSeverity,
  toInt,
} from "../../utils/uiUtils";

/**
 * Lista desplegable de issues detectadas por el análisis.
 *
 * Ordena los issues por ubicación en el código y muestra
 * su información detallada de forma estructurada.
 */
export default function IssueList({
  title,
  subtitle,
  items: rawIssues,
  emptyText = "Sin incidencias.",
  onIssueSelect, // opcional para futuro: saltar a línea en textarea
  prioritySeverity = null,
  leftBorderClass = "border-l-blue-500",
}) {
  const issues = Array.isArray(rawIssues) ? rawIssues : [];
  const sortedIssues = applySeverityPriority(issues, prioritySeverity);
  const issueCount = sortedIssues.length;

  return (
    <details
      open={issueCount > 0}
      className={`
        rounded-lg border border-gray-200 bg-gray-50/60 hover:border-blue-200
        hover:bg-blue-50/80 transition ${leftBorderClass}
      `}
    >
      <summary
        className={`
          flex cursor-pointer list-item items-center justify-between
          gap-3 px-3 py-2 text-sm font-semibold text-gray-900 hover:text-blue-700
        `}
      >
        <span className="flex items-center gap-2">
          {title}
          <span className="text-xs font-semibold text-gray-600">
            ({issueCount})
          </span>
        </span>
      </summary>

      <div className="px-3 pb-3">
        {subtitle ? (
          <p className="mb-3 text-sm text-gray-600">{subtitle}</p>
        ) : null}

        {issueCount === 0 ? (
          <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
            {emptyText}
          </div>
        ) : (
          <ul className="space-y-2">
            {sortedIssues.map((issue, idx) => (
              <li key={issueKey(issue, idx)}>
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
  // Normalizamos y ordenamos la lista de issues para garantizar
  // un render consistente aunque los datos sean incompletos.
  const issue = isPlainObject(raw_issue) ? raw_issue : {};
  const severity = normalizeSeverity(issue.severity);

  const message = String(issue.message || "Issue");
  const rule_code = typeof issue.code === "string" ? issue.code : "";
  const tool = typeof issue.tool === "string" ? issue.tool : "";
  const category = typeof issue.category === "string" ? issue.category : "";

  const suggestion =
    typeof issue.suggestion === "string" ? issue.suggestion : "";
  const helpUrl = typeof issue.help_url === "string" ? issue.help_url : "";
  const notes = Array.isArray(issue.notes) ? issue.notes : [];

  const location = formatIssueLocation(issue);

  return (
    <div className="rounded-md border border-gray-200 bg-white p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityLabel severity={severity} />
            {tool ? <IssueLabel label={tool} /> : null}
            {category ? <IssueLabel label={category} /> : null}
            {rule_code ? <IssueLabel label={rule_code} /> : null}
          </div>

          <p className="mt-2 text-sm font-medium text-gray-900 break-words">
            {message}
          </p>

          {location ? (
            <p className="mt-1 text-xs text-gray-600">
              Ubicación: <span className="font-medium">{location}</span>
            </p>
          ) : null}
        </div>

        {typeof onSelect === "function" ? (
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => onSelect(issue)}
              className={`
                rounded-md border border-gray-300 bg-white px-3 py-1.5
                text-xs font-semibold text-gray-800 hover:bg-gray-50
              `}
            >
              Ir a línea
            </button>
          </div>
        ) : null}
      </div>

      {suggestion ? (
        <div className="mt-3 rounded-md border border-blue-100 bg-blue-50/50 px-3 py-2">
          <p className="text-xs font-semibold text-blue-900">Sugerencia</p>
          <p className="mt-1 text-sm text-blue-950">{suggestion}</p>
        </div>
      ) : null}

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
  const cls = map[severity] || map.warning;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${cls}`}
    >
      {label}
    </span>
  );
}

/**
 * Genera una clave única para usar como 'key' en listas renderizadas con '.map()'.
 */
function issueKey(issue, idx) {
  const tool = typeof issue?.tool === "string" ? issue.tool : "tool";
  const code = typeof issue?.code === "string" ? issue.code : "";
  const line = toInt(issue?.line);
  const col = toInt(issue?.column);
  return `${tool}-${code}-${line ?? "x"}-${col ?? "x"}-${idx}`;
}
