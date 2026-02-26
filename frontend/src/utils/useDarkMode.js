import { useEffect, useState } from "react";

/**
 * Hook para gestionar tema oscuro/claro:
 * - Lee el tema guardado en localStorage (si existe).
 * - Si no hay tema guardado, usa la preferencia del sistema (prefers-color-scheme).
 * - Aplica la clase "dark" en <html> para que Tailwind active los estilos dark:*
 * - Devuelve:
 *   - isDark: boolean (estado actual)
 *   - toggleDark: function (alternar tema)
 */
export function useDarkMode() {
  // Estado que indica si el modo oscuro está activado
  const [isDark, setIsDark] = useState(false);

  // Se ejecuta solo una vez al montar el componente
  useEffect(() => {

    // Tema guardado por el usuario (ej: "dark" o "light")
    const saved = localStorage.getItem("theme");
     // Preferencia del sistema operativo / navegador (true si el sistema está en modo oscuro)
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;

    const initial = saved ? saved === "dark" : prefersDark;
    setIsDark(initial);
    document.documentElement.classList.toggle("dark", initial);
  }, []);

  // Alternar tema
  function toggleDark() {
    setIsDark((prev) => {
      const next = !prev; // Tema contrario
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  }

  return { isDark, toggleDark };
}