import InfoIcon from "./icons/InfoIcon";
import SuccessIcon from "./icons/SuccessIcon";
import WarningIcon from "./icons/WarningIcon";
import ErrorIcon from "./icons/ErrorIcon";

/**
 * Alerta simple para mostrar errores/avisos/info.
 *
 * Props:
 * - variant: "error" | "warning" | "info" | "success"
 * - title: string (opcional)
 * - children: contenido (mensaje)
 * - onClose: function (opcional) -> si se pasa, muestra botón de cerrar
 */
export default function Alert({ variant = "info", title, children, onClose }) {

  // Estilos según el tipo de alerta
  const styles = getVariantStyles(variant);

  return (
    <div className={`rounded-lg border p-4 ${styles.container}`} role="alert">
      <div className="flex items-start gap-3">

        {/* Icono */}
        <span className={`mt-0.5 ${styles.icon}`} aria-hidden="true">
          {getVariantIcon(variant)}
        </span>

        {/* Contenido (título + mensaje) */}
        <div className="min-w-0 flex-1">
          {title ? (
            <div className={`font-semibold ${styles.title} pb-1.5`}>
              {title}
            </div>
          ) : null}
          <div className={`text-sm ${styles.text}`}>{children}</div>
        </div>

        {/* Botón de cierre */}
        {typeof onClose === "function" ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-1 py-0 text-md text-gray-600  hover:text-red-600 cursor-pointer"
            aria-label="Cerrar"
            title="Cerrar"
          >
            🗙
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Estilos según el tipo de mensaje (variant)
 */
function getVariantStyles(variant) {
  if (variant === "error") {
    return {
      container: "border-red-200 bg-red-50",
      title: "text-red-900",
      text: "text-red-800",
      icon: "text-red-700",
    };
  }

  if (variant === "warning") {
    return {
      container: "border-yellow-200 bg-yellow-50",
      title: "text-yellow-900",
      text: "text-yellow-800",
      icon: "text-yellow-700",
    };
  }

  if (variant === "success") {
    return {
      container: "border-green-200 bg-green-50",
      title: "text-green-900",
      text: "text-green-800",
      icon: "text-green-700",
    };
  }

  // info (por defecto)
  return {
    container: "border-blue-200 bg-blue-50",
    title: "text-blue-900",
    text: "text-blue-800",
    icon: "text-blue-700",
  };
}

/**
 * Iconos según el tipo de mensaje
 */
function getVariantIcon(variant) {
  const iconClass = "h-6 w-6";
  if (variant === "error") return <ErrorIcon className={iconClass} />;
  if (variant === "warning") return <WarningIcon className={iconClass} />;
  if (variant === "success") return <SuccessIcon className={iconClass} />;
  return <InfoIcon className={iconClass} />;
}
