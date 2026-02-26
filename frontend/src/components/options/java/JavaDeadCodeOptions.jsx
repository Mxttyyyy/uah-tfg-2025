import {
  isPlainObject,
  listToCsv,
  csvToListNotUpper,
} from "../../../utils/uiUtils";

import { useState, useEffect } from "react";
import { createDefaultJavaOptions } from "../../../utils/defaultOptions";
/**
 * Opciones de PMD (dead_code).
 *
 * Backend espera (todas opcionales):
 * - profile: "minimal" | "default" | "strict"
 * - exclude_rules: string[]
 * - minimum_priority: int (1..5)
 *
 * Props:
 * - options: objeto con opciones actuales de dead_code
 * - onChange: (nextValue) => void
 * - resetOptionsSignal
 * - setResetSignal
 */
export default function JavaDeadCodeOptions({
  options,
  onChange,
  resetOptionsSignal,
  setResetSignal,
}) {
  // Normalizamos las opciones para garantizar siempre un objeto válido
  // y evitar valores null/undefined en la UI.
  const normalizedOptions = isPlainObject(options) ? options : {};
  const defaultOptionsDeadCode = createDefaultJavaOptions().dead_code;

  // Validamos las opciones y aplicamos valores por defecto para la UI.
  const profile =
    typeof normalizedOptions.profile === "string"
      ? normalizedOptions.profile
      : defaultOptionsDeadCode.profile;

  const minimum_priority =
    typeof normalizedOptions.minimum_priority === "number"
      ? normalizedOptions.minimum_priority
      : defaultOptionsDeadCode.minimum_priority;

  const [excludeRulesCsv, setExcludeRulesCsv] = useState(
    listToCsv(normalizedOptions.exclude_rules),
  );

  // Obtenemos las opciones predeterminadas
  const defaultExcludeRules = listToCsv(defaultOptionsDeadCode.exclude_rules);

  /**
   * Actualiza parcialmente las opciones de código muerto,
   * manteniendo el resto de la configuración sin modificar.
   */
  function updateDeadCodeOptions(patch) {
    onChange({ ...normalizedOptions, ...patch });
  }

  // Si el usuario pulsa el botón "Restablecer todas las opciones", reiniciamos el input local a su valor por defecto.
  // Importante: usamos esta sennal (resetOptionsSignal) para no sobrescribir lo que el usuario está escribiendo.
  useEffect(() => {
    if (!resetOptionsSignal) return;

    setExcludeRulesCsv(defaultExcludeRules);

    updateDeadCodeOptions({
      exclude_rules: csvToListNotUpper(defaultExcludeRules),
    });

    setResetSignal(false);
  }, [resetOptionsSignal]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SelectInput
          id="j-dc-profile"
          label="profile"
          value={profile}
          onChange={(v) => updateDeadCodeOptions({ profile: v })}
          options={PROFILES}
          hint="Perfil de reglas (PMD): minimal = menos avisos, default = equilibrio, strict = más avisos."
        />

        <SelectInput
          id="j-dc-min-priority"
          label="minimum_priority"
          value={minimum_priority}
          onChange={(value) =>
            updateDeadCodeOptions({minimum_priority: value === "" ? "" : Number(value)})}
          options={PMD_PRIORITIES}
          hint="Filtra por prioridad (1 = más grave, 5 = menos grave). Ejemplo: El valor '3' incluye incidencias con prioridad 1, 2 y 3."
        />
      </div>

      <TextInput
        id="j-dc-exclude-rules"
        label="exclude_rules"
        placeholder="Ej: UnusedPrivateMethod, UnnecessaryImport"
        value={excludeRulesCsv}
        onChange={(text) => {
          setExcludeRulesCsv(text);
          updateDeadCodeOptions({ exclude_rules: csvToListNotUpper(text) });
        }}
        hint="Nombres cortos de reglas a excluir del perfil."
      />

      <p className="text-xs text-gray-600 dark:text-neutral-300">
        Nota: separa los valores por comas. Ejemplo:{" "}
        <span className="font-mono dark:text-neutral-200">
          UnusedPrivateMethod, UnnecessaryImport
        </span>
      </p>
    </div>
  );
}

// Perfiles de análisis disponibles
const PROFILES = [
  { value: "minimal", label: "minimal" },
  { value: "default", label: "default" },
  { value: "strict", label: "strict" },
];

// Prioridades de PMD
const PMD_PRIORITIES = [
  { value: "", label: "(por defecto)" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
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
        <p className="mt-1 text-xs text-gray-600 dark:text-neutral-300">
          {hint}
        </p>
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
