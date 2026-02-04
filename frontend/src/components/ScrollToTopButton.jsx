import { useEffect, useState } from "react";

export default function ScrollToTopButton({
  showAfterPx = 450,
  anchorId = "top",
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > showAfterPx);
    }

    onScroll(); // estado inicial
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [showAfterPx]);

  function scrollToTop() {
    // Si existe un ancla arriba, lo usamos
    const el = document.getElementById(anchorId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Subir arriba"
      className={`
          fixed bottom-6 right-6 z-50 rounded-full border border-gray-200 bg-white p-3.5 shadow-md transition
          hover:-translate-y-1.5 hover:text-blue-600 hover:ring-blue-600 hover:ring-2 hover:shadow-lg focus:outline-none cursor-pointer
      `}
    >
      {/* Flecha arriba (SVG inline) */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke="currentColor"
        class="size-6"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="m4.5 15.75 7.5-7.5 7.5 7.5"
        />
      </svg>
    </button>
  );
}
