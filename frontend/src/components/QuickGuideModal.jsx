/**
 * Modal de Guía Rápida.
 *
 * Muestra una explicación breve de cómo usar la herramienta.
 *
 * Props:
 * - open: boolean (si el modal está visible)
 * - onClose: function (cerrar modal)
 */
export default function QuickGuideModal({ open, onClose }) {
  if (!open) return null;

  const steps = [
    {
      title: "Pega tu código",
      text: "Copia y pega el archivo completo en el área principal para obtener resultados más fiables.",
    },
    {
      title: "Configura el análisis",
      text: "Marca qué herramientas quieres ejecutar (si no seleccionas ninguna, se ejecutan todas). Ajusta el timeout si lo necesitas.",
    },
    {
      title: "Pulsa Analizar",
      text: "Se generará un resumen y, debajo, los resultados por módulo (Ruff, Bandit, Radon, Vulture, Mypy).",
    },
    {
      title: "Revisa y navega",
      text: "Abre los módulos con incidencias y pulsa en la ubicación para saltar a la línea del código.",
    },
  ];

  return (
    <div
      className="
        fixed inset-0 z-50 flex items-center justify-center p-4
        bg-black/50 backdrop-blur-sm
      "
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Guía rápida"
    >
      {/* Contenido del modal */}
      <div
        className="
          relative w-full max-w-2xl rounded-2xl bg-white
          border-1 border-blue-600 shadow-2xl
          p-6 sm:p-8 animate-fade-in 
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Guía rápida</h2>
            <p className="mt-1 text-sm text-gray-600">
              Cómo usar el analizador en pocos pasos.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              rounded-lg p-2 text-gray-500 transition
              hover:text-red-700 cursor-pointer text-lg
              focus:outline-none focus:ring-2 focus:ring-blue-200 
            "
            aria-label="Cerrar"
            title="Cerrar"
          >
            🗙
          </button>
        </div>

        {/* Intro */}
        <p className="mt-4 text-sm text-gray-700">
          Esta herramienta analiza código de forma estática para detectar
          posibles problemas de estilo, seguridad, complejidad, tipado y código
          sin uso.
        </p>

        {/* Pasos */}
        <div className="mt-5 space-y-3">
          {steps.map((s, idx) => (
            <div
              key={s.title}
              className="flex gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {idx + 1}
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                <p className="mt-0.5 text-sm text-gray-700">{s.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Nota */}
        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          <span className="font-semibold">Nota:</span> si no seleccionas ningún
          análisis, se ejecutarán todos por defecto.
        </div>

        {/* Botón */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="
              rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm
              hover:bg-blue-700 transition cursor-pointer
              focus:outline-none focus:ring-2 focus:ring-blue-200
            "
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}