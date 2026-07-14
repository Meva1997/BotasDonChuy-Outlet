"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { fadeUp, EASE_LUXE } from "@/lib/ui/motion";

interface CategoryCardProps {
  title: string;
  count: number;
  href: string;
  imageSrc?: string;
}

export default function CategoryCard({
  title,
  count,
  href,
  imageSrc,
}: CategoryCardProps) {
  return (
    <motion.div
      variants={fadeUp}
      transition={{ duration: 0.6, ease: EASE_LUXE }}
    >
      <Link href={href} className="block w-full mt-20">
        <motion.article
          whileHover={{ y: -4 }}
          transition={{ duration: 0.35, ease: EASE_LUXE }}
          className="relative w-full h-56 sm:h-64 md:h-80 rounded-sm overflow-hidden group border border-amber-400/10 hover:border-amber-400/30 transition-colors duration-300"
          style={{ backgroundColor: "#2c1f10" }}
        >
          <motion.div
            className="absolute inset-0"
            whileHover={{ scale: 1.06 }}
            transition={{ duration: 0.6, ease: EASE_LUXE }}
          >
            {imageSrc && (
              <Image
                src={imageSrc}
                alt={title}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            )}
          </motion.div>

          {/* Grain texture overlay — matches outlet card atmosphere */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E\")",
              backgroundSize: "128px 128px",
            }}
          />

          <div className="absolute inset-0 bg-linear-to-t from-black/75 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-amber-400/0 group-hover:bg-amber-400/5 transition-colors duration-300" />

          <footer className="absolute bottom-0 left-0 right-0 px-5 py-5 flex items-end justify-between">
            <span className="text-amber-50 font-serif text-xl group-hover:text-amber-200 transition-colors duration-200">
              {title}
            </span>
            <span className="text-amber-100/40 text-xs tracking-[0.2em] uppercase flex items-center gap-1.5">
              {count} Piezas
              <motion.span
                aria-hidden="true"
                whileHover={{ x: 3 }}
                className="inline-block"
              >
                →
              </motion.span>
            </span>
          </footer>
        </motion.article>
      </Link>
    </motion.div>
  );
}
