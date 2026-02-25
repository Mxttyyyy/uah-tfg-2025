import { useEffect, useMemo, useRef, useState } from "react";
import Alert from "../Alert";
import ResultsSummary from "./ResultsSummary";
import IssueList from "./IssueList";
import { buildSeverityCounts, isPlainObject, cleanErrorDetails } from "../../utils/uiUtils";

import PythonMetricsSection from "./metrics/PythonMetricsSection";
import JavaMetricsSection from "./metrics/JavaMetricsSection";

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

  // Configuración dinámica de títulos según lenguaje
  const ANALYSIS_TITLES = {
    python: {
      style: {
        title: "Estilo y buenas prácticas (Ruff)",
        subtitle: "Problemas de estilo, convenciones y reglas de lint.",
      },
      security: {
        title: "Seguridad básica (Bandit)",
        subtitle: "Posibles patrones inseguros o riesgos comunes.",
      },
      dead_code: {
        title: "Código muerto (Vulture)",
        subtitle:
          "Código potencialmente sin uso (variables, imports, funciones...).",
      },
      types: {
        title: "Tipado (Mypy)",
        subtitle: "Problemas de tipado estático y compatibilidad de tipos.",
      },
    },
    java: {
      style: {
        title: "Estilo y buenas prácticas (Checkstyle)",
        subtitle: "Problemas de estilo, convenciones y reglas de lint.",
      },
      security: {
        title: "Seguridad básica (Semgrep)",
        subtitle: "Posibles patrones inseguros o riesgos comunes.",
      },
      dead_code: {
        title: "Código muerto (PMD)",
        subtitle:
          "Código potencialmente sin uso (variables, imports, funciones...).",
      },
      types: {
        title: "Tipado (javac)",
        subtitle: "Problemas de tipado estático y compatibilidad de tipos.",
      },
    },
  };

  // Si por cualquier motivo no llega lenguaje, usamos python como fallback
  const titles = ANALYSIS_TITLES[language] || ANALYSIS_TITLES.python;

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
        className={`
          rounded-xl border border-gray-200 bg-white p-4
          shadow-sm dark:border-neutral-700 dark:bg-neutral-900
        `}
      >
        <h2 className="text-base font-semibold text-gray-900 dark:text-neutral-100">
          Resultados
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-neutral-300">
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
        dark:border-neutral-700 dark:bg-neutral-900 dark:hover:shadow-none
      `}
    >
      {/* Cabecera del panel */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-neutral-100">
            Resultados
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-neutral-300">
            Resumen global y detalles del análisis.
          </p>
        </div>

        {/* Etiquetas del análisis - lenguaje, tiempo, issues */}
        <div className="flex flex-wrap items-center gap-2">
          {language ? <IssueLabel label={`Lenguaje: ${language}`} /> : null}
          {analysisTimeMs !== null ? (
            <IssueLabel label={`Tiempo: ${analysisTimeMs} ms`} />
          ) : null}
          <IssueLabel label={`Issues: ${totalIssues}`} />
        </div>
      </div>

      {/* Error en el análisis */}
      {error ? (
        <div className="mt-4">
          <Alert
            variant="error"
            title={
              error.error_code === "LANGUAGE_MISMATCH"
                ? language === "python"
                  ? "El código no es Python válido o no coincide con el lenguaje seleccionado"
                  : "El código no es Java válido o no coincide con el lenguaje seleccionado"
                : "No se pudo completar el análisis. Vuelve a intentarlo."
            }
            message={`${String(error.message || "Error desconocido")}${
              typeof error.http_status === "number"
                ? ` (HTTP ${error.http_status})`
                : ""
            }`}
          />

          {/* Ver detalles */}
          {typeof error.message === "string" && error.message.trim() && (
            <details 
              className={`
                mt-3 rounded-lg border border-red-200 bg-red-100 p-3 text-sm text-red-800
                dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200
              `}
            >
              <summary 
                className={`
                  cursor-pointer font-medium text-gray-800
                  hover:text-red-900 dark:text-neutral-100 dark:hover:text-red-200
                `}
              >
                Ver detalles
              </summary>

              <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-gray-800 dark:text-neutral-100">
                {cleanErrorDetails(error)}
              </pre>

              {typeof error.http_status === "number" ? (
                <div className="mt-2 text-[11px] text-gray-600 dark:text-neutral-300">
                  HTTP {error.http_status}
                </div>
              ) : null}
            </details>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <Alert
            variant="success"
            title={"Análisis realizado con éxito."}
            message={"Análisis realizado con éxito."}
          />
        </div>
      )}

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
          title={titles.style.title}
          subtitle={titles.style.subtitle}
          issues={styleIssues}
          emptyText="Sin issues de estilo."
          onIssueSelect={onIssueSelect}
          severitySelected={severitySelected}
          leftBorderClass={`
            border-l-cyan-300 border-l-4 hover:border-l-cyan-300
            dark:border-l-cyan-300 border-l-4 dark:hover:border-l-cyan-300
          `}
        />

        <IssueList
          title={titles.security.title}
          subtitle={titles.security.subtitle}
          issues={securityIssues}
          emptyText="Sin issues de seguridad."
          onIssueSelect={onIssueSelect}
          severitySelected={severitySelected}
          leftBorderClass={`
            border-l-purple-300 border-l-4 hover:border-l-purple-300
            dark:border-l-purple-300 border-l-4 dark:hover:border-l-purple-300
          `}
        />

        {language === "python" ? (
          <PythonMetricsSection
            metrics={metrics}
            leftBorderClass={`
              border-l-amber-300 border-l-4 hover:border-l-amber-300
              dark:border-l-amber-300 border-l-4 dark:hover:border-l-amber-300
            `}
          />
        ) : (
          <JavaMetricsSection
            metrics={metrics}
            leftBorderClass={`
              border-l-amber-300 border-l-4 hover:border-l-amber-300
              dark:border-l-amber-300 border-l-4 dark:hover:border-l-amber-300
            `}
          />
        )}

        <IssueList
          title={titles.dead_code.title}
          subtitle={titles.dead_code.subtitle}
          issues={deadCodeIssues}
          emptyText="Sin issues de código muerto."
          onIssueSelect={onIssueSelect}
          severitySelected={severitySelected}
          leftBorderClass={`
            border-l-emerald-300 border-l-4 hover:border-l-emerald-300
            dark:border-l-emerald-300 border-l-4 dark:hover:border-l-emerald-300
          `}
        />

        <IssueList
          title={titles.types.title}
          subtitle={titles.types.subtitle}
          issues={typesIssues}
          emptyText="Sin issues de tipado."
          onIssueSelect={onIssueSelect}
          severitySelected={severitySelected}
          leftBorderClass={`
            border-l-orange-400 border-l-4 hover:border-l-orange-400
            dark:border-l-orange-400 border-l-4 dark:hover:border-l-orange-400
          `}
        />
      </div>
    </section>
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
