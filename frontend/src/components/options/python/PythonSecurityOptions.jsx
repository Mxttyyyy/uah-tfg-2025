import { isPlainObject, listToCsv, csvToList } from "../../../utils/uiUtils";
import { useState, useEffect } from "react";
import { createDefaultAnalyzeOptions } from "../../../utils/defaultOptions";

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
 * - skip/tests como texto CSV (ej: "B101, B603") ya que es lo más simple
 *
 * Props:
 * - options: objeto con opciones actuales de security
 * - onChange: (nextValue) => void
 */
export default function SecurityOptions({
  options,
  onChange,
  resetOptionsSignal,
  setResetSignal,
}) {

  // Normalizamos las opciones para garantizar siempre un objeto válido
  // y evitar valores null/undefined en la UI.
  const normalizedOptions = isPlainObject(options) ? options : {};

  // Validamos las opciones y aplicamos valores por defecto.
  const severity =
    typeof normalizedOptions.severity_level === "string"
      ? normalizedOptions.severity_level
      : "all";
  const confidence =
    typeof normalizedOptions.confidence_level === "string"
      ? normalizedOptions.confidence_level
      : "all";

  const [skipCsv, setSkipCsv] = useState(listToCsv(normalizedOptions.skip));
  const [testsCsv, setTestsCsv] = useState(listToCsv(normalizedOptions.tests));

  // Obtenemos las opciones predeterminadas
  const defaultOptionsSecurity = createDefaultAnalyzeOptions().security;
  const defaultSkip = listToCsv(defaultOptionsSecurity.select);
  const defaultTests = listToCsv(defaultOptionsSecurity.ignore);

  /**
   * Actualiza parcialmente las opciones de seguridad,
   * manteniendo el resto de la configuración sin modificar.
   */
  function updateSecurityOptions(patch) {
    onChange({ ...normalizedOptions, ...patch });
  }

  // Si el usuario pulsa "Restablecer todas las opciones", reiniciamos el input local a su valor por defecto.
  // Importante: usamos esta señal (resetOptionsSignal) para no sobrescribir lo que el usuario está escribiendo.
  useEffect(() => {
    if (!resetOptionsSignal) return;
    setSkipCsv(defaultSkip);
    setTestsCsv(defaultTests);

    setResetSignal(false);
  }, [resetOptionsSignal]);

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
          hint={
            <>
              Severidad mínima a reportar.
              <br />
              (low = info, medium = warning, high = error).
            </>
          }
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
        onChange={(text) => {
          setSkipCsv(text);
          updateSecurityOptions({ skip: csvToList(text) });
        }}
        hint="IDs de reglas a ignorar."
      />

      <TextInput
        id="sec-tests"
        label="tests"
        placeholder="Ej: B101, B301"
        value={testsCsv}
        onChange={(text) => {
          setTestsCsv(text);
          updateSecurityOptions({ tests: csvToList(text) });
        }}
        hint="Si lo rellenas, Bandit ejecuta solo estas reglas."
      />

      <p className="text-xs text-gray-600 dark:text-neutral-300">
        Nota: separa los IDs por comas. Ejemplo:{" "}
        <span className="font-mono dark:text-neutral-200">B101, B603</span>
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
        <p className="mt-1 text-xs text-gray-600 dark:text-neutral-300">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Select reutilizable con label y mensaje de ayuda opcional.
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