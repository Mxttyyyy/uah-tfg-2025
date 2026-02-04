import { useEffect, useMemo, useRef, useState } from "react";
import Alert from "../Alert";
import ResultsSummary from "./ResultsSummary";
import IssueList from "./IssueList";
import { buildSeverityCounts, isPlainObject, toInt } from "../../utils/uiUtils";

export default function ResultsPanel({
  result,
  autoScroll = true,
  anchorId = "results",
  onIssueSelect, // opcional: para futuro salto/selección en textarea
}) {
  const sectionRef = useRef(null);
  // Estado para ordenar issues por severidad
  const [prioritySeverity, setPrioritySeverity] = useState("none"); // "error" | "warning" | "info" | null

  // Obtenemos los campos del issue y validamos
  const safeResult = isPlainObject(result) ? result : null;

  const error =
    safeResult?.error && isPlainObject(safeResult.error)
      ? safeResult.error
      : null;

  const analysis = isPlainObject(safeResult?.analysis)
    ? safeResult.analysis
    : {};
  const summary = isPlainObject(safeResult?.summary) ? safeResult.summary : {};

  const language =
    typeof safeResult?.language === "string" ? safeResult.language : "";
  const analysisTimeMs =
    typeof safeResult?.analysis_time_ms === "number"
      ? safeResult.analysis_time_ms
      : null;

  const styleIssues = Array.isArray(analysis.style) ? analysis.style : [];
  const securityIssues = Array.isArray(analysis.security)
    ? analysis.security
    : [];
  const deadCodeIssues = Array.isArray(analysis.dead_code)
    ? analysis.dead_code
    : [];
  const typesIssues = Array.isArray(analysis.types) ? analysis.types : [];
  const metrics = isPlainObject(analysis.metrics) ? analysis.metrics : {};

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

  const bySeverity = useMemo(() => {
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

  // Auto-scroll cuando llegan resultados (o error)
  useEffect(() => {
    if (!autoScroll) return;
    if (!safeResult) return;

    const hasSomething =
      !!error ||
      totalIssues > 0 ||
      Object.keys(metrics).length > 0 ||
      analysisTimeMs !== null;

    if (hasSomething && sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [autoScroll, safeResult, error, totalIssues, metrics, analysisTimeMs]);

  useEffect(() => {
    // Al recibir un nuevo resultado, volvemos al orden normal
    if (safeResult) setPrioritySeverity("none");
  }, [safeResult]);

  // Placeholder cuando todavía no hay resultado
  if (!safeResult) {
    return (
      <section
        id={anchorId}
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
      id={anchorId}
      ref={sectionRef}
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      {/* Cabecera */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Resultados</h2>
          <p className="mt-1 text-sm text-gray-600">
            Resumen global y detalles del análisis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {language ? <IssueLabel label={`Lenguaje: ${language}`} /> : null}
          {analysisTimeMs !== null ? (
            <IssueLabel label={`Tiempo: ${analysisTimeMs} ms`} />
          ) : null}
          <IssueLabel label={`Issues: ${totalIssues}`} />
        </div>
      </div>

      {/* Error global */}
      {error ? (
        <div className="mt-4">
          <Alert
            variant="error"
            title="No se pudo completar el análisis. Vuelve a intentarlo."
            message={`${String(error.message || "Error desconocido")}${
              typeof error.http_status === "number"
                ? ` (HTTP ${error.http_status})`
                : ""
            }`}
          />
        </div>
      ) : null}

      {/* Resumen */}
      <div className="mt-5">
        <ResultsSummary
          total={totalIssues}
          bySeverity={bySeverity}
          prioritySeverity={prioritySeverity}
          onPriorityChange={setPrioritySeverity}
        />
      </div>

      {/* Secciones */}
      <div className="mt-6 space-y-3">
        <IssueList
          title="Estilo y buenas prácticas (Ruff)"
          subtitle="Problemas de estilo, convenciones y reglas de lint."
          items={styleIssues}
          emptyText="Sin issues de estilo."
          onIssueSelect={onIssueSelect}
          prioritySeverity={prioritySeverity}
        />

        <IssueList
          title="Seguridad básica (Bandit)"
          subtitle="Posibles patrones inseguros o riesgos comunes."
          items={securityIssues}
          emptyText="Sin issues de seguridad."
          onIssueSelect={onIssueSelect}
          prioritySeverity={prioritySeverity}
        />

        <MetricsSection metrics={metrics} />

        <IssueList
          title="Código muerto (Vulture)"
          subtitle="Código potencialmente sin uso (variables, imports, funciones…)."
          items={deadCodeIssues}
          emptyText="Sin avisos de código muerto."
          onIssueSelect={onIssueSelect}
          prioritySeverity={prioritySeverity}
        />

        <IssueList
          title="Tipado (Mypy)"
          subtitle="Problemas de tipado estático y compatibilidad de tipos."
          items={typesIssues}
          emptyText="Sin issues de tipado."
          onIssueSelect={onIssueSelect}
          prioritySeverity={prioritySeverity}
        />
      </div>
    </section>
  );
}

/* --------------------------- Metrics (Radon) --------------------------- */

function MetricsSection({ metrics }) {
  const hasMetrics = isPlainObject(metrics) && Object.keys(metrics).length > 0;

  const tool = typeof metrics?.tool === "string" ? metrics.tool : "radon";

  const cc = isPlainObject(metrics?.cyclomatic_complexity)
    ? metrics.cyclomatic_complexity
    : {};
  const mi = isPlainObject(metrics?.maintainability_index)
    ? metrics.maintainability_index
    : {};
  const raw = isPlainObject(metrics?.raw_metrics) ? metrics.raw_metrics : {};

  const blocks = Array.isArray(cc.blocks) ? cc.blocks : [];
  const topBlocks = [...blocks]
    .filter((b) => isPlainObject(b))
    .sort((a, b) => (toInt(b.complexity) || 0) - (toInt(a.complexity) || 0))
    .slice(0, 6);

  return (
    <details
      open={hasMetrics}
      className="rounded-lg border border-gray-200 bg-gray-50/60 hover:border-blue-200 hover:bg-blue-100/60 transition"
    >
      <summary className="flex cursor-pointer list-item items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-gray-900 hover:text-blue-700">
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
              <div className="rounded-md border border-gray-200 bg-white p-3">
                <h4 className="text-sm font-semibold text-gray-900">
                  Maintainability Index (MI)
                </h4>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-700">
                  <IssueLabel label={`Score: ${mi.score ?? "—"}`} />
                  <IssueLabel label={`Rank: ${mi.rank || "—"}`} />
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  Cuanto mayor el MI, mejor mantenibilidad global.
                </p>
              </div>

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
                          className="border-t border-gray-100"
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

function MetricItem({ label, value }) {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5">
      <p className="text-xs font-semibold text-gray-600">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value ?? "—"}</p>
    </div>
  );
}

/* ------------------------------ helpers ------------------------------ */

function IssueLabel({ label }) {
  return (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-semibold text-gray-700">
      {label}
    </span>
  );
}
