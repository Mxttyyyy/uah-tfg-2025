import { isPlainObject, listToCsv, csvToListNotUpper } from "../../../utils/uiUtils";
import { useState, useEffect } from "react";
import { createDefaultJavaOptions } from "../../../utils/defaultOptions";

/**
 * Opciones de Semgrep (security).
 *
 * Backend espera (todas opcionales):
 * - severity: string[]  (LOW | MEDIUM | HIGH | CRITICAL)
 * - config: string[]    (ej: "p/findsecbugs" o ["p/findsecbugs", "p/owasp-top-ten"])
 * - exclude_rules: string[]  (IDs de reglas a excluir: --exclude-rule)
 * - exclude_contains: string[]   (filtro extra: si el check_id contiene alguno de estos fragmentos, se ignora)
 *
 * Props:
 * - options: objeto con opciones actuales de security
 * - onChange: (nextValue) => void
 * - resetOptionsSignal
 * - setResetSignal
 */
export default function JavaSecurityOptions({
  options,
  onChange,
  resetOptionsSignal,
  setResetSignal,
}) {

  // Normalizamos las opciones para garantizar siempre un objeto válido
  // y evitar valores null/undefined en la UI.
  const normalizedOptions = isPlainObject(options) ? options : {};
  const defaultOptionsSecurity = createDefaultJavaOptions().security;

  // Validamos las opciones y aplicamos valores por defecto.
  const severity = Array.isArray(normalizedOptions.severity)
    ? normalizedOptions.severity
    : defaultOptionsSecurity.severity;

  const [configCsv, setConfigCsv] = useState(listToCsv(normalizedOptions.config));
  const [excludeRuleCsv, setExcludeRulesCsv] = useState(listToCsv(normalizedOptions.exclude_rules));
  const [excludeContainsCsv, setExcludeContainsCsv] = useState(listToCsv(normalizedOptions.exclude_contains));
  
  // Obtenemos las opciones predeterminadas
  const defaultConfig = listToCsv(defaultOptionsSecurity.config);
  const defaultExcludeRules = listToCsv(defaultOptionsSecurity.exclude_rules);
  const defaultExcludeContains = listToCsv(defaultOptionsSecurity.exclude_contains);

  /**
   * Actualiza parcialmente las opciones de seguridad,
   * manteniendo el resto de la configuración sin modificar.
   */
  function updateSecurityOptions(patch) {
    onChange({ ...normalizedOptions, ...patch });
  }

  // Si el usuario pulsa el botón "Restablecer todas las opciones", reiniciamos el input local a su valor por defecto.
  // Importante: usamos esta sennal (resetOptionsSignal) para no sobrescribir lo que el usuario está escribiendo.
  useEffect(() => {
    if (!resetOptionsSignal) return;

    setConfigCsv(defaultConfig);
    setExcludeRulesCsv(defaultExcludeRules);
    setExcludeContainsCsv(defaultExcludeContains);

    setResetSignal(false);
  }, [resetOptionsSignal]);

  /**
   * Activa o desactiva un nivel de severidad en el filtro del módulo de seguridad.
   * Si el nivel ya está seleccionado, se elimina; si no, se annade.
   * Se normaliza a mayúsculas para mantener consistencia con el backend.
   */
  function toggleSeverity(level) {
    const normalizedLevel = level.toUpperCase();

    // Copiamos el array actual para no modificar el estado directamente.
    let nextSeverity = [...severity];

    // Si el nivel ya estaba seleccionado, lo eliminamos.
    if (nextSeverity.includes(normalizedLevel)) {
      nextSeverity = nextSeverity.filter((sev) => sev !== normalizedLevel);
    } else {
      // Si no, lo annadimos.
      nextSeverity.push(normalizedLevel);
    }

    updateSecurityOptions({ severity: nextSeverity });
  }

  return (
    <div className="space-y-4">
      {/* Severity checkboxes */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-neutral-100">
          severity (filtro)
        </label>

        <div className="mt-2 grid grid-cols-2 gap-2">
          {SEVERITY_LEVELS.map((level) => (
            <label
              key={level}
              className="flex items-center gap-2 text-sm text-gray-900 dark:text-neutral-100"
            >
              <input
                type="checkbox"
                checked={severity.includes(level)}
                onChange={() => toggleSeverity(level)}
                className={`
                  h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-100
                  dark:border-neutral-700 dark:bg-neutral-950/40
                  dark:focus:ring-sky-900/40 dark:[color-scheme:dark]
                `}
              />
              {level}
            </label>
          ))}
        </div>

        <p className="mt-2 text-xs text-gray-600 dark:text-neutral-300">
          Filtra resultados por nivel de impacto de la vulnerabilidad. Si no marcas ninguna, se muestran todas.
        </p>
      </div>

      <TextInput
        id="sec-config"
        label="config"
        placeholder="Ej: p/java, p/owasp-top-ten"
        value={configCsv}
        onChange={(text) => {
          setConfigCsv(text);
          updateSecurityOptions({ config: csvToListNotUpper(text) });
        }}
        hint="Configs de Semgrep a ejecutar (puedes poner varias)."
      />

      <TextInput
        id="sec-exclude-rules"
        label="exclude_rules"
        placeholder="Ej: java.lang.security.audit.crypto.weak-hash"
        value={excludeRuleCsv}
        onChange={(text) => {
          setExcludeRulesCsv(text);
          updateSecurityOptions({ exclude_rules: csvToListNotUpper(text) });
        }}
        hint="Excluye reglas concretas por su ID exacto (check_id) (puedes poner varios)."
      />
      <TextInput
        id="sec-exclude-contains"
        label="exclude_contains"
        placeholder="Ej: crypto, sql, injection"
        value={excludeContainsCsv}
        onChange={(text) => {
          setExcludeContainsCsv(text);
          updateSecurityOptions({ exclude_contains: csvToListNotUpper(text) });
        }}
        hint="Excluye todas las reglas cuyo ID (check_id) contenga estos términos (puedes poner varios)."
      />

      <p className="text-xs text-gray-600 dark:text-neutral-300">
        Nota: usa exclude_rules para IDs exactos y exclude_contains para filtrar
        por palabras.
      </p>
    </div>
  );
}

// Niveles de severidad soportados por Semgrep.
const SEVERITY_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

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
