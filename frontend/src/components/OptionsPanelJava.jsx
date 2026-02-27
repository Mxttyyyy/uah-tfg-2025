import JavaStyleOptions from "./options/java/JavaStyleOptions";
import JavaSecurityOptions from "./options/java/JavaSecurityOptions";
import JavaMetricsOptions from "./options/java/JavaMetricsOptions";
import JavaDeadCodeOptions from "./options/java/JavaDeadCodeOptions";
import JavaTypesOptions from "./options/java/JavaTypesOptions";

import { isPlainObject } from "../utils/uiUtils";
import { useState } from "react";
import { createDefaultJavaOptions } from "../utils/defaultOptions";

/**
 * Panel de opciones para análisis Java.
 *
 * Herramientas:
 * - style: Checkstyle
 * - security: Semgrep
 * - metrics: Lizard
 * - dead_code: PMD
 * - types: Javac
 *
 * Props:
 * - options
 * - onChange
 */
export default function OptionsPanelJava({ options, onChange }) {

  // Opciones normalizadas para garantizar una estructura válida
  const normalizedOptions = isPlainObject(options) ? options : {};

  const enabled = Array.isArray(normalizedOptions.enabled)
    ? normalizedOptions.enabled
    : [];

  const timeoutSeconds =
    typeof normalizedOptions.timeout_seconds === "number"
      ? normalizedOptions.timeout_seconds
      : 25;

  // Sub-objetos por módulo (siempre deben ser dicts para el backend)
  const style = isPlainObject(normalizedOptions.style)
    ? normalizedOptions.style
    : {};
  const security = isPlainObject(normalizedOptions.security)
    ? normalizedOptions.security
    : {};
  const metrics = isPlainObject(normalizedOptions.metrics)
    ? normalizedOptions.metrics
    : {};
  const deadCode = isPlainObject(normalizedOptions.dead_code)
    ? normalizedOptions.dead_code
    : {};
  const types = isPlainObject(normalizedOptions.types)
    ? normalizedOptions.types
    : {};

  const ANALYSES_ORDER = ["style", "security", "metrics", "dead_code", "types"];

  // Estado para controlar el botón de reset options
  const [resetOptionsSignal, setResetOptionsSignal] = useState(false);

  /**
   * Actualiza opciones de primer nivel del panel (p. ej. enabled, timeout).
   *
   * Aplica un parche parcial sobre las opciones actuales manteniendo
   * el resto de valores sin modificar.
   */
  function updateGlobalOptions(patch) {
    onChange({ ...normalizedOptions, ...patch });
  }

  /**
   * Resetea las opciones a las predeterminadas.
   */
  function resetOptionsToDefault() {
    onChange(createDefaultJavaOptions());
    setResetOptionsSignal(true);
  }

  /**
   * Actualiza las opciones de una herramienta concreta (style, security, etc.).
   *
   * Garantiza que el valor enviado tenga siempre estructura de objeto,
   * evitando valores inválidos en la configuración global.
   */
  function updateModuleOptions(moduleName, nextModuleOptions) {
    const moduleObj = isPlainObject(nextModuleOptions) ? nextModuleOptions : {};
    onChange({ ...normalizedOptions, [moduleName]: moduleObj });
  }

  /**
   * Activa o desactiva una herramienta de análisis.
   *
   * Annade o elimina la herramienta del conjunto de análisis habilitados,
   * manteniendo un orden estable para preservar la coherencia visual.
   */
  function toggleEnabled(moduleName) {
    let nextEnabled = enabled.slice();

    if (nextEnabled.includes(moduleName)) {
      nextEnabled = nextEnabled.filter((name) => name !== moduleName);
    } else {
      nextEnabled.push(moduleName);
    }

    // Orden estable para que no quede raro visualmente
    const ordered = ANALYSES_ORDER.filter((name) => nextEnabled.includes(name));
    updateGlobalOptions({ enabled: ordered });
  }

  /**
   * Establece el tiempo máximo de ejecución a partir del valor introducido por el usuario.
   */
  function setTimeoutSeconds(rawValue) {
    const parsedValue = Number(rawValue);
    const nextTimeout =
      Number.isFinite(parsedValue) && parsedValue > 0
        ? Math.floor(parsedValue)
        : 10;

    updateGlobalOptions({ timeout_seconds: nextTimeout });
  }

  return (
    <section
      className={[
        "rounded-xl border border-gray-300 bg-white p-4 shadow-sm",
        "transition hover:shadow-lg hover:-translate-y-[1px]",
        // Altura estable
        "max-h-[clamp(630px,70vh,890px)]",
        // Para que el scroll interno funcione bien
        "w-full flex flex-col min-h-0",
        // Evita doble scrollbar
        "overflow-hidden",
        // Dark
        "dark:border-neutral-700 dark:bg-neutral-900 dark:shadow-none",
      ].join(" ")}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-neutral-100">
            Opciones (Java)
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-neutral-300">
            Selecciona qué análisis ejecutar. Si no seleccionas ninguno, se
            ejecutarán todos.
          </p>
        </div>

        {/* Botón de reset options para resoluciones menores */}
        <button
          type="button"
          onClick={resetOptionsToDefault}
          className={`
            md:inline-flex 3xl:hidden
            rounded-lg border border-gray-300 bg-gray-50 px-3 py-2
            text-sm font-semibold text-gray-700
            hover:bg-gray-100 hover:text-gray-900 transition
            whitespace-nowrap cursor-pointer
            dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200
            dark:hover:bg-neutral-700 dark:hover:text-neutral-100
          `}
          title="Restaura selección, timeout y opciones avanzadas a valores por defecto"
        >
          Restablecer
        </button>
      </div>

      {/* Selección de análisis (enabled) */}
      <div className="space-y-2 grid grid-cols-2">
        <CheckboxRow
          id="java-style"
          label="Estilo y buenas prácticas (Checkstyle)"
          checked={enabled.includes("style")}
          onChange={() => toggleEnabled("style")}
        />
        <CheckboxRow
          id="java-security"
          label="Seguridad básica (Semgrep)"
          checked={enabled.includes("security")}
          onChange={() => toggleEnabled("security")}
        />
        <CheckboxRow
          id="java-metrics"
          label="Métricas (Lizard)"
          checked={enabled.includes("metrics")}
          onChange={() => toggleEnabled("metrics")}
        />
        <CheckboxRow
          id="java-dead"
          label="Código muerto (PMD)"
          checked={enabled.includes("dead_code")}
          onChange={() => toggleEnabled("dead_code")}
        />
        <CheckboxRow
          id="java-types"
          label="Tipado (Javac)"
          checked={enabled.includes("types")}
          onChange={() => toggleEnabled("types")}
        />
      </div>

      {/* Botón de reset options para resoluciones grandes */}
      <button
        type="button"
        onClick={resetOptionsToDefault}
        className={`
          hidden 3xl:block
          rounded-lg border border-gray-300 bg-gray-50
          px-3 py-1.5 text-sm font-semibold text-gray-700
          hover:bg-gray-100 hover:text-gray-900 active:bg-blue-100
          transition cursor-pointer mt-4 mb-1 w-full
          dark:border-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-200
          dark:hover:bg-neutral-800 dark:hover:text-neutral-100 dark:active:bg-sky-900/30
        `}
        title="Restaura selección, timeout y opciones avanzadas a valores por defecto"
      >
        Restablecer todas las opciones
      </button>

      {/* Timeout */}
      <div
        className={`
          mt-4 rounded-lg border border-gray-200 bg-gray-100/50 p-3
          transition hover:bg-blue-50/70 hover:border-blue-200
          dark:border-neutral-700 dark:bg-neutral-950/40
          dark:hover:bg-neutral-800/50 dark:hover:border-sky-900/60
        `}
      >
        <label
          htmlFor="java-timeout"
          className="block text-sm font-medium text-gray-900 dark:text-neutral-100"
        >
          Timeout (segundos)
        </label>

        <div className="mt-2 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              id="opt-timeout"
              name="timeout_seconds"
              type="number"
              min={1}
              step={1}
              value={timeoutSeconds}
              onChange={(e) => setTimeoutSeconds(e.target.value)}
              className={`
                w-20 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900
                outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100
                dark:placeholder:text-neutral-500 dark:[color-scheme:dark]
                dark:focus:border-sky-400 dark:focus:ring-sky-900/40
              `}
            />
            <span className="text-sm text-gray-500 dark:text-neutral-400">
              s
            </span>
          </div>

          <p className="text-sm text-gray-600 dark:text-neutral-300">
            Tiempo máximo de ejecución por herramienta.
          </p>
        </div>
      </div>

      {/* Separador */}
      <div className="my-3 flex items-center gap-3" aria-hidden="true">
        <div className="h-px flex-1 bg-gray-200 dark:bg-neutral-700" />
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400">
          Opciones avanzadas
        </span>
        <div className="h-px flex-1 bg-gray-200 dark:bg-neutral-700" />
      </div>

      {/* Opciones específicas por herramienta */}
      <div className="flex-1 min-h-0 overflow-auto pr-1 space-y-3 scrollbar-modern">

        {/* Escondemos el texto en resoluciones menores */}
        <p className="hidden 2xl:block text-sm text-gray-600 dark:text-neutral-300">
          Ajustes específicos de cada herramienta (Checkstyle, Semgrep, Lizard, PMD,
          Javac).
        </p>
        
        {/* Checkstyle (Estilo) */}
        <details 
          className={`
            rounded-lg border border-gray-200 bg-gray-100/50 transition hover:border-blue-200
            hover:bg-blue-50/70 border-l-cyan-300 border-l-4 hover:border-l-cyan-300
            dark:border-l-cyan-300 dark:border-neutral-700 dark:bg-neutral-950/50
            dark:hover:bg-neutral-800/50 dark:hover:border-l-cyan-300 dark:hover:border-sky-900/60
          `}
        >
          <summary 
            className={`
              flex w-full cursor-pointer select-none items-center justify-between
              px-3 py-2 text-sm font-semibold text-gray-900 hover:text-blue-700
              dark:text-neutral-100 dark:hover:text-sky-400
            `}
          >
            <span>Checkstyle (Estilo)</span>
            <span
              className="text-gray-500 dark:text-neutral-400"
              aria-hidden="true"
            >
              ▾
            </span>
          </summary>
          <div className="px-3 pb-3 pt-2">
            <JavaStyleOptions
              options={style}
              onChange={(v) => updateModuleOptions("style", v)}
              resetOptionsSignal={resetOptionsSignal}
              setResetSignal={setResetOptionsSignal}
            />
          </div>
        </details>

        {/* Semgrep (Seguridad) */}
        <details 
          className={`
            rounded-lg border border-gray-200 bg-gray-100/50 transition hover:border-blue-200
            hover:bg-blue-50/70 border-l-purple-300 border-l-4 hover:border-l-purple-300
            dark:border-l-purple-300 dark:border-neutral-700 dark:bg-neutral-950/50
            dark:hover:bg-neutral-800/50 dark:hover:border-l-purple-300 dark:hover:border-sky-900/60
          `}
        >
          <summary 
            className={`
              flex w-full cursor-pointer select-none items-center justify-between
              px-3 py-2 text-sm font-semibold text-gray-900 hover:text-blue-700
              dark:text-neutral-100 dark:hover:text-sky-400
            `}
          >
            <span>Semgrep (Seguridad)</span>
            <span
              className="text-gray-500 dark:text-neutral-400"
              aria-hidden="true"
            >
              ▾
            </span>
          </summary>
          <div className="px-3 pb-3 pt-2">
            <JavaSecurityOptions
              options={security}
              onChange={(v) => updateModuleOptions("security", v)}
              resetOptionsSignal={resetOptionsSignal}
              setResetSignal={setResetOptionsSignal}
            />
          </div>
        </details>

        {/* Lizard (Métricas) */}
        <details 
          className={`
            rounded-lg border border-gray-200 bg-gray-100/50 transition hover:border-blue-200
            hover:bg-blue-50/70 border-l-amber-300 border-l-4 hover:border-l-amber-300
            dark:border-l-amber-300 dark:border-neutral-700 dark:bg-neutral-950/50
            dark:hover:bg-neutral-800/50 dark:hover:border-l-amber-300 dark:hover:border-sky-900/60
          `}
        >
          <summary 
            className={`
              flex w-full cursor-pointer select-none items-center justify-between
              px-3 py-2 text-sm font-semibold text-gray-900 hover:text-blue-700
              dark:text-neutral-100 dark:hover:text-sky-400
            `}
          >
            <span>Lizard (Métricas)</span>
            <span
              className="text-gray-500 dark:text-neutral-400"
              aria-hidden="true"
            >
              ▾
            </span>
          </summary>
          <div className="px-3 pb-3 pt-2">
            <JavaMetricsOptions
              options={metrics}
              onChange={(v) => updateModuleOptions("metrics", v)}
            />
          </div>
        </details>

        {/* PMD (Código Muerto) */}
        <details 
          className={`
            rounded-lg border border-gray-200 bg-gray-100/50 transition hover:border-blue-200
            hover:bg-blue-50/70 border-l-emerald-300 border-l-4 hover:border-l-emerald-300
            dark:border-l-emerald-300 dark:border-neutral-700 dark:bg-neutral-950/50
            dark:hover:bg-neutral-800/50 dark:hover:border-l-emerald-300 dark:hover:border-sky-900/60
          `}
        >
          <summary 
            className={`
              flex w-full cursor-pointer select-none items-center justify-between
              px-3 py-2 text-sm font-semibold text-gray-900 hover:text-blue-700
              dark:text-neutral-100 dark:hover:text-sky-400
            `}
          >
            <span>PMD (Código Muerto)</span>
            <span
              className="text-gray-500 dark:text-neutral-400"
              aria-hidden="true"
            >
              ▾
            </span>
          </summary>
          <div className="px-3 pb-3 pt-2">
            <JavaDeadCodeOptions
              options={deadCode}
              onChange={(v) => updateModuleOptions("dead_code", v)}
              resetOptionsSignal={resetOptionsSignal}
              setResetSignal={setResetOptionsSignal}
            />
          </div>
        </details>

        {/* Javac (Tipos) */}
        <details 
          className={`
            rounded-lg border border-gray-200 bg-gray-100/50 transition hover:border-blue-200
            hover:bg-blue-50/70 border-l-orange-400 border-l-4 hover:border-l-orange-400
            dark:border-l-orange-400 dark:border-neutral-700 dark:bg-neutral-950/50
            dark:hover:bg-neutral-800/50 dark:hover:border-l-orange-400 dark:hover:border-sky-900/60
          `}
        >
          <summary 
            className={`
              flex w-full cursor-pointer select-none items-center justify-between
              px-3 py-2 text-sm font-semibold text-gray-900 hover:text-blue-700
              dark:text-neutral-100 dark:hover:text-sky-400
            `}
          >
            <span>Javac (Tipos)</span>
            <span
              className="text-gray-500 dark:text-neutral-400"
              aria-hidden="true"
            >
              ▾
            </span>
          </summary>
          <div className="px-3 pb-3 pt-2">
            <JavaTypesOptions
              options={types}
              onChange={(v) => updateModuleOptions("types", v)}
              resetOptionsSignal={resetOptionsSignal}
              setResetSignal={setResetOptionsSignal}
            />
          </div>
        </details>
      </div>
    </section>
  );
}

/* ----------------------------- Componentes auxiliares ----------------------------- */

function CheckboxRow({ id, label, checked, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <input
        id={id}
        name={id}
        type="checkbox"
        checked={!!checked}
        onChange={onChange}
        className={`
          h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-200 dark:[color-scheme:dark]
          dark:border-neutral-600 dark:bg-neutral-900 dark:text-sky-500 dark:focus:ring-sky-900/40
        `}
      />
      <label htmlFor={id} className="text-sm font-medium text-gray-900 dark:text-neutral-100">
        {label}
      </label>
    </div>
  );
}
