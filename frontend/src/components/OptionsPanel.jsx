import StyleOptions from "./options/StyleOptions";
import SecurityOptions from "./options/SecurityOptions";
import MetricsOptions from "./options/MetricsOptions";
import DeadCodeOptions from "./options/DeadCodeOptions";
import TypesOptions from "./options/TypesOptions";

import { isPlainObject } from "../../utils/formatters";

/**
 * Panel de opciones.
 *
 * Estructura del objeto "options":
 * - enabled: ["style","security","metrics","dead_code","types"] (si está vacío o falta => se ejecutan todos los análisis)
 * - timeout_seconds: int > 0
 * - style: { select, ignore, extend_select }
 * - security: { severity_level, confidence_level, skip, tests }
 * - metrics: { cc_min, cc_max, mi_min, mi_max }
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
    let nextEnabled = enabled.slice(); // Creamos copia de enabled

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
    <section className="rounded-xl border border-gray-200 bg-white p-4 pb-6 shadow-sm w-150 hover:shadow-md hover:-translate-y-[2px] transition">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Opciones</h2>
        <p className="mt-2 text-sm text-gray-600">
          Selecciona qué análisis ejecutar. Si no seleccionas ninguno, se
          ejecutarán todos.
        </p>
      </div>

      {/* Selección de análisis (enabled) */}
      <div className="space-y-2">
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

      {/* Timeout */}
      <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-3 hover:bg-blue-50/70 hover:border-blue-200">
        <label
          htmlFor="opt-timeout"
          className="block text-sm font-medium text-gray-900"
        >
          Timeout (segundos)
        </label>

        <div className="mt-2 flex items-center gap-3">
          <input
            id="opt-timeout"
            name="timeout_seconds"
            type="number"
            min={1}
            step={1}
            value={timeoutSeconds}
            onChange={(e) => setTimeoutSeconds(e.target.value)}
            className="w-20  rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
          />
          <p className="text-sm text-gray-600">
            Tiempo máximo de ejecución por herramienta.
          </p>
        </div>
      </div>

      <div className="my-6 mb-1 flex items-center gap-3" aria-hidden="true">
        <div className="h-px flex-1 bg-gray-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">
          Opciones avanzadas
        </span>
        <div className="h-px flex-1 bg-gray-400" />
      </div>

      {/* Opciones por herramienta */}
      <div className="mt-5 space-y-3 max-h-[55vh] overflow-auto scrollbar-modern pr-1">
        <p className="text-sm mb-5 text-gray-600">
          Ajustes específicos de cada herramienta (Ruff, Bandit, Radon, Vulture,
          Mypy).
        </p>
        <details className="rounded-lg bg-gray-50 border border-gray-200 transition hover:border-blue-200 hover:bg-blue-50/70">
          <summary className="cursor-pointer list-item p-3 flex w-full select-none text-sm font-semibold text-gray-900 hover:text-blue-700">
            Ruff (Estilo)
          </summary>
          <div className="mt-4 ml-3 mr-3 mb-3">
            <StyleOptions
              options={style}
              onChange={(v) => updateModuleOptions("style", v)}
            />
          </div>
        </details>

        <details className="rounded-lg bg-gray-50 border border-gray-200 transition hover:border-blue-200 hover:bg-blue-50/70">
          <summary className="cursor-pointer list-item p-3 flex w-full select-none text-sm font-semibold text-gray-900 hover:text-blue-700">
            Bandit (Seguridad)
          </summary>
          <div className="mt-4 ml-3 mr-3 mb-3">
            <SecurityOptions
              options={security}
              onChange={(v) => updateModuleOptions("security", v)}
            />
          </div>
        </details>

        <details className="rounded-lg bg-gray-50 border border-gray-200 transition hover:border-blue-200 hover:bg-blue-50/70">
          <summary className="cursor-pointer list-item p-3 flex w-full select-none text-sm font-semibold text-gray-900 hover:text-blue-700">
            Radon (Métricas)
          </summary>
          <div className="mt-4 ml-3 mr-3 mb-3">
            <MetricsOptions
              options={metrics}
              onChange={(v) => updateModuleOptions("metrics", v)}
            />
          </div>
        </details>

        <details className="rounded-lg bg-gray-50 border border-gray-200 transition hover:border-blue-200 hover:bg-blue-50/70">
          <summary className="cursor-pointer list-item p-3 flex w-full select-none text-sm font-semibold text-gray-900 hover:text-blue-700">
            Vulture (Código Muerto)
          </summary>
          <div className="mt-4 ml-3 mr-3 mb-3">
            <DeadCodeOptions
              options={deadCode}
              onChange={(v) => updateModuleOptions("dead_code", v)}
            />
          </div>
        </details>

        <details className="rounded-lg bg-gray-50 border border-gray-200 transition hover:border-blue-200 hover:bg-blue-50/70">
          <summary className="cursor-pointer list-item p-3 flex w-full select-none text-sm font-semibold text-gray-900 hover:text-blue-700">
            Mypy (Tipos)
          </summary>
          <div className="mt-4 ml-3 mr-3 mb-3">
            <TypesOptions
              options={types}
              onChange={(v) => updateModuleOptions("types", v)}
            />
          </div>
        </details>
      </div>
    </section>
  );
}

/* ------------------------------- Componente auxiliar ------------------------------- */

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
      <label
        htmlFor={id}
        className=" flex items-center gap-2 text-sm font-medium text-gray-900"
      >
        {label}
      </label>
    </div>
  );
}
