import { toInt } from "../../utils/uiUtils";

/**
 * Resumen visual de los resultados del análisis.
 *
 * Muestra el número total de issues y su distribución por severidad
 * (error, warning e info).
 */
export default function ResultsSummary({ total, bySeverity }) {

  // Normalizamos los contadores por severidad para garantizar valores numéricos seguros,
  // aún incluso si faltan datos o llegan valores inválidos desde el backend.
  const info = toInt(bySeverity?.info) ?? 0;
  const warning = toInt(bySeverity?.warning) ?? 0;
  const error = toInt(bySeverity?.error) ?? 0;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryCard title="Total" value={toInt(total) ?? 0} />
      <SummaryCard title="Errores" value={error} tone="error" />
      <SummaryCard title="Warnings" value={warning} tone="warning" />
      <SummaryCard title="Info" value={info} tone="info" />
    </div>
  );
}

/**
 * Tarjeta de resumen individual.
 *
 * Muestra un valor numérico destacado con un estilo visual
 * asociado a su severidad.
 */
function SummaryCard({ title, value, tone = "neutral" }) {
  const severityStyles = {
    neutral: "border-gray-200 bg-white",
    info: "border-blue-200 bg-blue-50/40",
    warning: "border-amber-200 bg-amber-50/40",
    error: "border-red-200 bg-red-50/40",
  };

  return (
    <div
      className={`rounded-lg border p-3 ${severityStyles[tone] || severityStyles.neutral}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
        {title}
      </p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
