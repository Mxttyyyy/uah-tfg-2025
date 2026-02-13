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
export default function Alert({ variant = "info", title, children }) {

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
      </div>
    </div>
  );
}

/* ----------------------------- Funciones auxiliares ---------------------------- */

/**
 * Estilos según el tipo de mensaje (variant)
 */
function getVariantStyles(variant) {
  if (variant === "error") {
    return {
      container: "border-red-200 bg-red-100 dark:border-red-900/50 dark:bg-red-950/35",
      title: "text-red-900 dark:text-red-200",
      text: "text-red-800 dark:text-red-200/90",
      icon: "text-red-700 dark:text-red-300",
    };
  }

  if (variant === "warning") {
    return {
      container: "border-yellow-200 bg-yellow-50 dark:border-amber-900/50 dark:bg-amber-950/30",
      title: "text-yellow-900 dark:text-amber-200",
      text: "text-yellow-800 dark:text-amber-200/90",
      icon: "text-yellow-700 dark:text-amber-300",
    };
  }

  if (variant === "success") {
    return {
      container: "border-green-200 bg-green-100 dark:border-emerald-900/50 dark:bg-emerald-950/40",
      title: "text-green-900 dark:text-emerald-200",
      text: "text-green-800 dark:text-emerald-200/90",
      icon: "text-green-700 dark:text-emerald-300",
    };
  }

  // info (por defecto)
  return {
    container: "border-blue-200 bg-blue-50 dark:border-sky-900/50 dark:bg-sky-950/30",
    title: "text-blue-900 dark:text-sky-200",
    text: "text-blue-800 dark:text-sky-200/90",
    icon: "text-blue-700 dark:text-sky-300",
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