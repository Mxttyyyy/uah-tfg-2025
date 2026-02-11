import { useEffect, useState } from "react";

/**
 * Botón flotante para volver al inicio de la página.
 *
 * El botón se muestra únicamente cuando el usuario ha realizado
 * un scroll vertical superior a un umbral definido.
 *
 * Props:
 * - showAfterPx: number (distancia en píxeles a partir de la cual se muestra el botón)
 * - anchorId: string (id del elemento al que desplazarse; opcional)
 */
export default function ScrollToTopButton({
  showAfterPx = 500,
  anchorId = "top",
}) {
  // Controla la visibilidad del botón en función del scroll
  const [visible, setVisible] = useState(false);

  /**
   * Efecto encargado de registrar y limpiar el listener de scroll.
   */
  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > showAfterPx);
    }

    // Sincronizamos el estado inicial con la posición actual
    onScroll();

    // Registramos el listener de scroll
    window.addEventListener("scroll", onScroll);

    // Limpieza del listener al desmontar el componente
    return () => window.removeEventListener("scroll", onScroll);
  }, [showAfterPx]);

  /**
   * Realiza el desplazamiento hacia la parte superior de la página.
   */
  function scrollToTop() {
    // Si existe un ancla, lo usamos
    const anchorElement = document.getElementById(anchorId);
    if (anchorElement) {
      anchorElement.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Si no debe mostrarse, no se renderiza el componente
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Subir arriba"
      className={`
        fixed bottom-6 xl:bottom-10 xl:right-10 z-50 rounded-full border border-gray-500
        bg-white p-3.5 shadow-lg transition cursor-pointer
        hover:-translate-y-1.5 hover:text-blue-600 hover:ring-blue-600 hover:ring-1 hover:shadow-xl focus:outline-none 
      `}
    >
      {/* Icono de flecha hacia arriba */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="2"
        stroke="currentColor"
        class="size-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m4.5 15.75 7.5-7.5 7.5 7.5"
        />
      </svg>
    </button>
  );
}
