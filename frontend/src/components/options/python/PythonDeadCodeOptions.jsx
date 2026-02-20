import {
  isPlainObject,
  listToCsv,
  csvToListNotUpper,
  csvToListDecorators,
  normalizeIntInRange,
} from "../../../utils/uiUtils";

import { useState, useEffect } from "react";
import { createDefaultPythonOptions } from "../../../utils/defaultOptions";
/**
 * Opciones de Vulture (dead_code).
 *
 * Backend espera (todas opcionales):
 * - min_confidence: number (0..100)
 * - ignore_names: string[] (patrones, ej: ["temp_*", "debug_*"])
 * - ignore_decorators: string[] (ej: ["app.get", "app.post"])
 *
 * UI:
 * - min_confidence como number input
 * - ignore_* como texto CSV (separado por comas)
 *
 * Props:
 * - options: objeto con opciones actuales de dead_code
 * - onChange: (nextValue) => void
 */
export default function DeadCodeOptions({
  options,
  onChange,
  resetOptionsSignal,
  setResetSignal,
}) {

  // Normalizamos las opciones para garantizar siempre un objeto válido
  // y evitar valores null/undefined en la UI.
  const normalizedOptions = isPlainObject(options) ? options : {};

  // Validamos las opciones y aplicamos valores por defecto para la UI.
  const minConfidence =
    typeof normalizedOptions.min_confidence === "number"
      ? normalizedOptions.min_confidence
      : 60;

  const [ignoreNamesCsv, setIgnoreNamesCsv] = useState(listToCsv(normalizedOptions.ignore_names));
  const [ignoreDecoratorsCsv, setIgnoreDecoratorsCsv] = useState(listToCsv(normalizedOptions.ignore_decorators));

  // Obtenemos las opciones predeterminadas
  const defaultOptionsDeadCode = createDefaultPythonOptions().dead_code;
  const defaultIgnoreNames = listToCsv(defaultOptionsDeadCode.ignore);
  const defaultIgnoreDecorators = listToCsv(defaultOptionsDeadCode.extend_select);

  /**
   * Actualiza parcialmente las opciones de código muerto,
   * manteniendo el resto de la configuración sin modificar.
   */
  function updateDeadCodeOptions(patch) {
    onChange({ ...normalizedOptions, ...patch });
  }

  // Si el usuario pulsa "Restablecer todas las opciones", reiniciamos el input local a su valor por defecto.
  // Importante: usamos esta señal (resetOptionsSignal) para no sobrescribir lo que el usuario está escribiendo.
  useEffect(() => {
    if (!resetOptionsSignal) return;
    setIgnoreNamesCsv(defaultIgnoreNames);
    setIgnoreDecoratorsCsv(defaultIgnoreDecorators);

    setResetSignal(false);
  }, [resetOptionsSignal]);

  return (
    <div className="space-y-4">
      <NumberInput
        id="dc-min-confidence"
        label="min_confidence"
        value={minConfidence}
        min={0}
        max={100}
        onChange={(n) =>
          updateDeadCodeOptions({
            min_confidence: normalizeIntInRange(n, 0, 100),
          })
        }
        hint="0-100. Cuanto más alto, más estricto."
      />

      <TextInput
        id="dc-ignore-names"
        label="ignore_names"
        placeholder="Ej: temp_var, debug_funct"
        value={ignoreNamesCsv}
        onChange={(text) => {
          setIgnoreNamesCsv(text);
          updateDeadCodeOptions({ ignore_names: csvToListNotUpper(text) });
        }}
        hint="Patrones de nombres a ignorar (separados por comas)."
      />

      <TextInput
        id="dc-ignore-decorators"
        label="ignore_decorators"
        placeholder="Ej: @app.get, @app.post"
        value={ignoreDecoratorsCsv}
        onChange={(text) => {
          setIgnoreDecoratorsCsv(text);
          updateDeadCodeOptions({
            ignore_decorators: csvToListDecorators(text),
          });
        }}
        hint="Decoradores a ignorar (deben empezar por @)."
      />

      <p className="text-xs text-gray-600 dark:text-neutral-300">
        Nota: separa los valores por comas. Ejemplo:{" "}
        <span className="font-mono dark:text-neutral-200">temp_*, debug_*</span>
      </p>
    </div>
  );
}

/* ------------------------------- Componentes auxiliares ------------------------------ */

/**
 * Input de texto reutilizable con label y ayuda opcional.
 */
function TextInput({ id, label, value, onChange, placeholder, hint }) {
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
        <p className="mt-1 text-xs text-gray-600 dark:text-neutral-300">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Input numérico reutilizable con label, límites mínimo/máximo y texto de ayuda opcional.
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
        value={typeof value === "number" ? value : 0}
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
