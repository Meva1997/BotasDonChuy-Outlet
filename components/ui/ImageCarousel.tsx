"use client";

import { useState } from "react";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { EASE_LUXE } from "@/lib/ui/motion";

export interface CarouselImage {
  url: string;
  alt?: string;
}

interface ImageCarouselProps {
  images: CarouselImage[];
  /** Clases extra para el marco (p. ej. sizing). Se combinan con las base. */
  className?: string;
  /**
   * Overlays absolutos dentro del marco (badges, etiquetas). El consumidor los
   * posiciona; se pintan por encima de la imagen y por debajo de los controles.
   */
  children?: React.ReactNode;
  /** `sizes` para next/image (fill). Ajústalo al ancho real de render. */
  sizes?: string;
}

/**
 * Carousel de imágenes reutilizable (luxury dark). Flechas laterales + puntos.
 * - 1 imagen → sin controles. 0 imágenes → placeholder degradado.
 * - Transición con framer-motion (respeta prefers-reduced-motion).
 * - Flechas y puntos son botones reales (accesibles); ←/→ navegan cuando el
 *   carousel tiene el foco. Copy en español.
 */
export default function ImageCarousel({
  images,
  className = "",
  children,
  sizes = "(max-width: 640px) 100vw, 400px",
}: ImageCarouselProps) {
  const reduceMotion = useReducedMotion();
  const [[index, direction], setState] = useState<[number, number]>([0, 0]);

  const count = images.length;
  const hasMultiple = count > 1;
  // El índice puede quedar fuera de rango si la galería encoge; lo acotamos.
  const safeIndex = count > 0 ? ((index % count) + count) % count : 0;
  const current = images[safeIndex];

  function paginate(dir: number) {
    if (count === 0) return;
    setState(([i]) => [i + dir, dir]);
  }

  function goTo(target: number) {
    // La dirección se compara contra el índice MOSTRADO (safeIndex), no el crudo
    // acumulado: tras un wrap (i=3 mostrando la 0), un punto animaría al revés.
    setState(() => [target, target > safeIndex ? 1 : -1]);
  }

  const variants: Variants = {
    enter: (dir: number) => ({
      x: reduceMotion ? 0 : dir >= 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({
      x: reduceMotion ? 0 : dir >= 0 ? "-100%" : "100%",
      opacity: 0,
    }),
  };

  const frameCls = [
    "group relative w-full aspect-square overflow-hidden rounded-sm border border-amber-400/15",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <div
        role="group"
        aria-roledescription="carrusel"
        aria-label={
          count > 0 ? `Imagen ${safeIndex + 1} de ${count}` : "Sin imágenes"
        }
        tabIndex={hasMultiple ? 0 : -1}
        onKeyDown={(e) => {
          if (!hasMultiple) return;
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            paginate(-1);
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            paginate(1);
          }
        }}
        className={frameCls}
        style={{ backgroundColor: "#1c1209" }}
      >
        {current ? (
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={safeIndex}
              className="absolute inset-0"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { duration: 0.45, ease: EASE_LUXE },
                opacity: { duration: 0.3 },
              }}
            >
              <Image
                src={current.url}
                alt={current.alt ?? ""}
                fill
                sizes={sizes}
                className="object-cover"
                draggable={false}
              />
            </motion.div>
          </AnimatePresence>
        ) : (
          // Sin imágenes — degradado + icono, mismo tono luxury.
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,#2c1a08_0%,#0d0a06_70%)]"
          >
            <ImageOff className="h-8 w-8 text-amber-100/20" strokeWidth={1.25} />
          </div>
        )}

        {/* Overlays del consumidor (badges, etiquetas). */}
        {children}

        {/* Flechas — solo con 2+ imágenes. */}
        {hasMultiple && (
          <>
            <button
              type="button"
              aria-label="Imagen anterior"
              onClick={() => paginate(-1)}
              className="absolute left-2.5 top-1/2 z-20 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-amber-400/25 bg-stone-950/60 text-amber-100/80 backdrop-blur-sm transition-colors hover:border-amber-400/60 hover:text-amber-50 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Imagen siguiente"
              onClick={() => paginate(1)}
              className="absolute right-2.5 top-1/2 z-20 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-amber-400/25 bg-stone-950/60 text-amber-100/80 backdrop-blur-sm transition-colors hover:border-amber-400/60 hover:text-amber-50 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Puntos — solo con 2+ imágenes. */}
      {hasMultiple && (
        <div className="mt-3 flex items-center justify-center gap-2">
          {images.map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              aria-label={`Ir a la imagen ${i + 1}`}
              aria-current={i === safeIndex}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                i === safeIndex
                  ? "w-5 bg-amber-400/80"
                  : "w-1.5 bg-amber-100/25 hover:bg-amber-100/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
