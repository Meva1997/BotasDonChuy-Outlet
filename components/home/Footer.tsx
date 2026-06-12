import Link from "next/link";

const FOOTER_SECTIONS = [
  {
    heading: "Tienda",
    links: [
      { label: "Botas", href: "/botas" },
      { label: "Sombreros", href: "/sombreros" },
      { label: "Ropa", href: "/ropa" },
    ],
  },
  {
    heading: "Información",
    links: [
      { label: "Sobre nosotros", href: "/nosotros" },
      { label: "Términos y condiciones", href: "/terminos" },
      { label: "Política de privacidad", href: "/privacidad" },
      { label: "Envíos", href: "/envios" },
    ],
  },
  {
    heading: "Contacto",
    links: [
      { label: "Instagram", href: "https://www.instagram.com/botasdonchuy/" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-amber-900/40 mt-auto">
      <div className="max-w-6xl mx-auto px-8 py-12 md:py-16">
        {/* Top: marca + columnas de links */}
        <div className="flex flex-col md:flex-row md:justify-between gap-10 md:gap-12">
          {/* Marca */}
          <div className="space-y-3 shrink-0">
            <p className="font-serif text-xl">
              <span className="text-amber-50">Botas Don Chuy </span>
              <span className="italic text-amber-400">Outlet</span>
            </p>
            <p className="text-xs text-amber-100/40 tracking-wide max-w-48">
              Piezas únicas. Sin reposición.
            </p>
          </div>

          {/* Columnas de links — 2 cols en móvil, 3 en sm+ */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-10">
            {FOOTER_SECTIONS.map(({ heading, links }) => (
              <section
                key={heading}
                aria-labelledby={`footer-${heading.toLowerCase()}`}
              >
                <h3
                  id={`footer-${heading.toLowerCase()}`}
                  className="text-xs tracking-[0.25em] uppercase text-amber-400/70 mb-4"
                >
                  {heading}
                </h3>
                <ul className="space-y-3 list-none">
                  {links.map(({ label, href }) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="text-sm text-amber-100/50 hover:text-amber-100/90 transition-colors duration-200"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>

        {/* Barra inferior */}
        <div className="mt-12 pt-6 border-t border-amber-900/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <p className="text-xs text-amber-100/30 tracking-wide">
            © {new Date().getFullYear()} Botas Don Chuy. Todos los derechos
            reservados.
          </p>
          <p className="text-xs text-amber-100/20 tracking-[0.2em] uppercase">
            Outlet
          </p>
        </div>
      </div>
    </footer>
  );
}
