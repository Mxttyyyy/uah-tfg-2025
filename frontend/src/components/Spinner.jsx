/**
 * Spinner simple para estados de carga.
 * - size: "sm" | "md" | "lg"
 * - label: texto que se muestra junto al icono
 */

import SpinnerIcon from "./icons/SpinnerIcon";

export default function Spinner({ size = "md", label = "Cargando..." }) {
  // Altura y anchura
  const sizeClass =
    size === "sm" ? "h-4 w-4" : size === "lg" ? "h-8 w-8" : "h-6 w-6";

  return (
    <div className="inline-flex items-center gap-2">
      {/* Icono */}
      <SpinnerIcon
        className={`
          animate-spin ${sizeClass}
          text-gray-300
          dark:text-neutral-300
        `}
      />
      
      {/* Mensaje */}
      <span className="text-sm text-gray-300 dark:text-neutral-300">
        {label}
      </span>
    </div>
  );
}