import CodeActions from "./CodeActions";
/**
 * Área de entrada de código.
 *
 * Props:
 * - value: string (contenido actual del código)
 * - onChange: (newValue: string) => void (callback al modificar el código)
 * - placeholder: string (texto mostrado cuando no hay contenido)
 * - disabled: boolean (deshabilita la edición del textarea)
 * - isLoading: boolean (indica si el análisis está en curso)
 * - onAnalyze: () => void (lanza el análisis del código)
 * - onClear: () => void (limpia el contenido del editor)
 * - onExample: () => void (carga un ejemplo de código) ---- ¿? ----
 * - textareaRef: (referencia al textarea)
 * - sectionRef: (referencia al contenedor del bloque)
 */
export default function CodeInput({
  value,
  onChange,
  placeholder = "Pega aquí tu código...",
  disabled = false,
  isLoading,
  onAnalyze,
  onClear,
  onExample,
  textareaRef,
  sectionRef,
}) {
  // Número de líneas del código
  const lines = countLines(value);

  return (
    <section
      ref={sectionRef}
      className={`
        rounded-xl border border-gray-200 bg-white p-4 shadow-sm
        sm:p-6 w-150 hover:shadow-md hover:-translate-y-[2px] transition
      `}
    >
      {/* Título del contenedor y contador de líneas */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900">Código</h2>
        <span className="text-sm text-gray-600">
          {lines} {lines === 1 ? "línea" : "líneas"}
        </span>
      </div>

      {/* Campo de texto para introducir el código */}
      {/* Importante -> spellCheck={false}: Desactivar la comprobación ortográfica */}
      <textarea
        id="code"
        name="code"
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        wrap="off"
        placeholder={placeholder}
        disabled={disabled}
        spellCheck={false}
        className={[
          "w-full overflow-auto scrollbar-modern resize-y rounded-lg",
          "border border-gray-200 bg-gray-50 focus:bg-white",
          "px-3 py-3 text-sm text-gray-900 transition",
          "min-h-[clamp(340px,45vh,440px)]",
          "h-[clamp(440px,60vh,740px)]",
          "max-h-[clamp(440px,60vh,740px)]",
          "outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 focus:shadow-md",
          "disabled:cursor-not-allowed disabled:bg-gray-50",
        ].join(" ")}
      />

      {/* Mensaje informativo para el usuario */}
      <p className="mt-2 text-xs text-gray-500">
        Nota: se recomienda pegar el archivo completo.
      </p>

      {/* CodeActions integrada */}
      <div className="mt-5 border-t border-gray-200 pt-4">
        <CodeActions
          code={value}
          isLoading={!!isLoading}
          onAnalyze={onAnalyze}
          onClear={onClear}
          onExample={onExample}
        />
      </div>
    </section>
  );
}

/* ----------------------------- Funciones auxiliares ---------------------------- */

// Contar el número de líneas del texto introducido
function countLines(text) {
  if (!text) return 0;
  // Si el usuario acaba con salto de línea, no contamos una línea vacía extra.
  const trimmed = text.endsWith("\n") ? text.slice(0, -1) : text;
  return trimmed.split("\n").length;
}
