import Link from "next/link";

const footerLinks = [
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
      { label: "Política de devoluciones", href: "/devoluciones" },
      { label: "Envíos", href: "/envios" },
    ],
  },
  {
    heading: "Contacto",
    links: [
      { label: "WhatsApp", href: "#" },
      { label: "Instagram", href: "#" },
      { label: "Facebook", href: "#" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-amber-900/40 mt-auto">
      <div className="max-w-6xl mx-auto px-8 py-16">

        {/* Top: logo + columns */}
        <div className="flex flex-col md:flex-row justify-between gap-12">

          {/* Brand */}
          <div className="space-y-3">
            <p className="font-serif text-xl">
              <span className="text-amber-50">Botas Don Chuy </span>
              <span className="italic text-amber-400">Outlet</span>
            </p>
            <p className="text-xs text-amber-100/40 tracking-wide max-w-48">
              Piezas únicas. Sin reposición.
            </p>
          </div>

          {/* Link columns */}
          <div className="flex gap-16">
            {footerLinks.map(({ heading, links }) => (
              <div key={heading} className="space-y-4">
                <p className="text-xs tracking-[0.25em] uppercase text-amber-400/70">
                  {heading}
                </p>
                <ul className="space-y-3">
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
              </div>
            ))}
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-6 border-t border-amber-900/30 flex items-center justify-between">
          <p className="text-xs text-amber-100/30 tracking-wide">
            © {new Date().getFullYear()} Botas Don Chuy. Todos los derechos reservados.
          </p>
          <p className="text-xs text-amber-100/20 tracking-[0.2em] uppercase">
            Outlet
          </p>
        </div>

      </div>
    </footer>
  );
}
