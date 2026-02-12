import { useEffect, useState } from "react";
import QuickGuideModal from "./QuickGuideModal";
/**
 * Cabecera principal de la web.
 *
 * Muestra el logotipo y los enlaces de navegación principales.
 */

export default function Header() {
  const [showGuide, setShowGuide] = useState(false);

  // Estado del tema (true => dark)
  const [isDark, setIsDark] = useState(false);

  // Inicializa el tema al montar el componente (localStorage -> prefers-color-scheme)
  useEffect(() => {
    const stored = localStorage.getItem("theme"); // "dark" | "light" | null
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    const shouldBeDark = stored ? stored === "dark" : prefersDark;

    setIsDark(shouldBeDark);
    document.documentElement.classList.toggle("dark", shouldBeDark);
  }, []);

  function toggleTheme() {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  }

  return (
    <>
      <header className="relative bg-white/70 shadow-sm dark:bg-neutral-950/70 dark:shadow-none">
        {/* Glow azul animado bajo el header */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-6 header-glow"
          aria-hidden="true"
        />

        {/* Contenedor más estrecho => logo y links */}
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:max-w-5xl">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <a
              href="#"
              aria-label="Homepage"
              className="flex items-center transition-transform duration-300 hover:scale-110"
            >
              <img
                src="/analyth.png"
                alt="Logo"
                className="h-25 mt-2.5 w-auto"
              />
            </a>

            {/* Links + botón tema */}
            <div className="flex items-center gap-7">
              <nav aria-label="Global">
                <ul className="flex items-center gap-8 text-sm">
                  <li>
                    <a
                      href="#"
                      className={`
                      text-gray-700 transition hover:text-blue-700 text-lg font-semibold
                      dark:text-neutral-200 dark:hover:text-sky-400
                    `}
                      onClick={(e) => {
                        e.preventDefault();
                        setShowGuide(true);
                      }}
                    >
                      Guía rápida
                    </a>
                  </li>

                  <li>
                    <a
                      href="https://github.com/Mxttyyyy/uah-tfg-2025/tree/development"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`
                      text-gray-700 transition hover:text-blue-700 text-lg font-semibold
                      dark:text-neutral-200 dark:hover:text-sky-400
                    `}
                    >
                      GitHub
                    </a>
                  </li>
                </ul>
              </nav>

              {/* Separador del toggle */}
              <span
                className="h-8 w-px bg-gray-300 dark:bg-neutral-700"
                aria-hidden="true"
              />

              <button
                type="button"
                onClick={toggleTheme}
                className={`
                      inline-flex items-center gap-2 rounded-full
                      border border-gray-200 bg-gray-100 px-4 py-1.5
                      text-sm font-semibold text-gray-700
                      hover:bg-gray-200 transition cursor-pointer
                      dark:border-neutral-800 dark:bg-neutral-900/60
                      dark:text-neutral-200 dark:hover:bg-neutral-900
                    `}
                title={
                  isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"
                }
                aria-label={
                  isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"
                }
              >
                {/* Icono del tema */}
                <span className="text-base leading-none" aria-hidden="true">
                  {isDark ? (
                    // SOL (para volver a claro)
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-5 w-5 text-amber-400"
                    >
                      <path
                        d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41
                          1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    // LUNA (para ir a oscuro)
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 512 512"
                      width="1em"
                      height="1em"
                    >
                      <path
                        fill="currentColor"
                        d="M152.62 126.77c0-33 4.85-66.35 17.23-94.77C87.54 67.83 32 151.89 32 247.38C32
                          375.85 136.15 480 264.62 480c95.49 0 179.55-55.54 215.38-137.85c-28.42
                          12.38-61.8 17.23-94.77 17.23c-128.47 0-232.61-104.14-232.61-232.61"
                      ></path>
                    </svg>
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Separador azul */}
        <div
          className={`
            h-[2px] w-full bg-gradient-to-r from-blue-700
            via-sky-400 to-blue-700 opacity-80
            dark:opacity-60
          `}
        />
      </header>

      <QuickGuideModal open={showGuide} onClose={() => setShowGuide(false)} />
    </>
  );
}
