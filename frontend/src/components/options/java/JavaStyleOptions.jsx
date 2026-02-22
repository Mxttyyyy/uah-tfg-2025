import { isPlainObject } from "../../../utils/uiUtils";
import { useEffect } from "react";
import { createDefaultJavaOptions } from "../../../utils/defaultOptions";

/**
 * Opciones de Checkstyle (style - Java).
 *
 * Backend espera (opcional):
 * - min_severity: "all" | "info" | "warning" | "error"
 *
 * Props:
 * - options: objeto con opciones actuales de style
 * - onChange: (nextValue) => void
 * - resetOptionsSignal
 * - setResetSignal
 */
export default function JavaStyleOptions({
  options,
  onChange,
  resetOptionsSignal,
  setResetSignal,
}) {
  // Normalizamos las opciones para garantizar siempre un objeto válido
  // y evitar valores null/undefined.
  const normalizedOptions = isPlainObject(options) ? options : {};

  // Convertimos las listas de reglas a CSV para mostrarlas en la UI.
  const minSeverity =
    typeof normalizedOptions.min_severity === "string"
      ? normalizedOptions.min_severity
      : "";

  // Obtenemos las opciones predeterminadas
  const defaultOptionsStyle = createDefaultJavaOptions().style;
  const defaultMinSeverity = defaultOptionsStyle.min_severity ?? "";

  /**
   * Actualiza parcialmente las opciones de estilo,
   * manteniendo el resto de la configuración sin cambios.
   */
  function updateStyleOptions(patch) {
    onChange({ ...normalizedOptions, ...patch });
  }

  // Si el usuario pulsa "Restablecer todas las opciones", reiniciamos el input local a su valor por defecto.
  // Importante: usamos esta señal (resetOptionsSignal) para no sobrescribir lo que el usuario está escribiendo.
  useEffect(() => {
    if (!resetOptionsSignal) return;

    updateStyleOptions({ min_severity: defaultMinSeverity });

    setResetSignal(false);
  }, [resetOptionsSignal]);

  return (
    <div className="space-y-4">
      <SelectInput
        id="sec-severity"
        label="severity_level"
        value={minSeverity}
        onChange={(selectedSeverity) =>
          updateStyleOptions({ min_severity: selectedSeverity })
        }
        options={SEVERITY_LEVELS}
        hint={"Severidad mínima a reportar por Checkstyle."}
      />

      <p className="text-xs text-gray-600 dark:text-neutral-300">
        Nota: si lo dejas vacío, se reportarán todas las severidades.
      </p>
    </div>
  );
}

// Niveles de severidad para Checkstyle.
const SEVERITY_LEVELS = [
  { value: "", label: "all" },
  { value: "info", label: "info" },
  { value: "warning", label: "warning" },
  { value: "error", label: "error" },
];

/* ------------------------------- Componentes auxiliares ------------------------------ */

/**
 * Select reutilizable con label y mensaje de ayuda opcional.
 */
function SelectInput({ id, label, value, onChange, options, hint }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-900 dark:text-neutral-100"
      >
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
        <p className="mt-1 text-xs text-gray-600 dark:text-neutral-300">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
