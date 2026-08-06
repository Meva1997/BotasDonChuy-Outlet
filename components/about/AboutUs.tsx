"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, EASE_LUXE } from "@/lib/ui/motion";
import { useBrand } from "@/components/providers/BrandProvider";
import { CATEGORIES } from "@/lib/domain/categories";

const STATS = [
  { value: "35+", label: "Años de experiencia" },
  { value: "Celaya", label: "Guanajuato, México" },
  { value: "3", label: "Líneas: caballero, dama y niños" },
];

// Cuadra es la marca insignia (se destaca aparte); el resto son marcas
// premium complementarias que también manejamos.
const FEATURED_BRAND = "Cuadra";
const OTHER_BRANDS = ["Rio Grande", "Becerro", "Barabas", "Canelo"];

export default function AboutUs() {
  const brand = useBrand();

  return (
    <div className="min-h-screen bg-tobacco-950 py-16 px-4 my-20">
      <div className="max-w-5xl mx-auto space-y-20">
        {/* Header */}
        <motion.header
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.6, ease: EASE_LUXE }}
          className="space-y-5 border-b border-amber-900/40 pb-10 text-center"
        >
          <p className="text-sm tracking-[0.3em] uppercase text-amber-400/90">
            Nuestra historia
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl text-amber-50 leading-snug">
            Sobre{" "}
            <span className="italic text-amber-400">{brand.namePrimary}</span>
          </h1>
          <p className="text-amber-100/60 text-base max-w-2xl mx-auto leading-relaxed">
            Tradición vaquera de Celaya, Guanajuato, con más de 35 años
            vistiendo a familias mexicanas con calidad premium.
          </p>
        </motion.header>

        {/* Stats */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="grid grid-cols-1 sm:grid-cols-3 gap-6"
        >
          {STATS.map(({ value, label }) => (
            <motion.div
              key={label}
              variants={fadeUp}
              transition={{ duration: 0.5, ease: EASE_LUXE }}
              className="border border-amber-900/40 bg-stone-900/40 px-6 py-8 text-center"
            >
              <p className="font-serif text-3xl text-amber-400">{value}</p>
              <p className="mt-2 text-xs tracking-[0.2em] uppercase text-amber-100/50">
                {label}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Quiénes somos */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: EASE_LUXE }}
          className="space-y-4"
        >
          <h2 className="font-serif text-2xl sm:text-3xl text-amber-300 font-semibold">
            Quiénes somos
          </h2>
          <p className="text-base text-amber-100/80 leading-relaxed sm:leading-loose">
            Somos un negocio situado en Celaya, Guanajuato, con más de 35 años
            de experiencia en el mercado de la moda vaquera. Vendemos artículos
            de alta calidad para caballero, dama y niños, trabajando de la mano
            con las mejores marcas del ramo.
          </p>
          <p className="text-base text-amber-100/80 leading-relaxed sm:leading-loose">
            A lo largo de estas décadas nos hemos ganado la confianza de
            nuestros clientes ofreciendo botas, sombreros y ropa vaquera de piel
            y materiales de la más alta calidad, con la atención y el trato
            cercano de un negocio familiar.
          </p>
        </motion.section>

        {/* Marcas */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: EASE_LUXE }}
          className="space-y-5"
        >
          <h2 className="font-serif text-2xl sm:text-3xl text-amber-300 font-semibold">
            Nuestras marcas
          </h2>
          <p className="text-base text-amber-100/80 leading-relaxed sm:leading-loose">
            Nuestra marca premium es{" "}
            <span className="text-amber-400 font-semibold">
              {FEATURED_BRAND}
            </span>
            , referente indiscutible de la bota y el calzado vaquero mexicano.
            Junto a ella, trabajamos con otras marcas reconocidas por su
            calidad:
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="text-sm tracking-[0.15em] uppercase border border-amber-400/70 text-amber-400 px-5 py-2.5">
              {FEATURED_BRAND}
            </span>
            {OTHER_BRANDS.map((name) => (
              <span
                key={name}
                className="text-sm tracking-widest uppercase border border-amber-900/40 text-amber-100/70 px-5 py-2.5"
              >
                {name}
              </span>
            ))}
          </div>
        </motion.section>

        {/* Qué es el outlet */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, ease: EASE_LUXE }}
          className="flex items-start gap-4 border border-amber-900/40 bg-stone-900/40 p-6"
        >
          <div className="shrink-0 w-px self-stretch bg-amber-400/40" />
          <div className="space-y-2">
            <p className="font-serif text-xl text-amber-300 font-semibold">
              ¿Qué es este outlet?
            </p>
            <p className="text-base text-amber-100/80 leading-relaxed">
              Esta página está pensada para mostrarte los modelos que aún
              tenemos en existencia: piezas de alta calidad que ya salieron de
              los inventarios de moda de nuestros distribuidores principales,
              pero que conservan la misma calidad premium de siempre. Son piezas
              únicas y, cuando se acaban, no se reponen.
            </p>
          </div>
        </motion.div>

        {/* Ubicación */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: EASE_LUXE }}
          className="space-y-5"
        >
          <h2 className="font-serif text-2xl sm:text-3xl text-amber-300 font-semibold text-center">
            Visítanos
          </h2>
          <p className="text-md tracking-[0.3em] uppercase text-amber-400/70 text-center">
            ¡Dónde está el torote!
          </p>
          <p className="text-base text-amber-100/80 leading-relaxed sm:leading-loose text-center max-w-2xl mx-auto">
            Allende 202, Colonia Centro, C.P. 38000, Celaya, Guanajuato.
          </p>
          <div className="border border-amber-900/40 overflow-hidden">
            <iframe
              title="Ubicación Botas Don Chuy"
              src="https://www.google.com/maps?q=Allende+202,+Centro,+38000+Celaya,+Guanajuato,+M%C3%A9xico&output=embed"
              className="w-full h-80 sm:h-96 grayscale-40 contrast-125"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </motion.section>

        {/* CTA categorías */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: EASE_LUXE }}
          className="text-center space-y-6 border-t border-amber-900/30 pt-12"
        >
          <p className="text-xs tracking-[0.3em] uppercase text-amber-400/70">
            Descubre el outlet
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {CATEGORIES.map((c) => (
              <Link
                key={c.type}
                href={c.href}
                className="text-xs tracking-[0.25em] uppercase border px-8 py-3.5 border-amber-400/70 text-amber-400 hover:bg-amber-400/10 transition-colors duration-300"
              >
                {c.plural}
              </Link>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
