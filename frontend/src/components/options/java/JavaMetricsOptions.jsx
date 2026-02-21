import {
  isPlainObject,
  toInt,
  normalizeIntInRange,
} from "../../../utils/uiUtils";

/**
 * Opciones de Lizard (metrics).
 *
 * Backend espera (todas opcionales):
 * - cc_min:  number (complejidad ciclomática mínima)
 * - nloc_min: number (número mínimo de líneas de código)
 * - args_min: number (número mínimo de argumentos por método)
 *
 * En la UI usamos inputs numéricos.
 *
 * Props:
 * - value: objeto con opciones actuales de metrics
 * - onChange: (nextValue) => void
 */
export default function JavaMetricsOptions({ options, onChange }) {
  // Normalizamos las opciones para garantizar siempre un objeto válido
  // y evitar valores null/undefined en la UI.
  const normalizedOptions = isPlainObject(options) ? options : {};

  // Validamos las opciones y aplicamos valores por defecto.
  const ccMin = toInt(normalizedOptions.cc_min);
  const nlocMin = toInt(normalizedOptions.nloc_min);
  const argsMin = toInt(normalizedOptions.args_min);

  /**
   * Actualiza parcialmente las opciones de métricas,
   * manteniendo el resto de la configuración sin modificar.
   */
  function updateMetricsOptions(patch) {
    onChange({ ...normalizedOptions, ...patch });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <NumberInput
          id="j-m-cc-min"
          label="cc_min"
          value={ccMin}
          min={1}
          max={1000}
          onChange={(value) =>
            updateMetricsOptions({
              cc_min: normalizeIntInRange(value, 1, 1000),
            })
          }
          hint="Complejidad ciclomática mínima a reportar."
        />

        <NumberInput
          id="j-m-nloc-min"
          label="nloc_min"
          value={nlocMin}
          min={1}
          max={100000}
          onChange={(value) =>
            updateMetricsOptions({
              nloc_min: normalizeIntInRange(value, 1, 100000),
            })
          }
          hint="Número mínimo de líneas de código."
        />

        <NumberInput
          id="j-m-args-min"
          label="args_min"
          value={argsMin}
          min={1}
          max={100}
          onChange={(value) =>
            updateMetricsOptions({
              args_min: normalizeIntInRange(value, 1, 100),
            })
          }
          hint="Número mínimo de argumentos por método."
        />
      </div>

      <p className="text-xs text-gray-600 dark:text-neutral-300">
        Si se deja vacío, se utilizan los valores predeterminados del backend.
      </p>
    </div>
  );
}

/* ------------------------------- Componentes auxiliares ------------------------------ */

/**
 * Input numérico reutilizable con label y texto de ayuda opcional.
 */
function NumberInput({ id, label, value, min, max, onChange, hint }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-900 dark:text-neutral-100"
      >
        {label}
      </label>

      <input
        id={id}
        name={id}
        type="number"
        min={min}
        max={max}
        value={typeof value === "number" ? value : min}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`
          mt-2 w-32 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900
          outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100
          dark:border-neutral-700 dark:bg-neutral-950/40 dark:text-neutral-100 dark:placeholder:text-neutral-500
          dark:focus:border-sky-500 dark:focus:ring-sky-900/40 dark:[color-scheme:dark]
        `}
      />

      {hint ? (
        <p className="mt-1 text-xs text-gray-600 dark:text-neutral-300">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
