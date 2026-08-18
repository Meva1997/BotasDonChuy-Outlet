"use client";

import { motion } from "framer-motion";
import { fadeUp, EASE_LUXE } from "@/lib/ui/motion";

interface LegalSection {
  /**
   * Ancla estable de la sección. Va en el `id` del `<section>` y en el índice.
   * Existe porque anclar por el índice del array rompe todo enlace ya compartido
   * (`/terminos#section-2`) en cuanto se inserta una sección nueva — y estos
   * documentos se renumeran cada vez que cambia la ley o la operación.
   */
  slug: string;
  title: string;
  body: string[];
}

interface HighlightBlock {
  label: string;
  text: React.ReactNode;
}

interface CalloutBlock {
  heading: string;
  text: string;
}

interface LegalLayoutProps {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  highlight: HighlightBlock;
  callout?: CalloutBlock;
  sections: LegalSection[];
  footerNote: string;
}

export default function LegalLayout({
  eyebrow,
  title,
  lastUpdated,
  highlight,
  callout,
  sections,
  footerNote,
}: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-tobacco-950 py-16 px-4 my-20">
      <div className="max-w-5xl mx-auto">
        <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-12">
          {/* Sticky index — desktop only */}
          <motion.aside
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden lg:block"
          >
            <nav
              aria-label="Índice del documento"
              className="sticky top-24 space-y-1"
            >
              <p className="font-sans text-[10px] tracking-[0.25em] uppercase text-amber-400/50 mb-4">
                Índice
              </p>
              <ol className="space-y-2.5 list-none border-l border-amber-900/40">
                {sections.map(({ slug, title: sectionTitle }) => (
                  <li key={slug} className="pl-4 -ml-px border-l border-transparent">
                    <a
                      href={`#${slug}`}
                      className="font-sans text-[11px] leading-snug text-amber-100/35 hover:text-amber-300 transition-colors duration-200 line-clamp-2"
                    >
                      {sectionTitle}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </motion.aside>

          <div className="space-y-12 min-w-0">
            {/* Header */}
            <motion.header
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ duration: 0.6, ease: EASE_LUXE }}
              className="space-y-4 border-b border-amber-900/40 pb-10"
            >
              <p className="text-sm tracking-[0.3em] uppercase text-amber-400/90">
                {eyebrow}
              </p>
              <h1 className="font-serif text-4xl sm:text-5xl text-amber-50 leading-snug">
                {title}
              </h1>
              <p className="text-amber-200/70 text-base">
                Última actualización: {lastUpdated}
              </p>
              <div className="mt-6 bg-amber-400/8 border border-amber-400/20 p-5 rounded-sm">
                <p className="text-amber-100/90 text-base leading-relaxed">
                  <span className="text-amber-400 font-semibold">
                    {highlight.label}
                  </span>{" "}
                  {highlight.text}
                </p>
              </div>
            </motion.header>

            {/* Callout */}
            {callout && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, ease: EASE_LUXE }}
                className="flex items-start gap-4 border border-amber-900/40 bg-stone-900/40 p-6"
              >
                <div className="shrink-0 w-px self-stretch bg-amber-400/40" />
                <div className="space-y-2">
                  <p className="font-serif text-xl text-amber-300 font-semibold">
                    {callout.heading}
                  </p>
                  <p className="text-base text-amber-100/80 leading-relaxed">
                    {callout.text}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Sections */}
            <div className="space-y-10">
              {sections.map(({ slug, title: sectionTitle, body }) => (
                <motion.section
                  key={slug}
                  id={slug}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, ease: EASE_LUXE }}
                  className="space-y-3 scroll-mt-24"
                >
                  <h2 className="font-serif text-xl sm:text-2xl font-semibold text-amber-300">
                    {sectionTitle}
                  </h2>
                  {body.map((paragraph, j) => (
                    <p
                      key={j}
                      className="text-base text-amber-100/80 leading-relaxed sm:leading-loose whitespace-pre-line"
                    >
                      {paragraph}
                    </p>
                  ))}
                </motion.section>
              ))}
            </div>

            {/* Footer note */}
            <div className="border-t border-amber-900/30 pt-8 text-center">
              <p className="text-sm text-amber-200/60 tracking-wide">
                {footerNote}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
