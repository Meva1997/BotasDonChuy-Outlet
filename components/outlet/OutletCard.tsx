import Link from "next/link";
import { motion } from "framer-motion";
import { ImageOff } from "lucide-react";
import { fadeUp, EASE_LUXE } from "@/lib/ui/motion";
import { formatPrice } from "@/lib/utils";

interface OutletCardProps {
  slug: number | string;
  name: string;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  stock: number | "ultima";
  imageSrc?: string;
}

export default function OutletCard({
  slug,
  name,
  originalPrice,
  salePrice,
  discountPercent,
  stock,
  imageSrc,
}: OutletCardProps) {
  const isLastPiece = stock === "ultima";
  const isOutOfStock = stock === 0;

  return (
    <motion.div
      variants={fadeUp}
      transition={{ duration: 0.55, ease: EASE_LUXE }}
      className="h-full"
    >
      <Link href={`/outlet/${slug}/producto`} className="block h-full">
        <motion.div
          whileHover={isOutOfStock ? undefined : { y: -6 }}
          transition={{ duration: 0.35, ease: EASE_LUXE }}
          className={`group relative flex flex-col h-full bg-stone-900 border border-amber-400/10 rounded-sm overflow-hidden transition-[border-color,box-shadow] duration-300 cursor-pointer ${
            isOutOfStock
              ? "opacity-60"
              : "hover:border-amber-400/35 hover:shadow-[0_18px_40px_-20px_rgba(251,191,36,0.25)]"
          }`}
        >
          {/* Image / Stamp area */}
          <div
            className="relative w-full aspect-square overflow-hidden"
            style={{
              backgroundColor: "#1c1209",
            }}
          >
            {/* Image content — desaturated as a unit when out of stock */}
            <div className={`absolute inset-0 ${isOutOfStock ? "grayscale" : ""}`}>
              {/* Backdrop: blurred/scaled copy of the same image, fills the space a
                  portrait photo leaves empty under object-fit: contain (no crop, no
                  stretch on the real photo — see OutletCard.tsx image-fit decision). */}
              {imageSrc && (
                <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
                  <div
                    className="absolute inset-0 scale-125"
                    style={{
                      backgroundImage: `url(${imageSrc})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      filter: "blur(28px) saturate(1.15)",
                    }}
                  />
                  <div className="absolute inset-0 bg-stone-950/55" />
                </div>
              )}

              <motion.div
                className="absolute inset-0"
                style={{
                  backgroundImage: imageSrc ? `url(${imageSrc})` : undefined,
                  backgroundSize: "contain",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
                whileHover={isOutOfStock ? undefined : { scale: 1.06 }}
                transition={{ duration: 0.6, ease: EASE_LUXE }}
              />

              {/* Sin imagen — mismo fallback que ImageCarousel: vignette + textura + ImageOff.
                  Solo se pinta cuando falta la foto real; sobre una imagen real estas capas
                  opacas la taparían por completo (ver ImageCarousel.tsx, rama sin imagen). */}
              {!imageSrc && (
                <>
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#2c1a08_0%,#0d0a06_70%)] pointer-events-none" />
                  <div
                    className="absolute inset-0 opacity-30 pointer-events-none"
                    style={{
                      backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E\")",
                      backgroundSize: "128px 128px",
                    }}
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <ImageOff
                      className="h-8 w-8 text-amber-100/20"
                      strokeWidth={1.25}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Out-of-stock scrim: darkens the photo further, sits under the badges */}
            {isOutOfStock && (
              <div
                className="absolute inset-0 bg-stone-950/45 pointer-events-none"
                aria-hidden="true"
              />
            )}

            {/* Discount tag */}
            <div className="absolute top-2.5 left-2.5 bg-stone-950/80 border border-amber-400/30 px-2 py-1 backdrop-blur-sm">
              <span className="font-sans text-amber-400 text-[10px] tracking-[0.15em] font-medium">
                −{discountPercent}%
              </span>
            </div>

            {/* Last piece ribbon — opaque stone backdrop (not amber-tinted) so it
                stays legible over warm leather/tan photos; glow keeps the urgency
                accent that a translucent amber wash used to (but couldn't deliver
                consistently across photo tones). */}
            {isLastPiece && (
              <div className="absolute top-2.5 right-2.5 bg-stone-950/85 border border-amber-400/50 px-2 py-1 backdrop-blur-sm shadow-[0_0_12px_-2px_rgba(251,191,36,0.5)]">
                <span className="font-sans text-amber-300 text-[9px] tracking-[0.18em] uppercase">
                  Última pieza
                </span>
              </div>
            )}

            {/* Agotado stamp — echoes EmptyState.tsx's rubber-stamp motif, legible tone */}
            {isOutOfStock && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                aria-hidden="true"
              >
                <div className="border border-amber-100/25 bg-stone-950/50 px-3 py-1.5 rotate-[-4deg]">
                  <span className="font-sans text-amber-100/70 text-[10px] tracking-[0.3em] uppercase">
                    Agotado
                  </span>
                </div>
              </div>
            )}

            {/* Bottom fade into card */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-linear-to-t from-stone-900 to-transparent pointer-events-none" />
          </div>

          {/* Card body */}
          <div className="px-3 sm:px-4 pt-3 pb-4 flex flex-col gap-2 min-w-0">
            {/* Product name */}
            <h3 className="font-serif text-amber-50 text-base leading-snug line-clamp-2 min-h-11 group-hover:text-amber-200 transition-colors duration-200">
              {name}
            </h3>

            {/* Price row — stacked on narrow phones (2-col grid leaves ~150px
                per card) so the struck-through price never fights the big
                sale price for width; side-by-side once a row has room. */}
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3 min-w-0">
              <span className="font-sans text-amber-100/35 text-[11px] sm:text-xs line-through truncate">
                {formatPrice(originalPrice)}
              </span>
              <span className="font-serif text-amber-400 text-xl sm:text-2xl leading-none truncate">
                {formatPrice(salePrice)}
              </span>
            </div>

            {/* Stock indicator — siempre renderizado para reservar la misma altura */}
            <p
              className={`font-sans text-xs tracking-wide truncate ${
                isOutOfStock ? "text-amber-100/30" : "text-amber-100/40"
              }`}
            >
              {isOutOfStock
                ? "Agotado"
                : isLastPiece
                  ? " "
                  : `Solo ${stock} disponibles`}
            </p>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
