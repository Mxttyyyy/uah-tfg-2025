import { isPlainObject, normalizeIntInRange } from "../../../utils/uiUtils";
import { createDefaultJavaOptions } from "../../../utils/defaultOptions";
/**
 * Opciones de javac (types).
 *
 * Backend espera (todas opcionales):
 * - release: int (ej: 17, 21)
 * - lint: boolean
 *
 * Props:
 * - options: objeto con opciones actuales de types
 * - onChange: (nextValue) => void
 */
export default function JavaTypesOptions({ options, onChange }) {
  
  // Normalizamos las opciones para garantizar siempre un objeto válido
  // y evitar valores null/undefined en la UI.
  const normalizedOptions = isPlainObject(options) ? options : {};
  const defaultOptionsTypes = createDefaultJavaOptions().types;
  
  // Validamos las opciones y aplicamos valores por defecto
  const release =
    typeof normalizedOptions.release === "number"
      ? normalizedOptions.release
      : defaultOptionsTypes.release;

  const lint =
    typeof normalizedOptions.lint === "boolean"
      ? normalizedOptions.lint
      : defaultOptionsTypes.lint;

  /**
   * Actualiza parcialmente las opciones de tipos,
   * manteniendo el resto de la configuración sin cambios.
   */
  function updateTypesOptions(patch) {
    onChange({ ...normalizedOptions, ...patch });
  }

  return (
    <div className="space-y-4">
      <NumberInput
        id="j-types-release"
        label="release"
        value={release}
        min={1}
        max={50}
        onChange={(value) =>
          updateTypesOptions({
            release: normalizeIntInRange(value, 1, 50),
          })
        }
        hint="Versión de Java para la compilación. Ejemplo: 17 o 21."
      />

      <CheckboxRow
        id="j-types-lint"
        label="lint"
        checked={lint}
        onChange={() => updateTypesOptions({ lint: !lint })}
        hint="Activa warnings adicionales de -Xlint (unchecked, rawtypes)."
      />
    </div>
  );
}

/* ------------------------------- Componentes auxiliares ------------------------------ */

/**
 * Checkbox reutilizable con label y texto de ayuda opcional.
 */
function CheckboxRow({ id, label, checked, onChange, hint }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <input
          id={id}
          name={id}
          type="checkbox"
          checked={!!checked}
          onChange={onChange}
          className={`
            h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-200 dark:[color-scheme:dark]
            dark:border-neutral-700 dark:bg-neutral-950/40 dark:text-sky-400 dark:focus:ring-sky-900/40
          `}
        />
        <label
          htmlFor={id}
          className="text-sm font-medium text-gray-900 dark:text-neutral-100"
        >
          {label}
        </label>
      </div>
      {hint ? (
        <p className="mt-1 text-xs text-gray-600 dark:text-neutral-300">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

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
