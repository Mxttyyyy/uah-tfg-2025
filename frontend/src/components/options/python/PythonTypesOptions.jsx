import { isPlainObject, listToCsv, csvToListNotUpper } from "../../../utils/uiUtils";
import { useState, useEffect } from "react";
import { createDefaultPythonOptions } from "../../../utils/defaultOptions";

/**
 * Opciones de Mypy (types).
 *
 * Backend espera (todas opcionales):
 * - ignore_missing_imports: boolean
 * - python_version: string  (ej: "3.10")
 * - strict: boolean
 * - show_error_code_links: boolean
 * - enable_error_codes: string[]
 * - disable_error_codes: string[]
 *
 * UI:
 * - booleans --> checkboxes
 * - python_version --> input
 * - enable/disable_error_codes --> CSV (separado por comas)
 *
 * Props:
 * - options: objeto con opciones actuales de types
 * - onChange: (nextValue) => void
 */
export default function PythonTypesOptions({
  options,
  onChange,
  resetOptionsSignal,
  setResetSignal,
}) {

  // Normalizamos las opciones para garantizar siempre un objeto válido
  // y evitar valores null/undefined en la UI.
  const normalizedOptions = isPlainObject(options) ? options : {};

  // Validamos las opciones y aplicamos valores por defecto
  const ignoreMissing = normalizedOptions.ignore_missing_imports !== false; // default: true
  const strict = normalizedOptions.strict === true;
  const showLinks = normalizedOptions.show_error_code_links === true;
  const pythonVersion =
    typeof normalizedOptions.python_version === "string"
      ? normalizedOptions.python_version
      : "";

  const [enableCodesCsv, setEnableCodesCsv] = useState(listToCsv(normalizedOptions.enable_error_codes));
  const [disableCodesCsv, setDisableCodesCsv] = useState(listToCsv(normalizedOptions.disable_error_codes));

  // Obtenemos las opciones predeterminadas
  const defaultOptionsTypes = createDefaultPythonOptions().types;
  const defaultEnable = listToCsv(defaultOptionsTypes.enable_error_codes);
  const defaultDisable = listToCsv(defaultOptionsTypes.disable_error_codes);

  /**
   * Actualiza parcialmente las opciones de tipos,
   * manteniendo el resto de la configuración sin cambios.
   */
  function updateTypesOptions(patch) {
    onChange({ ...normalizedOptions, ...patch });
  }

  // Si el usuario pulsa el botón "Restablecer todas las opciones", reiniciamos el input local a su valor por defecto.
  // Importante: usamos esta sennal (resetOptionsSignal) para no sobrescribir lo que el usuario está escribiendo.
  useEffect(() => {
    if (!resetOptionsSignal) return;
    setEnableCodesCsv(defaultEnable);
    setDisableCodesCsv(defaultDisable);

    setResetSignal(false);
  }, [resetOptionsSignal]);

  return (
    <div className="space-y-4">
      <CheckboxRow
        id="ty-ignore-missing"
        label="ignore_missing_imports"
        checked={ignoreMissing}
        onChange={() =>
          updateTypesOptions({ ignore_missing_imports: !ignoreMissing })
        }
        hint="Ignora imports no resolubles (útil en snippets o dependencias no instaladas)."
      />

      <CheckboxRow
        id="ty-strict"
        label="strict"
        checked={strict}
        onChange={() => updateTypesOptions({ strict: !strict })}
        hint="Activa comprobaciones adicionales (más estricto)."
      />

      <CheckboxRow
        id="ty-links"
        label="show_error_code_links"
        checked={showLinks}
        onChange={() =>
          updateTypesOptions({ show_error_code_links: !showLinks })
        }
        hint="Añade información extra (en algunos errores)."
      />

      <TextInput
        id="ty-pyver"
        label="python_version"
        placeholder="Ej: 3.10"
        value={pythonVersion}
        onChange={(text) => updateTypesOptions({ python_version: text.trim() })}
        hint="Formato X.Y. Si lo dejas vacío, se usa el valor por defecto."
      />

      <TextInput
        id="ty-enable"
        label="enable_error_codes"
        placeholder="Ej: truthy-bool, redundant-expr"
        value={enableCodesCsv}
        onChange={(text) => {
          setEnableCodesCsv(text);
          updateTypesOptions({ enable_error_codes: csvToListNotUpper(text) });
        }}
        hint="Códigos de error a activar (separados por comas)."
      />

      <TextInput
        id="ty-disable"
        label="disable_error_codes"
        placeholder="Ej: assignment"
        value={disableCodesCsv}
        onChange={(text) => {
          setDisableCodesCsv(text);
          updateTypesOptions({ disable_error_codes: csvToListNotUpper(text) });
        }}
        hint="Códigos de error a desactivar (separados por comas)."
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
        <label htmlFor={id} className="text-sm font-medium text-gray-900 dark:text-neutral-100">
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
 * Input de texto reutilizable con label y ayuda contextual.
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