import { isPlainObject } from "../../../utils/uiUtils";

/**
 * Opciones de Radon (metrics).
 *
 * Backend espera (todas opcionales):
 * - cc_min: "A"|"B"|"C"|"D"|"E"|"F"
 * - cc_max: "A"|"B"|"C"|"D"|"E"|"F"
 *
 * En la UI usamos <select> con el valor "(por defecto)".
 *
 * Props:
 * - value: objeto con opciones actuales de metrics
 * - onChange: (nextValue) => void
 */
export default function PythonMetricsOptions({ options, onChange }) {

  // Normalizamos las opciones para garantizar siempre un objeto válido
  // y evitar valores null/undefined en la UI.
  const normalizedOptions = isPlainObject(options) ? options : {};

  // Validamos las opciones y aplicamos valores por defecto.
  const ccMin =
    typeof normalizedOptions.cc_min === "string"
      ? normalizedOptions.cc_min
      : "";
      
  const ccMax =
    typeof normalizedOptions.cc_max === "string"
      ? normalizedOptions.cc_max
      : "";

  /**
   * Actualiza parcialmente las opciones de métricas,
   * manteniendo el resto de la configuración sin modificar.
   */
  function updateMetricsOptions(patch) {
    onChange({ ...normalizedOptions, ...patch });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SelectInput
          id="m-cc-min"
          label="cc_min"
          value={ccMin}
          onChange={(value) => updateMetricsOptions({ cc_min: value || "" })}
          options={CC_LEVELS}
          hint="Complejidad ciclomática: rango mínimo."
        />

        <SelectInput
          id="m-cc-max"
          label="cc_max"
          value={ccMax}
          onChange={(value) => updateMetricsOptions({ cc_max: value || "" })}
          options={CC_LEVELS}
          hint="Complejidad ciclomática: rango máximo."
        />
      </div>

      <p className="text-xs text-gray-600 dark:text-neutral-300">
        <span className="font-mono dark:text-neutral-200">(por defecto)</span>{" "}
        usa los valores predeterminados.
      </p>
    </div>
  );
}

// Rangos de valores soportados por Radon para la métrica CC.
// La opción vacía indica el uso del valor predeterminado.
const CC_LEVELS = [
  { value: "", label: "(por defecto)" },
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "D", label: "D" },
  { value: "E", label: "E" },
  { value: "F", label: "F" },
];

/* ------------------------------- Componentes auxiliares ------------------------------ */

/**
 * Select reutilizable con label y texto de ayuda opcional.
 */
function SelectInput({ id, label, value, onChange, options, hint }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-900 dark:text-neutral-100">
        {label}
      </label>

      <select
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          mt-2 w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900
          outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100
          dark:border-neutral-700 dark:bg-neutral-950/40 dark:text-neutral-100
          dark:focus:border-sky-500 dark:focus:ring-sky-900/40
        `}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="dark:bg-neutral-900">
            {o.label}
          </option>
        ))}
      </select>

      {hint ? (
        <p className="mt-1 text-xs text-gray-600 dark:text-neutral-300">{hint}</p>
      ) : null}
    </div>
  );
}