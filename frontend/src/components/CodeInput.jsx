/**
 * Área de entrada de código.
 *
 * Props:
 * - value: string
 * - onChange: (newValue: string) => void
 * - placeholder: string (opcional)
 * - disabled: boolean (opcional)
 */
export default function CodeInput({
  value,
  onChange,
  placeholder = "Pega aquí tu código...",
  disabled = false,
}) {
  // Número de líneas del código
  const lines = countLines(value);

  return (
    
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">

      {/* Título del área y contador de líneas */}
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        spellCheck={false} 
        className={[
          "w-full overflow-auto resize-y rounded-lg border border-gray-200 bg-gray-50 focus:bg-white ",
          "px-3 py-3 text-sm text-gray-900 transition",
          "min-h-[320px] md:min-h-[380px] lg:min-h-[440px] xl:min-h-[520px] max-h-[60vh]",
          "outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 focus:shadow-md",
          "disabled:cursor-not-allowed disabled:bg-gray-50",
        ].join(" ")}
      />

      {/* Mensaje informativo para el usuario */}
      <p className="mt-2 text-xs text-gray-500">
        Nota: se recomienda pegar el archivo completo.
      </p>
    </section>
  );
}

// Contar el número de líneas del texto introducido
function countLines(text) {
  if (!text) return 0;
  // Si el usuario acaba con salto de línea, no contamos una línea vacía extra.
  const trimmed = text.endsWith("\n") ? text.slice(0, -1) : text;
  return trimmed.split("\n").length;
}
