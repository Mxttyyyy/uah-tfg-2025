import { isPlainObject, toInt } from "../../../utils/uiUtils";

/* --------------------------- Metrics (Radon) --------------------------- */

/**
 * Sección de resultados de métricas estáticas del código (Radon).
 *
 * Muestra índices de mantenibilidad, métricas básicas de código
 * y los bloques con mayor complejidad ciclomática.
 */
export default function PythonMetricsSection({ metrics, leftBorderClass }) {
  const hasMetrics = isPlainObject(metrics) && Object.keys(metrics).length > 0;

  // Obtenemos los campos relevantes y normalizamos
  const tool = typeof metrics?.tool === "string" ? metrics.tool : "radon";
  const cc = isPlainObject(metrics?.cyclomatic_complexity) ? metrics.cyclomatic_complexity : {};
  const mi = isPlainObject(metrics?.maintainability_index) ? metrics.maintainability_index : {};
  const raw = isPlainObject(metrics?.raw_metrics) ? metrics.raw_metrics : {};

  const blocks = Array.isArray(cc.blocks) ? cc.blocks : [];

  // Selección de los bloques con mayor complejidad ciclomática (orden descendente)
  // En este caso nos quedamos con los 6 mayores
  const topBlocks = [...blocks]
    .filter((b) => isPlainObject(b))
    .sort((a, b) => (toInt(b.complexity) || 0) - (toInt(a.complexity) || 0))
    .slice(0, 6);

  return (
    <details
      open={false}
      className={`
        rounded-lg border border-gray-200 bg-gray-50/60 hover:border-blue-200
        hover:bg-blue-50/80 transition ${leftBorderClass}
        dark:border-neutral-700 dark:bg-neutral-950/30
        dark:hover:border-sky-900/60 dark:hover:bg-neutral-800/50 
      `}
    >
      {/* Cabecera del panel */}
      <summary
        className={`
          flex cursor-pointer list-item items-center justify-between
          gap-3 px-3 py-2 text-sm font-semibold text-gray-900 hover:text-blue-700
          dark:text-neutral-100 dark:hover:text-sky-400
        `}
      >
        <span className="flex items-center gap-2">
          Métricas ({tool})
          <span className="text-xs font-semibold text-gray-600 dark:text-neutral-300">
            {hasMetrics ? "" : "(vacío)"}
          </span>
        </span>
      </summary>

      <div className="px-3 pb-3">
        {!hasMetrics ? (
          <div
            className={`
            rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700
            dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200
            `}
          >
            No se devolvieron métricas.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 lg:grid-cols-2">

              {/* Panel de índice de mantenibilidad global del código */}
              <div 
                className={`
                  rounded-md border border-gray-200 bg-white
                  p-3 dark:border-neutral-700 dark:bg-neutral-900
                `}
              >
                <h4 className="text-sm font-semibold text-gray-900 dark:text-neutral-100">
                  Maintainability Index (MI)
                </h4>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-700 dark:text-neutral-200">
                  <IssueLabel label={`Score: ${mi.score ?? "-"}`} />
                  <IssueLabel label={`Rank: ${mi.rank || "-"}`} />
                </div>
                <p className="mt-2 text-xs text-gray-600 dark:text-neutral-300">
                  Cuanto mayor es el MI, mejor mantenibilidad global.
                </p>
              </div>

              {/* Panel/Tabla de métricas básicas */}
              <div 
                className={`
                  rounded-md border border-gray-200 bg-white
                  p-3 dark:border-neutral-700 dark:bg-neutral-900
                `}
              >
                <h4 className="text-sm font-semibold text-gray-900 dark:text-neutral-100">
                  Raw metrics
                </h4>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-700 sm:grid-cols-3 dark:text-neutral-200">
                  <MetricItem label="LOC" value={raw.loc} />
                  <MetricItem label="LLOC" value={raw.lloc} />
                  <MetricItem label="SLOC" value={raw.sloc} />
                  <MetricItem label="Comments" value={raw.comments} />
                  <MetricItem label="Blank" value={raw.blank} />
                  <MetricItem label="Multi" value={raw.multi} />
                </div>
              </div>
            </div>

            {/* Panel/Tabla de complejidad ciclomática */}
            <div 
              className={`
                rounded-md border border-gray-200 bg-white
                p-3 dark:border-neutral-700 dark:bg-neutral-900
              `}
            >
              <h4 className="text-sm font-semibold text-gray-900 dark:text-neutral-100">
                Complejidad ciclomática (top bloques)
              </h4>

              {topBlocks.length === 0 ? (
                <p className="mt-2 text-sm text-gray-700 dark:text-neutral-200">
                  No hay bloques para mostrar.
                </p>
              ) : (
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-[620px] w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-gray-600 dark:text-neutral-300">
                      <tr>
                        <th className="py-2 pr-3">Bloque</th>
                        <th className="py-2 pr-3">Tipo</th>
                        <th className="py-2 pr-3">CC</th>
                        <th className="py-2 pr-3">Rank</th>
                        <th className="py-2 pr-3">Línea</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-800 dark:text-neutral-200">
                      {topBlocks.map((b, idx) => (
                        <tr
                          key={`${b.name || "block"}-${idx}`}
                          className="border-t border-gray-200 dark:border-neutral-700"
                        >
                          <td className="py-2 pr-3 font-medium">{String(b.name || "-")}</td>
                          <td className="py-2 pr-3">{String(b.type || "-")}</td>
                          <td className="py-2 pr-3">{toInt(b.complexity) ?? "-"}</td>
                          <td className="py-2 pr-3">{String(b.rank || "-")}</td>
                          <td className="py-2 pr-3">{toInt(b.line) ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-4 text-xs text-gray-600 dark:text-neutral-300">
                    CC más alto → lógica más compleja (más difícil de mantener).
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}

/* ------------------------------ Componentes auxiliares ------------------------------ */

/**
 * Elemento visual para mostrar una métrica simple (label + valor).
 */
function MetricItem({ label, value }) {
  return (
    <div 
      className={`
        rounded-md border border-gray-200 bg-gray-50
        px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-950/40
      `}
    >
      <p className="text-xs font-semibold text-gray-600 dark:text-neutral-300">
        {label}
      </p>

      <p className="text-sm font-medium text-gray-900 dark:text-neutral-100">
        {value ?? "-"}
      </p>
    </div>
  );
}

/**
 * Label para mostrar valores informativos.
 */
function IssueLabel({ label }) {
  return (
    <span
      className={`
        inline-flex items-center rounded-full border 
        border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700
        dark:border-neutral-700 dark:bg-neutral-950/40 dark:text-neutral-200
      `}
    >
      {label}
    </span>
  );
}