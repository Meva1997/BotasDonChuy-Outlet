import Link from "next/link";
import { motion } from "framer-motion";
import { fadeUp, EASE_LUXE } from "@/lib/motion";

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
  const formatPrice = (n: number) =>
    n.toLocaleString("es-MX", { minimumFractionDigits: 0 });

  const isLastPiece = stock === "ultima";

  return (
    <motion.div variants={fadeUp} transition={{ duration: 0.55, ease: EASE_LUXE }}>
      <Link href={`/outlet/${slug}/producto`} className="block">
        <motion.div
          whileHover={{ y: -6 }}
          transition={{ duration: 0.35, ease: EASE_LUXE }}
          className="group relative flex flex-col bg-stone-900 border border-amber-400/10 rounded-sm overflow-hidden hover:border-amber-400/35 hover:shadow-[0_18px_40px_-20px_rgba(251,191,36,0.25)] transition-[border-color,box-shadow] duration-300 cursor-pointer"
        >
          {/* Image / Stamp area */}
          <div
            className="relative w-full aspect-4/3 overflow-hidden"
            style={{
              backgroundColor: "#1c1209",
            }}
          >
            <motion.div
              className="absolute inset-0"
              style={{
                backgroundImage: imageSrc ? `url(${imageSrc})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              whileHover={{ scale: 1.06 }}
              transition={{ duration: 0.6, ease: EASE_LUXE }}
            />

            {/* Gradient vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#2c1a08_0%,#0d0a06_70%)] pointer-events-none" />

            {/* Subtle grain texture overlay */}
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E\")",
                backgroundSize: "128px 128px",
              }}
            />

            {/* Discount tag */}
            <div className="absolute top-2.5 left-2.5 bg-stone-950/80 border border-amber-400/30 px-2 py-1 backdrop-blur-sm">
              <span className="font-sans text-amber-400 text-[10px] tracking-[0.15em] font-medium">
                −{discountPercent}%
              </span>
            </div>

            {/* Last piece ribbon */}
            {isLastPiece && (
              <div className="absolute top-2.5 right-2.5 bg-amber-400/15 border border-amber-400/40 px-2 py-1 backdrop-blur-sm">
                <span className="font-sans text-amber-300 text-[9px] tracking-[0.18em] uppercase">
                  Última pieza
                </span>
              </div>
            )}

            {/* Bottom fade into card */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-linear-to-t from-stone-900 to-transparent pointer-events-none" />
          </div>

          {/* Card body */}
          <div className="px-4 pt-3 pb-4 flex flex-col gap-2">
            {/* Product name */}
            <h3 className="font-serif text-amber-50 text-base leading-snug group-hover:text-amber-200 transition-colors duration-200">
              {name}
            </h3>

            {/* Price row */}
            <div className="flex items-baseline gap-3">
              <span className="font-sans text-amber-100/35 text-xs line-through">
                ${formatPrice(originalPrice)}
              </span>
              <span className="font-serif text-amber-400 text-2xl leading-none">
                ${formatPrice(salePrice)}
              </span>
            </div>

            {/* Stock indicator */}
            {!isLastPiece && (
              <p className="font-sans text-amber-100/40 text-xs tracking-wide">
                Solo {stock} disponibles
              </p>
            )}
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
