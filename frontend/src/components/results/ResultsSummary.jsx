import { toInt } from "../../utils/uiUtils";

/**
 * Resumen visual de los resultados del análisis.
 *
 * Muestra el número total de issues y su distribución por severidad
 * (error, warning e info).
 *
 * Este componente no aplica el filtrado por severidad directamente;
 * únicamente notifica cambios de severidad al padre (ResultsPanel)
 *
 *  Props:
 * - total: int (número total de issues)
 * - issuesBySeverity de issues por severidad)
 * - severitySelected: string (severidad seleccionada)
 * - onSeverityChange: (severity: string) => void
 */
export default function ResultsSummary({
  total,
  issuesBySeverity,
  severitySelected,
  onSeverityChange,
}) {

  // Normalizamos los contadores por severidad para garantizar valores numéricos seguros,
  // aún incluso si faltan datos o llegan valores inválidos desde el backend.
  const info = toInt(issuesBySeverity?.info) ?? 0;
  const warning = toInt(issuesBySeverity?.warning) ?? 0;
  const error = toInt(issuesBySeverity?.error) ?? 0;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      
      {/* SummaryCard para "total" y para cada tipo de severidad */}
      <SummaryCard
        title="Total"
        value={toInt(total) ?? 0}
        selected={false}
        onClick={
          typeof onSeverityChange === "function"
            ? () => onSeverityChange("none")
            : undefined
        }
      />
      <SummaryCard
        title="Errores"
        value={error}
        tone="error"
        selected={severitySelected === "error"}
        onClick={
          typeof onSeverityChange === "function"
            ? () =>
                onSeverityChange(
                  severitySelected === "error" ? "none" : "error"
                )
            : undefined
        }
      />
      <SummaryCard
        title="Warnings"
        value={warning}
        tone="warning"
        selected={severitySelected === "warning"}
        onClick={
          typeof onSeverityChange === "function"
            ? () =>
                onSeverityChange(
                  severitySelected === "warning" ? "none" : "warning",
                )
            : undefined
        }
      />
      <SummaryCard
        title="Info"
        value={info}
        tone="info"
        selected={severitySelected === "info"}
        onClick={
          typeof onSeverityChange === "function"
            ? () =>
                onSeverityChange(severitySelected === "info" ? "none" : "info")
            : undefined
        }
      />
    </div>
  );
}

/* ----------------------------- Componentes auxiliares ---------------------------- */

/**
 * Tarjeta de resumen individual.
 *
 * Muestra el número de issues asociados a una severidad concreta
 * y aplica el estilo visual correspondiente.
 */
function SummaryCard({
  title,
  value,
  tone = "neutral",
  selected = false,
  onClick,
}) {
  const severityStyles = {
    neutral: "border-gray-300 bg-gray-50/80 dark:border-neutral-700 dark:bg-neutral-950/30",
    info: "border-blue-300 bg-blue-100/80 dark:border-sky-900/50 dark:bg-sky-950/50",
    warning: "border-amber-300 bg-amber-100/80 dark:border-amber-900/50 dark:bg-amber-950/50",
    error: "border-red-300 bg-red-100/80 dark:border-red-900/50 dark:bg-red-950/40",
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
        onClick ? "cursor-pointer hover:shadow-md dark:hover:shadow-none" : "cursor-default",
        selected ? "-translate-y-[10px] shadow-md border-2 dark:shadow-none" : "",
        
        // Focus visible en dark también
        "focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-sky-900/20",
      ].join(" ")}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-neutral-300">
        {title}
      </p>
      <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-neutral-100">
        {value}
      </p>
    </button>
  );
}