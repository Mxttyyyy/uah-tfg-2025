import { isPlainObject, toInt } from "../../../utils/uiUtils";

/* --------------------------- Metrics (Lizard) --------------------------- */

/**
 * Sección de resultados de métricas estáticas del código (Lizard).
 *
 * Muestra métricas básicas de las funciones con mayor complejidad ciclomática.
 */

export default function JavaMetricsSection({ metrics, leftBorderClass }) {
  const hasMetrics = isPlainObject(metrics) && Object.keys(metrics).length > 0;

  // Funciones
  const functions = Array.isArray(metrics?.functions) ? metrics.functions : [];
  const totalFunctions = functions.length;

  // Líneas de código (NLOCS) totales
  let nlocs_total = 0;
  if (totalFunctions > 0) {
    for (let f of functions) {
      nlocs_total += f.nloc;
    }
  }

  // CC media
  let cc_media = 0;
  if (totalFunctions > 0) {
    for (let f of functions) {
      cc_media += f.cyclomatic_complexity;
    }
    cc_media /= totalFunctions;
  }

  // Funciones con mayor CC. Ordenamos por complejidad ciclomática descendente
  const topFunctions = [...functions]
    .filter((m) => isPlainObject(m))
    .sort(
      (a, b) =>(toInt(b.cyclomatic_complexity) || 0) - (toInt(a.cyclomatic_complexity) || 0),
    )
    .slice(0, 8);

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
          Métricas (Lizard)
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
          <div className="mt-2 overflow-x-auto space-y-3">
            <div 
              className={`
                rounded-md border border-gray-200 bg-white
                p-3 dark:border-neutral-700 dark:bg-neutral-900
              `}
            >
              <h4 className="text-sm font-semibold text-gray-900 dark:text-neutral-100">
                Resumen
              </h4>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-700 dark:text-neutral-200">
                <IssueLabel
                  label={`Funciones analizadas: ${totalFunctions ?? "-"}`}
                />
                <IssueLabel
                  label={`CC máx: ${topFunctions[0]?.cyclomatic_complexity || "-"}`}
                />
                <IssueLabel label={`CC media: ${cc_media || "-"}`} />
                <IssueLabel label={`NLOC totales: ${nlocs_total || "-"}`} />
              </div>
            </div>

            <div 
              className={`
                rounded-md border border-gray-200 bg-white
                p-3 dark:border-neutral-700 dark:bg-neutral-900
              `}
            >
              <h4 className="text-sm font-semibold text-gray-900 dark:text-neutral-100 mb-2">
                Top funciones por complejidad (CC)
              </h4>
              {topFunctions.length === 0 ? (
                <p className="text-sm text-gray-700 dark:text-neutral-200">
                  No hay funciones para mostrar.
                </p>
              ) : (
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-[720px] w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-gray-600 dark:text-neutral-300">
                      <tr>
                        <th className="py-2 pr-3">Función</th>
                        <th className="py-2 pr-3">CC</th>
                        <th className="py-2 pr-3">NLOC</th>
                        <th className="py-2 pr-3">Params</th>
                        <th className="py-2 pr-3">Tokens</th>
                        <th className="py-2 pr-3">Línea</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-800 dark:text-neutral-200">
                      {topFunctions.map((f, idx) => (
                        <tr
                          key={`${f.name || "func"}-${idx}`}
                          className="border-t border-gray-200 dark:border-neutral-700"
                        >
                          <td className="py-2 pr-3 font-medium">{f.long_name || f.name || "-"}</td>
                          <td className="py-2 pr-3">{toInt(f.cyclomatic_complexity) ?? "-"}</td>
                          <td className="py-2 pr-3">{toInt(f.nloc) ?? "-"}</td>
                          <td className="py-2 pr-3">{toInt(f.parameter_count) ?? "-"}</td>
                          <td className="py-2 pr-3">{toInt(f.token_count) ?? "-"}</td>
                          <td className="py-2 pr-3">{toInt(f.start_line) ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <p className="mt-4 text-xs text-gray-600 dark:text-neutral-300">
                    CC: complejidad ciclomática | NLOC: líneas de código sin
                    comentarios | Params: número de parámetros del método |
                    Tokens: número de elementos léxicos del método | Línea:
                    Línea donde comienza el método en el código analizado
                  </p>
                  <p className="mt-3 text-xs text-gray-600 dark:text-neutral-300">
                    CC más alto → función más compleja y potencialmente más
                    difícil de mantener.
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