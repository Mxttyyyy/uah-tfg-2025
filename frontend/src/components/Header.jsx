
export default function Header() {
  const links = [
    { label: "Guía rápida", href: "#" },
    { label: "Documentación", href: "#" },
    { label: "GitHub", href: "#" },
  ];

  return (
    <header className="relative bg-white shadow-sm ">
      {/* Glow azul animado bajo el header */ }
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-6 header-glow"
        aria-hidden="true"
      />
      {/* Contenedor más estrecho => logo y links */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:max-w-5xl">
        <div className="flex h-16 items-center justify-between">

          {/* Logo */}
          <a href="#" aria-label="Homepage" className="flex items-center">
            <img src="/analyth_logo.png" alt="Logo" className="h-13 w-auto" />
          </a>

          {/* Links derecha */}
          <nav aria-label="Global">
            <ul className="flex items-center gap-14 text-sm">
              {links.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-gray-600 transition hover:text-gray-900 text-lg font-semibold"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
      {/* Separador azul */}
      <div className="h-[2px] w-full bg-gradient-to-r from-blue-700 via-sky-400 to-blue-700 opacity-80" />
    </header>
  );
}
