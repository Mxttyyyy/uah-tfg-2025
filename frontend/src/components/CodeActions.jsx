import Spinner from "./Spinner";

/**
 * Acciones sobre el código.
 *
 * Función:
 * - Contiene los botones que disparan acciones globales:
 *   - Analizar (llama a la API)
 *   - Limpiar (vacía el textarea)
 *   - Ejemplo (pega un snippet de ejemplo)
 *
 * Props:
 * - code: string (contenido actual del textarea)
 * - language: string (lenguaje seleccionado)
 * - isLoading: boolean (true mientras estás esperando la respuesta del análisis)
 * - onAnalyze: () => void
 * - onClear: () => void
 * - onExample: () => void
 */
export default function CodeActions({
  code,
  language,
  isLoading,
  onAnalyze,
  onClear,
  onExample,
}) {
  // Lista de lenguajes soportados por la herramienta
  const LANGUAGES = [
    { value: "python", label: "Python" },
    { value: "java", label: "Java", disabled: true },
  ];

  // Obtenemos valores dependiendo del estado del análisis
  const hasCode = typeof code === "string" && code.trim().length > 0;
  const analyzeDisabled = !hasCode || isLoading;
  const clearDisabled = !hasCode || isLoading;
  const exampleDisabled = isLoading;

  return (
    <div className="flex w-full flex-wrap justify-between flex-col gap-5">

      {/* FILA 1 - INFO */}
      <div className="flex-1 text-sm font-semibold text-gray-600 dark:text-neutral-300">
        {isLoading ? (
          <span>Analizando...</span>
        ) : hasCode ? (
          <span>Listo para analizar.</span>
        ) : (
          <span>Pega tu código para empezar.</span>
        )}
      </div>

      {/* FILA 2 - CONTROLES */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        
        {/* Selector (izquierda) */}
        <div className="flex items-center gap-3 shrink-0">
          <label
            htmlFor="language"
            className="text-sm font-semibold text-gray-800 dark:text-neutral-200"
          >
            Lenguaje
          </label>

          <select
            id="language"
            name="language"
            value={language}
            onChange={(e) => onLanguageChange?.(e.target.value)}
            className={`
              cursor-pointer rounded-lg border border-gray-300 bg-white
              px-3 py-2 text-sm text-gray-900
              outline-none transition
              hover:bg-gray-50
              focus:border-blue-500 focus:ring-1 focus:ring-blue-200
              dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100
              dark:hover:bg-neutral-900
              dark:focus:border-sky-400 dark:focus:ring-sky-900/40
            `}
          >
            {LANGUAGES.map((l) => (
              <option
                key={l.value}
                value={l.value}
                disabled={!!l.disabled}
                className="dark:bg-neutral-950"
              >
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {/* Botones (derecha) */}
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onExample}
            disabled={exampleDisabled}
            className={`
              rounded-lg border px-3 py-2 text-sm font-medium transition
              border-gray-300 bg-white text-gray-900
              hover:bg-gray-50 cursor-pointer active:bg-blue-100
              disabled:cursor-not-allowed disabled:opacity-50
              dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100
              dark:hover:bg-neutral-700 dark:active:bg-sky-900/30
            `}
          >
            Cargar ejemplo
          </button>

          <button
            type="button"
            onClick={onClear}
            disabled={clearDisabled}
            className={`
              rounded-lg border px-3 py-2 text-sm font-medium transition
              border-gray-300 bg-white text-gray-900
              hover:bg-gray-50 cursor-pointer active:bg-blue-100
              disabled:cursor-not-allowed disabled:opacity-50
              dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100
              dark:hover:bg-neutral-700 dark:active:bg-sky-900/30
            `}
          >
            Limpiar
          </button>

          <button
            type="button"
            onClick={onAnalyze}
            disabled={analyzeDisabled}
            className={`
              inline-flex items-center justify-center gap-2
              rounded-lg px-4 py-2 text-sm font-semibold transition
              bg-blue-600 text-white hover:bg-blue-700 cursor-pointer
              disabled:cursor-not-allowed disabled:opacity-50
              dark:bg-sky-600 dark:hover:bg-sky-500
            `}
          >
            {isLoading ? <Spinner size="sm" /> : null}
            Analizar
          </button>
        </div>
      </div>
    </div>
  );
}