import { toInt } from "../../utils/uiUtils";

/**
 * Resumen visual de los resultados del análisis.
 *
 * Muestra el número total de issues y su distribución por severidad
 * (error, warning e info).
 */
export default function ResultsSummary({
  total,
  bySeverity,
  prioritySeverity,
  onPriorityChange,
}) {
  // Normalizamos los contadores por severidad para garantizar valores numéricos seguros,
  // aún incluso si faltan datos o llegan valores inválidos desde el backend.
  const info = toInt(bySeverity?.info) ?? 0;
  const warning = toInt(bySeverity?.warning) ?? 0;
  const error = toInt(bySeverity?.error) ?? 0;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryCard
        title="Total"
        value={toInt(total) ?? 0}
        selected={false}
        onClick={
          typeof onPriorityChange === "function"
            ? () => onPriorityChange("none")
            : undefined
        }
      />
      <SummaryCard
        title="Errores"
        value={error}
        tone="error"
        selected={prioritySeverity === "error"}
        onClick={
          typeof onPriorityChange === "function"
            ? () =>
                onPriorityChange(
                  prioritySeverity === "error" ? "none" : "error",
                )
            : undefined
        }
      />
      <SummaryCard
        title="Warnings"
        value={warning}
        tone="warning"
        selected={prioritySeverity === "warning"}
        onClick={
          typeof onPriorityChange === "function"
            ? () =>
                onPriorityChange(
                  prioritySeverity === "warning" ? "none" : "warning",
                )
            : undefined
        }
      />
      <SummaryCard
        title="Info"
        value={info}
        tone="info"
        selected={prioritySeverity === "info"}
        onClick={
          typeof onPriorityChange === "function"
            ? () =>
                onPriorityChange(prioritySeverity === "info" ? "none" : "info")
            : undefined
        }
      />
    </div>
  );
}

/**
 * Tarjeta de resumen individual.
 *
 * Muestra un valor numérico destacado con un estilo visual
 * asociado a su severidad.
 */
function SummaryCard({
  title,
  value,
  tone = "neutral",
  selected = false,
  onClick,
}) {
  const severityStyles = {
    neutral: "border-gray-300 bg-gray-50/80",
    info: "border-blue-300 bg-blue-100/50",
    warning: "border-amber-300 bg-amber-100/50",
    error: "border-red-300 bg-red-100/50",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-pressed={selected}
      className={[
        "rounded-lg border p-3 text-left transition",
        severityStyles[tone] || severityStyles.neutral,
        onClick ? "cursor-pointer hover:shadow-md" : "cursor-default",
        selected ? "-translate-y-[10px] shadow-md border-2" : "",
        !onClick ? "opacity-100" : "",
      ].join(" ")}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
        {title}
      </p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </button>
  );
}
