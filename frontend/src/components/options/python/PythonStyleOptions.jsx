import { isPlainObject, listToCsv, csvToList } from "../../../utils/uiUtils";
import { useState, useEffect } from "react";
import { createDefaultAnalyzeOptions } from "../../../utils/defaultOptions";

/**
 * Opciones de Ruff (style).
 *
 * Backend espera (todas opcionales):
 * - select:        string[]
 * - ignore:        string[]
 * - extend_select: string[]
 *
 * En la UI las mostramos como texto CSV (ej: "F401, E501") porque es más simple.
 *
 * Props:
 * - options: objeto con opciones actuales de style
 * - onChange: (nextValue) => void
 */
export default function StyleOptions({
  options,
  onChange,
  resetOptionsSignal,
  setResetSignal,
}) {

  // Normalizamos las opciones para garantizar siempre un objeto válido
  // y evitar valores null/undefined.
  const normalizedOptions = isPlainObject(options) ? options : {};

  // Convertimos las listas de reglas a CSV para mostrarlas en la UI.
  const [selectCsv, setSelectCsv] = useState(listToCsv(normalizedOptions.select));
  const [ignoreCsv, setIgnoreCsv] = useState(listToCsv(normalizedOptions.ignore));
  const [extendSelectCsv, setExtendSelectCsv] = useState(listToCsv(normalizedOptions.extend_select));

  // Obtenemos las opciones predeterminadas
  const defaultOptionsStyle = createDefaultAnalyzeOptions().style;
  const defaultSelect = listToCsv(defaultOptionsStyle.select);
  const defaultIgnore = listToCsv(defaultOptionsStyle.ignore);
  const defaultExtendSelect = listToCsv(defaultOptionsStyle.extend_select);

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
    setSelectCsv(defaultSelect);
    setIgnoreCsv(defaultIgnore);
    setExtendSelectCsv(defaultExtendSelect);

    setResetSignal(false);
  }, [resetOptionsSignal]);

  return (
    <div className="space-y-4">
      <TextInput
        id="style-select"
        label="select"
        placeholder="Ej: F401, E501"
        value={selectCsv}
        onChange={(text) => {
          setSelectCsv(text);
          updateStyleOptions({ select: csvToList(text) });
        }}
        hint="Si lo rellenas, Ruff ejecuta solo estas reglas."
      />

      <TextInput
        id="style-ignore"
        label="ignore"
        placeholder="Ej: E501"
        value={ignoreCsv}
        onChange={(text) => {
          setIgnoreCsv(text);
          updateStyleOptions({ ignore: csvToList(text) });
        }}
        hint="Reglas a ignorar."
      />

      <TextInput
        id="style-extend-select"
        label="extend_select"
        placeholder="Ej: I001, UP007"
        value={extendSelectCsv}
        onChange={(text) => {
          setExtendSelectCsv(text);
          updateStyleOptions({ extend_select: csvToList(text) });
        }}
        hint="Añade reglas extra además de las predeterminadas."
      />

      <p className="text-xs text-gray-600 dark:text-neutral-300">
        Nota: separa los códigos por comas. Ejemplo:{" "}
        <span className="font-mono dark:text-neutral-200">F401, E501</span>
      </p>
    </div>
  );
}

/* ------------------------------- Componentes auxiliares ------------------------------ */

/**
 * Input de texto reutilizable con label y mensaje de ayuda opcional.
 */
function TextInput({ id, label, value, onChange, placeholder, hint }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-900 dark:text-neutral-100">
        {label}
      </label>

      <input
        id={id}
        name={id}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`
          mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900
          outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100
          dark:border-neutral-700 dark:bg-neutral-950/40 dark:text-neutral-100 dark:placeholder:text-neutral-500
          dark:focus:border-sky-500 dark:focus:ring-sky-900/40
        `}
      />

      {hint ? (
        <p className="mt-1 text-xs text-gray-600 dark:text-neutral-300">{hint}</p>
      ) : null}
    </div>
  );
}