import { useEffect, useMemo, useRef, useState } from "react";
import Alert from "../Alert";
import ResultsSummary from "./ResultsSummary";
import IssueList from "./IssueList";
import { buildSeverityCounts, isPlainObject, toInt } from "../../utils/uiUtils";

/**
 * Panel principal de resultados del análisis.
 *
 * Recibe la respuesta completa del backend y coordina la visualización
 * del resumen, listas de incidencias y métricas.
 *
 * Props:
 * - result: object | null (resultado devuelto por el backend)
 * - autoScroll: boolean (indica si se realiza scroll automático a resultados)
 * - onIssueSelect: function (callback al seleccionar un issue)
 */
export default function ResultsPanel({
  result,
  autoScroll = true,
  onIssueSelect,
}) {

  // Referencia al <section> del panel de resultados (usada para hacer auto-scroll)
  const sectionRef = useRef(null);

  // Estado para ordenar issues por severidad
  const [severitySelected, setSeveritySelected] = useState("none"); // "error" | "warning" | "info" | null

  // Normalizamos la respuesta del backend
  const safeResult = isPlainObject(result) ? result : null;

  // Obtenemos los campos del resultado del análisis y normalizamos
  const error = safeResult?.error && isPlainObject(safeResult.error) ? safeResult.error : null;
  const analysis = isPlainObject(safeResult?.analysis) ? safeResult.analysis : {};
  const summary = isPlainObject(safeResult?.summary) ? safeResult.summary : {};
  const language = typeof safeResult?.language === "string" ? safeResult.language : "";
  const analysisTimeMs = typeof safeResult?.analysis_time_ms === "number" ? safeResult.analysis_time_ms : null;

  // Listas de issues por tipo de análisis
  const styleIssues = Array.isArray(analysis.style) ? analysis.style : [];
  const securityIssues = Array.isArray(analysis.security) ? analysis.security : [];
  const deadCodeIssues = Array.isArray(analysis.dead_code) ? analysis.dead_code : [];
  const typesIssues = Array.isArray(analysis.types) ? analysis.types : [];
  const metrics = isPlainObject(analysis.metrics) ? analysis.metrics : {};

  // Número total de issues
  const totalIssues = useMemo(() => {
    if (typeof summary.total_issues === "number") return summary.total_issues;
    return (
      styleIssues.length +
      securityIssues.length +
      deadCodeIssues.length +
      typesIssues.length
    );
  }, [
    summary.total_issues,
    styleIssues.length,
    securityIssues.length,
    deadCodeIssues.length,
    typesIssues.length,
  ]);

  // Conteo de issues por severidad
  const issuesBySeverity = useMemo(() => {
    if (isPlainObject(summary.by_severity)) return summary.by_severity;
    return buildSeverityCounts([
      ...styleIssues,
      ...securityIssues,
      ...deadCodeIssues,
      ...typesIssues,
    ]);
  }, [
    summary.by_severity,
    styleIssues,
    securityIssues,
    deadCodeIssues,
    typesIssues,
  ]);

  // Auto-scroll al panel de resultados cuando hay contenido relevante que mostrar
  useEffect(() => {
    if (!autoScroll) return;
    if (!safeResult) return;

    const hasContent =
      !!error ||
      totalIssues > 0 ||
      Object.keys(metrics).length > 0 ||
      analysisTimeMs !== null;

    if (hasContent && sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [autoScroll, safeResult, error, totalIssues, metrics, analysisTimeMs]);

  // Al recibir un nuevo resultado, reseteamos la selección de severidad
  useEffect(() => {
    if (safeResult) setSeveritySelected("none");
  }, [safeResult]);

  // Render inicial mientras no hay resultados del análisis
  if (!safeResult) {
    return (
      <section
        ref={sectionRef}
        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
      >
        <h2 className="text-base font-semibold text-gray-900">Resultados</h2>
        <p className="mt-2 text-sm text-gray-600">
          Esperando resultados del análisis.
        </p>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className={`
        rounded-xl border border-gray-200 bg-white p-4
        shadow-sm hover:shadow-lg hover:-translate-y-[2px] transition
      `}
    >
      {/* Cabecera del panel */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Resultados</h2>
          <p className="mt-1 text-sm text-gray-600">
            Resumen global y detalles del análisis.
          </p>
        </div>

        {/* Etiquetas del análisis - lenguaje, tiempo, issues */}
        <div className="flex flex-wrap items-center gap-2">
          {language ? <IssueLabel label={`Lenguaje: ${language}`} /> : null}
          {analysisTimeMs !== null ? <IssueLabel label={`Tiempo: ${analysisTimeMs} ms`}/> : null}
          <IssueLabel label={`Issues: ${totalIssues}`} />
        </div>
      </div>

      {/* Error en el análisis */}
      {error ? (
        <div className="mt-4">
          <Alert
            variant="error"
            title={error.error_code === "LANGUAGE_MISMATCH"
              ? "El código no es Python válido o no coincide con el lenguaje seleccionado" 
              : "No se pudo completar el análisis. Vuelve a intentarlo."}
            message={`${String(error.message || "Error desconocido")}${
              typeof error.http_status === "number"
                ? ` (HTTP ${error.http_status})`
                : ""
            }`}
          />
          {/* Ver detalles */}
    {typeof error.message === "string" && error.message.trim() && (
      <details className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
        <summary className="cursor-pointer font-medium text-gray-800 hover:text-blue-600">
          Ver detalles
        </summary>

        <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-gray-700">
          {error.message}
          {typeof error.http_status === "number"
            ? `\n(HTTP ${error.http_status})`
            : ""}
        </pre>
      </details>
    )}
        </div>
      ) : null}

      {/* Resumen global de issues y selector de severidad */}
      <div className="mt-5">
        <ResultsSummary
          total={totalIssues}
          issuesBySeverity={issuesBySeverity}
          severitySelected={severitySelected}
          onSeverityChange={setSeveritySelected}
        />
      </div>

      {/* Secciones de cada tipo de análisis */}
      <div className="mt-6 space-y-5">
        <IssueList
          title="Estilo y buenas prácticas (Ruff)"
          subtitle="Problemas de estilo, convenciones y reglas de lint."
          issues={styleIssues}
          emptyText="Sin issues de estilo."
          onIssueSelect={onIssueSelect}
          severitySelected={severitySelected}
          leftBorderClass="border-l-cyan-300 border-l-4 hover:border-l-cyan-300"
        />

        <IssueList
          title="Seguridad básica (Bandit)"
          subtitle="Posibles patrones inseguros o riesgos comunes."
          issues={securityIssues}
          emptyText="Sin issues de seguridad."
          onIssueSelect={onIssueSelect}
          severitySelected={severitySelected}
          leftBorderClass="border-l-purple-300 border-l-4 hover:border-l-purple-300"
        />

        <MetricsSection
          metrics={metrics}
          leftBorderClass="border-l-amber-300 border-l-4 hover:border-l-amber-300"
        />

        <IssueList
          title="Código muerto (Vulture)"
          subtitle="Código potencialmente sin uso (variables, imports, funciones…)."
          issues={deadCodeIssues}
          emptyText="Sin avisos de código muerto."
          onIssueSelect={onIssueSelect}
          severitySelected={severitySelected}
          leftBorderClass="border-l-emerald-300 border-l-4 hover:border-l-emerald-300"
        />

        <IssueList
          title="Tipado (Mypy)"
          subtitle="Problemas de tipado estático y compatibilidad de tipos."
          issues={typesIssues}
          emptyText="Sin issues de tipado."
          onIssueSelect={onIssueSelect}
          severitySelected={severitySelected}
          leftBorderClass="border-l-orange-400 border-l-4 hover:border-l-orange-400"
        />
      </div>
    </section>
  );
}

/* --------------------------- Metrics (Radon) --------------------------- */

/**
 * Sección de métricas estáticas del código (Radon).
 *
 * Muestra índices de mantenibilidad, métricas básicas de código
 * y los bloques con mayor complejidad ciclomática.
 */
function MetricsSection({ metrics, leftBorderClass }) {

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
        hover:bg-blue-100/60 transition ${leftBorderClass}
      `}
    >
      {/* Cabecera del panel */}
      <summary
        className={`
          flex cursor-pointer list-item items-center justify-between
          gap-3 px-3 py-2 text-sm font-semibold text-gray-900 hover:text-blue-700
        `}
      >
        <span className="flex items-center gap-2">
          Métricas ({tool})
          <span className="text-xs font-semibold text-gray-600">
            {hasMetrics ? "" : "(vacío)"}
          </span>
        </span>
      </summary>

      <div className="px-3 pb-3">
        {!hasMetrics ? (
          <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
            No se devolvieron métricas.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 lg:grid-cols-2">

              {/* Panel de índice de mantenibilidad global del código */}
              <div className="rounded-md border border-gray-200 bg-white p-3">
                <h4 className="text-sm font-semibold text-gray-900">
                  Maintainability Index (MI)
                </h4>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-700">
                  <IssueLabel label={`Score: ${mi.score ?? "—"}`} />
                  <IssueLabel label={`Rank: ${mi.rank || "—"}`} />
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  Cuanto mayor es el MI, mejor mantenibilidad global.
                </p>
              </div>

              {/* Panel/Tabla de métricas básicas */}
              <div className="rounded-md border border-gray-200 bg-white p-3">
                <h4 className="text-sm font-semibold text-gray-900">
                  Raw metrics
                </h4>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-700 sm:grid-cols-3">
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
            <div className="rounded-md border border-gray-200 bg-white p-3">
              <h4 className="text-sm font-semibold text-gray-900">
                Complejidad ciclomática (top bloques)
              </h4>

              {topBlocks.length === 0 ? (
                <p className="mt-2 text-sm text-gray-700">
                  No hay bloques para mostrar.
                </p>
              ) : (
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-[620px] w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-gray-600">
                      <tr>
                        <th className="py-2 pr-3">Bloque</th>
                        <th className="py-2 pr-3">Tipo</th>
                        <th className="py-2 pr-3">CC</th>
                        <th className="py-2 pr-3">Rank</th>
                        <th className="py-2 pr-3">Línea</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-800">
                      {topBlocks.map((b, idx) => (
                        <tr
                          key={`${b.name || "block"}-${idx}`}
                          className="border-t border-gray-200"
                        >
                          <td className="py-2 pr-3 font-medium">
                            {String(b.name || "—")}
                          </td>
                          <td className="py-2 pr-3">{String(b.type || "—")}</td>
                          <td className="py-2 pr-3">
                            {toInt(b.complexity) ?? "—"}
                          </td>
                          <td className="py-2 pr-3">{String(b.rank || "—")}</td>
                          <td className="py-2 pr-3">{toInt(b.line) ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="mt-2 text-xs text-gray-600">
                CC más alto → lógica más compleja (más difícil de mantener).
              </p>
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
    <div className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5">
      <p className="text-xs font-semibold text-gray-600">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value ?? "-"}</p>
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
        border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-semibold text-gray-700
    `}
    >
      {label}
    </span>
  );
}
