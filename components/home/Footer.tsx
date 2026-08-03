"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/ui/motion";
import { useBrand } from "@/components/providers/BrandProvider";
import { CATEGORIES } from "@/lib/domain/categories";

// Secciones estáticas; "Contacto" se arma dentro del componente porque su link
// depende de la marca resuelta (brand.instagram).
const FOOTER_SECTIONS = [
  {
    heading: "Tienda",
    links: CATEGORIES.map((c) => ({ label: c.plural, href: c.href })),
  },
  {
    heading: "Información",
    links: [
      { label: "Sobre nosotros", href: "/nosotros" },
      // Única entrada global al seguimiento (Fase 17). Va aquí y no en el
      // NavHeader ni en el home porque /pedido/<token> necesita un UUID que nadie
      // teclea: sin memoria en el navegador, el acceso útil es el enlace del
      // correo, y el Footer es donde la gente busca las páginas de servicio.
      { label: "Seguimiento de pedido", href: "/pedido" },
      { label: "Términos y condiciones", href: "/terminos" },
      { label: "Política de privacidad", href: "/privacidad" },
      { label: "Envíos", href: "/envios" },
    ],
  },
];

export default function Footer() {
  const brand = useBrand();
  const sections = [
    ...FOOTER_SECTIONS,
    {
      heading: "Contacto",
      links: [{ label: "Instagram", href: brand.instagram }],
    },
  ];

  return (
    <footer className="border-t border-amber-600 mt-auto">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={fadeUp}
        transition={{ duration: 0.6 }}
        className="max-w-6xl mx-auto px-8 py-12 md:py-16"
      >
        {/* Top: marca + columnas de links */}
        <div className="flex flex-col md:flex-row md:justify-between gap-10 md:gap-12">
          {/* Marca */}
          <div className="space-y-3 shrink-0">
            <p className="font-serif text-xl">
              <span className="text-amber-50">{brand.namePrimary} </span>
              <span className="italic text-amber-400">{brand.nameAccent}</span>
            </p>
            <p className="text-xs text-amber-100/40 tracking-wide max-w-48">
              {brand.taglineLines[0]}
            </p>
          </div>

          {/* Columnas de links — 2 cols en móvil, 3 en sm+ */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-10">
            {sections.map(({ heading, links }) => (
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
                        target={label === "Instagram" ? "_blank" : undefined}
                        rel={label === "Instagram" ? "noopener noreferrer" : undefined}
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
            © {new Date().getFullYear()} {brand.name}. Todos los derechos
            reservados.
          </p>
          <Link
            href="/admin"
            aria-label="Acceso administrador"
            className="text-xs text-amber-100/20 tracking-[0.2em] uppercase hover:text-amber-100/50 transition-colors duration-300"
          >
            Outlet
          </Link>
        </div>
      </motion.div>
    </footer>
  );
}
