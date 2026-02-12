import { useEffect } from "react";
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

  // Eliminar el scroll cuando se abre el modal
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  // Pasos de la guía rápida. El texto se mostrará dividido en bullets por frases.
  const steps = [
    {
      title: "Pega tu código",
      text:
        "Copia y pega tu código en el área principal. Se recomienda pegar el archivo completo para obtener resultados más fiables. " +
        'Pulsa el botón "Limpiar" para vaciar el editor. ' +
        'También puedes usar el botón "Cargar ejemplo" para probar la herramienta rápidamente.',
    },
    {
      title: "Configura el análisis",
      text:
        "Selecciona el lenguaje y marca los análisis que quieres ejecutar. " +
        "También puedes ajustar las opciones avanzadas de cada herramienta y el timeout si lo necesitas. " +
        'Si te has equivocado, usa el botón "Restablecer todas las opciones" para volver a la configuración inicial.',
    },
    {
      title: "Pulsa Analizar",
      text: "Se mostrará un resumen de los problemas encontrados (agrupados por severidad) y los resultados por módulo (Ruff, Bandit, Radon, Vulture, Mypy).",
    },
    {
      title: "Revisa y navega",
      text:
        "Revisa los resultados y la información de cada problema (detalles, sugerencias y, si están disponibles, enlaces de ayuda). " +
        "Pulsa sobre la ubicación de cada problema para saltar a la línea correspondiente en el código.",
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
          relative w-full max-w-3xl rounded-2xl bg-white
          border border-gray-200 shadow-2xl max-h-[90vh]
          p-0 animate-fade-in
          flex flex-col
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* -------------------- HEADER FIJO -------------------- */}
        <div className="shrink-0 px-6 pt-6 sm:px-8 sm:pt-8 bg-white rounded-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Guía rápida
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Cómo usar{" "}
                <span className="font-semibold text-blue-700 ">Analyth</span> en
                pocos pasos.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="
                rounded-lg text-gray-500 transition
                hover:text-red-700 cursor-pointer text-lg
              "
              aria-label="Cerrar"
              title="Cerrar"
            >
              🗙
            </button>
          </div>

          {/* Intro */}
          <p className="mt-4 text-sm text-gray-700 leading-relaxed">
            Esta herramienta analiza código de forma estática para detectar
            posibles problemas de estilo, seguridad, complejidad, tipado y
            código sin uso.
          </p>

          {/* Separador suave */}
          <div className="mt-5 h-px w-full bg-gray-200" />
        </div>

        {/* Pasos */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 sm:px-8 py-5 space-y-4 pr-2 scrollbar-modern">
          {steps.map((s, idx) => (
            <div
              key={s.title}
              className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {idx + 1}
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{s.title}</p>

                {/* Texto del step en bullets por frases */}
                <div className="mt-1 space-y-1">
                  {String(s.text)
                    .split(". ")
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((sentence, i) => (
                      <div key={i} className="flex gap-2 text-sm text-gray-700">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gray-600" />
                        <p className="leading-relaxed">
                          {/[.!?]$/.test(sentence) ? sentence : `${sentence}.`}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* -------------------- FOOTER FIJO -------------------- */}
        <div className="shrink-0 px-6 pb-6 sm:px-8 sm:pb-8 bg-white rounded-2xl">
          <div className="h-px w-full bg-gray-200" />

          {/* Nota */}
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            <span className="font-semibold">Nota:</span> si no seleccionas
            ningún análisis, se ejecutarán todos por defecto.
          </div>

          {/* Botón */}
          <div className="mt-4 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="
                rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm
                hover:bg-blue-700 transition cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-blue-200
              "
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
