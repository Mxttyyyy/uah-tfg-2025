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
    { value: "java", label: "Java (próximamente)", disabled: true },
  ];

  // Obtenemos valores dependiendo del estado del análisis
  const hasCode = typeof code === "string" && code.trim().length > 0;
  const analyzeDisabled = !hasCode || isLoading;
  const clearDisabled = !hasCode || isLoading;
  const exampleDisabled = isLoading;

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-5">

      {/* Info izquierda */}
      <div className="flex-1 text-sm text-gray-600 font-semibold">
        {isLoading ? (
          <span>Analizando...</span>
        ) : hasCode ? (
          <span>Listo para analizar.</span>
        ) : (
          <span>Pega tu código para empezar.</span>
        )}
      </div>

      {/* Botones derecha */}
      <div className="flex flex-wrap items-center gap-3">

        <div className="flex items-center gap-3">
        <label htmlFor="language" className="text-sm font-semibold text-gray-800">
          Lenguaje
        </label>

        {/* Selector de lenguaje */}
        <select
          id="language"
          name="language"
          value={language}
          onChange={(e) => onLanguageChange?.(e.target.value)}
          className={`
            cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900
            outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-200 hover:bg-gray-50
          `}
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value} disabled={!!l.disabled}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

        {/* Botón para mostrar ejemplo de código */}
          <button
            type="button"
            onClick={onExample}
            disabled={exampleDisabled}
            className={[
              "rounded-lg border px-3 py-2 text-sm font-medium transition cursor-pointer",
              "border-gray-300 bg-white text-gray-900 hover:bg-gray-50",
              "disabled:cursor-not-allowed disabled:opacity-50",
            ].join(" ")}
          >
            Cargar ejemplo
          </button>

        {/* Botón para limpiar el textarea */}
        <button
          type="button"
          onClick={onClear}
          disabled={clearDisabled}
          className={[
            "rounded-lg border px-3 py-2 text-sm font-medium transition cursor-pointer",
            "border-gray-300 bg-white text-gray-900 hover:bg-gray-50",
            "disabled:cursor-not-allowed disabled:opacity-50",
          ].join(" ")}
        >
          Limpiar
        </button>

        {/* Botón para analizar */}
        <button
          type="button"
          onClick={onAnalyze}
          disabled={analyzeDisabled}
          className={[
            "inline-flex items-center justify-center gap-2", 
            "rounded-lg px-4 py-2 text-sm font-semibold transition",
            "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer",
            "disabled:cursor-not-allowed disabled:opacity-50",
          ].join(" ")}
        >
          {isLoading ? <Spinner size="sm" /> : null}
          Analizar
        </button>
      </div>
    </div>
  );
}
