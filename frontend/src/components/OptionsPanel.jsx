import StyleOptions from "./options/StyleOptions";
import SecurityOptions from "./options/SecurityOptions";
import MetricsOptions from "./options/MetricsOptions";
import DeadCodeOptions from "./options/DeadCodeOptions";
import TypesOptions from "./options/TypesOptions";

import { useState } from "react";
import { isPlainObject } from "../utils/uiUtils";
import { createDefaultAnalyzeOptions } from "../utils/defaultOptions";
/**
 * Panel de opciones.
 *
 * Estructura del objeto "options":
 * - enabled: ["style","security","metrics","dead_code","types"] (si está vacío o falta => se ejecutan todos los análisis)
 * - timeout_seconds: int > 0
 * - style: { select, ignore, extend_select }
 * - security: { severity_level, confidence_level, skip, tests }
 * - metrics: { cc_min, cc_max }
 * - dead_code: { min_confidence, ignore_names, ignore_decorators }
 * - types: { ignore_missing_imports, python_version, strict, show_error_code_links, enable_error_codes, disable_error_codes }
 *
 * Props:
 * - options: objeto options actual
 * - onChange: (nextOptions) => void
 */
export default function OptionsPanel({ options, onChange }) {
  // Opciones normalizadas para garantizar una estructura válida
  const normalizedOptions = isPlainObject(options) ? options : {};

  const enabled = Array.isArray(normalizedOptions.enabled)
    ? normalizedOptions.enabled
    : [];
  const timeoutSeconds =
    typeof normalizedOptions.timeout_seconds === "number"
      ? normalizedOptions.timeout_seconds
      : 10;

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
    onChange(createDefaultAnalyzeOptions());
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
   * Añade o elimina la herramienta del conjunto de análisis habilitados,
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
        "max-h-[clamp(650px,70vh,890px)]",
        // Para que el scroll interno funcione bien
        "w-full flex flex-col min-h-0",
        // Evita doble scrollbar
        "overflow-hidden",
      ].join(" ")}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900">Opciones</h2>
          <p className="mt-2 text-sm text-gray-600">
            Selecciona qué análisis ejecutar. Si no seleccionas ninguno,
            se ejecutarán todos.
          </p>
        </div>

        {/* Botón de reset options para resoluciones menores */}
        <button
          type="button"
          onClick={resetOptionsToDefault}
          className={`
            md:inline-flex 2xl:hidden
            rounded-lg border border-gray-300 bg-gray-50 px-3 py-2
            text-sm font-semibold text-gray-700
            hover:bg-gray-100 hover:text-gray-900 transition
            whitespace-nowrap cursor-pointer
          `}
          title="Restaura selección, timeout y opciones avanzadas a valores por defecto"
        >
          Restablecer
        </button>
      </div>

      {/* Selección de análisis (enabled) */}
      <div className="space-y-2 grid grid-cols-2">
        <CheckboxRow
          id="opt-style"
          label="Estilo y buenas prácticas (Ruff)"
          checked={enabled.includes("style")}
          onChange={() => toggleEnabled("style")}
        />
        <CheckboxRow
          id="opt-security"
          label="Seguridad básica (Bandit)"
          checked={enabled.includes("security")}
          onChange={() => toggleEnabled("security")}
        />
        <CheckboxRow
          id="opt-metrics"
          label="Métricas (Radon)"
          checked={enabled.includes("metrics")}
          onChange={() => toggleEnabled("metrics")}
        />
        <CheckboxRow
          id="opt-dead"
          label="Código muerto (Vulture)"
          checked={enabled.includes("dead_code")}
          onChange={() => toggleEnabled("dead_code")}
        />
        <CheckboxRow
          id="opt-types"
          label="Tipado (Mypy)"
          checked={enabled.includes("types")}
          onChange={() => toggleEnabled("types")}
        />
      </div>

      {/* Botón de reset options para resoluciones grandes */}
      <button
        type="button"
        onClick={resetOptionsToDefault}
        className={`
          hidden 2xl:block
          rounded-lg border border-gray-300 bg-gray-50
          px-3 py-1.5 text-sm font-semibold text-gray-700
          hover:bg-gray-100 hover:text-gray-900 active:bg-blue-100
          transition cursor-pointer mt-4 mb-1 w-full
        `}
        title="Restaura selección, timeout y opciones avanzadas a valores por defecto"
      >
        Restablecer todas las opciones
      </button>

      {/* Timeout */}
      <div
        className={`
          mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3
          transition hover:bg-blue-50/70 hover:border-blue-200
        `}
      >
        <label
          htmlFor="opt-timeout"
          className="block text-sm font-medium text-gray-900"
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
              `}
            />
            <span className="text-sm text-gray-500">s</span>
          </div>

          <p className="text-sm text-gray-600">
            Tiempo máximo de ejecución por herramienta.
          </p>
        </div>
      </div>

      {/* Separador */}
      <div className="my-3 flex items-center gap-3" aria-hidden="true">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Opciones avanzadas
        </span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      {/* Opciones por herramienta */}
      <div className="flex-1 min-h-0 overflow-auto pr-1 space-y-3 scrollbar-modern">
        
        {/* Escondemos el texto en resoluciones menores */}
        <p className="hidden 2xl:block text-sm text-gray-600">
          Ajustes específicos de cada herramienta (Ruff, Bandit, Radon, Vulture,
          Mypy).
        </p>

        <details
          className={`
            rounded-lg border border-gray-200 bg-gray-50/40 transition hover:border-blue-200
            hover:bg-blue-50/70 border-l-cyan-300 border-l-4 hover:border-l-cyan-300
          `}
        >
          <summary
            className={`
              flex w-full cursor-pointer select-none items-center justify-between
              px-3 py-2 text-sm font-semibold text-gray-900 hover:text-blue-700
            `}
          >
            <span>Ruff (Estilo)</span>
            <span className="text-gray-500" aria-hidden="true">
              ▾
            </span>
          </summary>
          <div className="px-3 pb-3 pt-2">
            <StyleOptions
              options={style}
              onChange={(v) => updateModuleOptions("style", v)}
              resetOptionsSignal={resetOptionsSignal}
              setResetSignal={setResetOptionsSignal}
            />
          </div>
        </details>

        <details
          className={`
            rounded-lg border border-gray-200 bg-gray-50/40 transition hover:border-blue-200
            hover:bg-blue-50/70 border-l-purple-300 border-l-4 hover:border-l-purple-300
          `}
        >
          <summary
            className={`
              flex w-full cursor-pointer select-none items-center justify-between
              px-3 py-2 text-sm font-semibold text-gray-900 hover:text-blue-700
            `}
          >
            <span>Bandit (Seguridad)</span>
            <span className="text-gray-500" aria-hidden="true">
              ▾
            </span>
          </summary>
          <div className="px-3 pb-3 pt-2">
            <SecurityOptions
              options={security}
              onChange={(v) => updateModuleOptions("security", v)}
              resetOptionsSignal={resetOptionsSignal}
              setResetSignal={setResetOptionsSignal}
            />
          </div>
        </details>

        <details
          className={`
            rounded-lg border border-gray-200 bg-gray-50/40 transition hover:border-blue-200
            hover:bg-blue-50/70 border-l-amber-300 border-l-4 hover:border-l-amber-300
          `}
        >
          <summary
            className={`
              flex w-full cursor-pointer select-none items-center justify-between
              px-3 py-2 text-sm font-semibold text-gray-900 hover:text-blue-700
            `}
          >
            <span>Radon (Métricas)</span>
            <span className="text-gray-500" aria-hidden="true">
              ▾
            </span>
          </summary>
          <div className="px-3 pb-3 pt-2">
            <MetricsOptions
              options={metrics}
              onChange={(v) => updateModuleOptions("metrics", v)}
            />
          </div>
        </details>

        <details
          className={`
            rounded-lg border border-gray-200 bg-gray-50/40 transition hover:border-blue-200
            hover:bg-blue-50/70 border-l-emerald-300 border-l-4 hover:border-l-emerald-300
            `}
        >
          <summary
            className={`
              flex w-full cursor-pointer select-none items-center justify-between
              px-3 py-2 text-sm font-semibold text-gray-900 hover:text-blue-700
            `}
          >
            <span>Vulture (Código Muerto)</span>
            <span className="text-gray-500" aria-hidden="true">
              ▾
            </span>
          </summary>
          <div className="px-3 pb-3 pt-2">
            <DeadCodeOptions
              options={deadCode}
              onChange={(v) => updateModuleOptions("dead_code", v)}
              resetOptionsSignal={resetOptionsSignal}
              setResetSignal={setResetOptionsSignal}
            />
          </div>
        </details>

        <details
          className={`
            rounded-lg border border-gray-200 bg-gray-50/40 transition hover:border-blue-200 
            hover:bg-blue-50/70 border-l-orange-400 border-l-4 hover:border-l-orange-400
            `}
        >
          <summary
            className={`
              flex w-full cursor-pointer select-none items-center justify-between
              px-3 py-2 text-sm font-semibold text-gray-900 hover:text-blue-700
            `}
          >
            <span>Mypy (Tipos)</span>
            <span className="text-gray-500" aria-hidden="true">
              ▾
            </span>
          </summary>
          <div className="px-3 pb-3 pt-2">
            <TypesOptions
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

/* ------------------------------- Componentes auxiliares ------------------------------- */

/**
 * Fila reutilizable con checkbox y su label asociado.
 */
function CheckboxRow({ id, label, checked, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <input
        id={id}
        name={id}
        type="checkbox"
        checked={!!checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-200"
      />
      <label htmlFor={id} className="text-sm font-medium text-gray-900">
        {label}
      </label>
    </div>
  );
}
