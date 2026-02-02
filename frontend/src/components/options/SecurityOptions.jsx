import { isPlainObject, listToCsv, csvToList } from "../../utils/uiUtils";

/**
 * Opciones de Bandit (security).
 *
 * Backend espera (todas opcionales):
 * - severity_level: "all" | "low" | "medium" | "high"
 * - confidence_level: "all" | "low" | "medium" | "high"
 * - skip:  string[]   (ej: ["B101", "B603"])
 * - tests: string[]   (ej: ["B101"])
 *
 * En la UI:
 * - severity/confidence como <select>
 * - skip/tests como texto CSV (ej: "B101, B603") porque es lo más simple
 *
 * Props:
 * - options: objeto con opciones actuales de security
 * - onChange: (nextValue) => void
 */
export default function SecurityOptions({ options, onChange }) {

  // Normalizamos las opciones para garantizar siempre un objeto válido
  // y evitar valores null/undefined en la UI.
  const normalizedOptions = isPlainObject(options) ? options : {};

  // Validamos las opciones y aplicamos valores por defecto para la UI.
  const severity =
    typeof normalizedOptions.severity_level === "string"
      ? normalizedOptions.severity_level
      : "all";
  const confidence =
    typeof normalizedOptions.confidence_level === "string"
      ? normalizedOptions.confidence_level
      : "all";

  const skipCsv = listToCsv(normalizedOptions.skip);
  const testsCsv = listToCsv(normalizedOptions.tests);

  /**
   * Actualiza parcialmente las opciones de seguridad,
   * manteniendo el resto de la configuración sin modificar.
   */
  function updateSecurityOptions(patch) {
    onChange({ ...normalizedOptions, ...patch });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SelectInput
          id="sec-severity"
          label="severity_level"
          value={severity}
          onChange={(selectedSeverity) =>
            updateSecurityOptions({ severity_level: selectedSeverity })
          }
          options={LEVELS}
          hint="Severidad mínima a reportar."
        />

        <SelectInput
          id="sec-confidence"
          label="confidence_level"
          value={confidence}
          onChange={(selectedSeverity) =>
            updateSecurityOptions({ confidence_level: selectedSeverity })
          }
          options={LEVELS}
          hint="Confianza mínima a reportar."
        />
      </div>

      <TextInput
        id="sec-skip"
        label="skip"
        placeholder="Ej: B101, B603"
        value={skipCsv}
        onChange={(text) => updateSecurityOptions({ skip: csvToList(text) })}
        hint="IDs de reglas a ignorar."
      />

      <TextInput
        id="sec-tests"
        label="tests"
        placeholder="Ej: B101, B301"
        value={testsCsv}
        onChange={(text) => updateSecurityOptions({ tests: csvToList(text) })}
        hint="Si lo rellenas, Bandit ejecuta solo estas reglas."
      />

      <p className="text-xs text-gray-600">
        Nota: separa los IDs por comas. Ejemplo:{" "}
        <span className="font-mono">B101, B603</span>
      </p>
    </div>
  );
}

// Niveles de severidad y confianza soportados por Bandit.
const LEVELS = [
  { value: "all", label: "all" },
  { value: "low", label: "low" },
  { value: "medium", label: "medium" },
  { value: "high", label: "high" },
];

/* ------------------------------- Componentes auxiliares ------------------------------ */

/**
 * Input de texto reutilizable con label y ayuda opcional.
 */
function TextInput({ id, label, value, onChange, placeholder, hint }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-900">
        {label}
      </label>

      <input
        id={id}
        name={id}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />

      {hint ? <p className="mt-1 text-xs text-gray-600">{hint}</p> : null}
    </div>
  );
}

/**
 * Select reutilizable con label y mensaje de ayuda opcional.
 */
function SelectInput({ id, label, value, onChange, options, hint }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-900">
        {label}
      </label>

      <select
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {hint ? <p className="mt-1 text-xs text-gray-600">{hint}</p> : null}
    </div>
  );
}
