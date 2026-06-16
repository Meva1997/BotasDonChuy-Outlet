"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import CategoryCard from "../ui/CategoryCard";
import { fadeUp, staggerContainer, EASE_LUXE } from "@/lib/motion";

export default function Hero() {
  return (
    <main>
      {/* Hero section */}
      <section className="relative flex flex-col items-center justify-center text-center  min-h-[96vh]  px-8 gap-8 overflow-hidden">
        {/* Atmospheric vignette */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,#2c1a08_0%,transparent_60%)] pointer-events-none"
        />
        {/* Grain texture */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.15] pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E\")",
            backgroundSize: "128px 128px",
          }}
        />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="relative flex flex-col items-center gap-8"
        >
          {/* Eyebrow */}
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.6, ease: EASE_LUXE }}
            className="text-xs tracking-[0.35em] uppercase text-amber-400/60"
          >
            Liquidación Final · Sin Reposición
          </motion.p>

          {/* Title */}
          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.7, ease: EASE_LUXE }}
            className="font-serif font-bold leading-none text-amber-50"
            style={{ fontSize: "clamp(5rem, 12vw, 9rem)" }}
          >
            Botas Don Chuy
            <br />
            <span className="italic text-amber-100/90">Outlet</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.6, ease: EASE_LUXE }}
            className="space-y-1 text-amber-100/50 text-sm tracking-wide"
          >
            <p>Piezas únicas. Sin reposición.</p>
            <p>Cuando se acaba, se acaba.</p>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.6, ease: EASE_LUXE }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/outlet"
                className="inline-block text-xs tracking-[0.3em] uppercase border px-12 py-4 border-amber-400/70 text-amber-400 duration-300 mt-2 hover:bg-amber-400/10 transition-colors"
              >
                Ver Outlet
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          aria-hidden="true"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 w-px h-14 bg-linear-to-b from-amber-400/40 to-transparent [@media(max-height:800px)]:hidden"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </section>

      {/* Category cards */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto pb-24 px-4 sm:px-8"
      >
        <CategoryCard title="Botas" count={3} href="/botas" imageSrc="" />
        <CategoryCard
          title="Sombreros"
          count={3}
          href="/sombreros"
          imageSrc=""
        />
        <CategoryCard title="Ropa" count={3} href="/ropa" imageSrc="" />
      </motion.section>
    </main>
  );
}
