"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { fadeUp, staggerContainer, EASE_LUXE } from "@/lib/ui/motion";
import { LEGAL_ENTITY } from "@/components/legal/entity";
import type { ProductType } from "@/lib/domain/categories";

// Misma textura de grano que Hero.tsx / CategoryCard.tsx, una sola vez aquí
// para no repetirla en cada tarjeta.
const GRAIN_TEXTURE =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E\")";

interface IconProps {
  className?: string;
}

// Ícono de línea por categoría — se muestra cuando la pieza todavía no tiene
// foto (mismo trazo que ImageOff en OutletCard: stroke 1.25, amber-100/20).
function BootIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 2v9.5c0 1-.4 1.6-1.2 2.4L3 15.7c-.6.6-1 1.4-1 2.3V21h13v-3.2c0-1-.4-1.9-1.1-2.6L11 12.3V2" />
      <path d="M2 21h19c.6 0 1-.7.6-1.2l-2.3-3" />
      <path d="M6 6h5" />
    </svg>
  );
}

function HatIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2.5 16.5c1.5-1 5.5-2 9.5-2s8 1 9.5 2" />
      <path d="M7 16c-.3-3.5 1.5-9.5 5-9.5s5.3 6 5 9.5" />
      <ellipse cx="12" cy="16.3" rx="9.5" ry="1.8" />
    </svg>
  );
}

function JacketIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M8 4L4 6.5V21h5V11l3 2.5 3-2.5v10h5V6.5L16 4l-4 2.5z" />
      <path d="M9 21V13" />
      <path d="M15 21V13" />
    </svg>
  );
}

const FALLBACK_ICON: Record<ProductType, typeof BootIcon> = {
  bota: BootIcon,
  sombrero: HatIcon,
  ropa: JacketIcon,
};

interface NewArrivalItem {
  id: string;
  category: ProductType;
  name: string;
  description: string;
  /** Foto real de la pieza en tienda. Sin ella se muestra el ícono de su categoría. */
  imageSrc?: string;
}

// Contenido estático: no hay backend para "nuevo en tienda física" — son
// piezas que solo existen en la sucursal, no en el catálogo online. Para
// anunciar una llegada nueva basta con agregar un objeto aquí; `imageSrc` es
// opcional y puede sumarse después, cuando haya foto.
const NEW_ARRIVALS: NewArrivalItem[] = [
  {
    id: "botas-avestruz",
    category: "bota",
    name: "Botas Cuadra piel de avestruz",
    description: "Punta cuadrada, horma cómoda. Negro y miel, tallas 25–29.",
  },
  {
    id: "sombrero-fieltro",
    category: "sombrero",
    name: "Sombrero de fieltro ala ancha",
    description:
      "Copa alta estilo texano, banda de piel. Ideal para el sol de temporada.",
  },
  {
    id: "chamarra-piel",
    category: "ropa",
    name: "Chamarra vaquera de piel",
    description:
      "Piel genuina forrada, corte clásico. Tallas chica a extra grande.",
  },
];

function NewArrivalCard({ item }: { item: NewArrivalItem }) {
  const FallbackIcon = FALLBACK_ICON[item.category];

  return (
    <motion.article
      variants={fadeUp}
      transition={{ duration: 0.55, ease: EASE_LUXE }}
      className="bg-stone-900 border border-amber-400/10 rounded-sm overflow-hidden"
    >
      <div
        className="relative w-full aspect-4/5 overflow-hidden"
        style={{ backgroundColor: "#1c1209" }}
      >
        {item.imageSrc ? (
          <Image
            src={item.imageSrc}
            alt={item.name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,#2c1a08_0%,#0d0a06_72%)]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <FallbackIcon className="h-14 w-14 text-amber-100/20" />
            </div>
          </>
        )}

        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: GRAIN_TEXTURE,
            backgroundSize: "128px 128px",
          }}
        />

        {/* Badge "Nuevo" — misma posición/estilo que el tag de descuento en OutletCard */}
        <div className="absolute top-2.5 left-2.5 bg-stone-950/80 border border-amber-400/30 px-2 py-1 backdrop-blur-sm">
          <span className="font-sans text-amber-400 text-[10px] tracking-[0.18em] font-medium uppercase">
            Nuevo
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-10 bg-linear-to-t from-stone-900 to-transparent pointer-events-none" />
      </div>

      <div className="px-4 sm:px-5 pt-4 pb-5">
        <h3 className="font-serif text-amber-50 text-lg leading-snug">
          {item.name}
        </h3>
        <p className="mt-2 font-sans text-sm text-amber-100/45 leading-relaxed">
          {item.description}
        </p>
        <p className="mt-3 font-sans text-[11px] tracking-[0.15em] uppercase text-amber-400/55">
          Solo en tienda
        </p>
      </div>
    </motion.article>
  );
}

export default function NewProducts() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={staggerContainer}
      className="max-w-5xl mx-auto py-24 px-4 sm:px-8"
    >
      <motion.div
        variants={fadeUp}
        transition={{ duration: 0.6, ease: EASE_LUXE }}
        className="max-w-xl mx-auto mb-10 md:mb-12 text-center space-y-3"
      >
        <p className="text-xs tracking-[0.35em] uppercase text-amber-400/70">
          También en tienda física
        </p>
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-amber-50 leading-snug">
          Recién llegado a la{" "}
          <span className="italic text-amber-400">tienda</span>
        </h2>
        <p className="text-sm text-amber-100/55 leading-relaxed">
          Estas piezas acaban de llegar a nuestra sucursal de Celaya y todavía
          no están en el outlet en línea. Ven a verlas y pruébatelas en persona.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-4">
        {NEW_ARRIVALS.map((item) => (
          <NewArrivalCard key={item.id} item={item} />
        ))}
      </div>

      <motion.div
        variants={fadeUp}
        transition={{ duration: 0.6, ease: EASE_LUXE }}
        className="mt-8 md:mt-10 border border-amber-900/40 bg-stone-900/40 px-6 py-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-5"
      >
        <div className="flex items-center gap-4 text-center sm:text-left">
          <MapPin
            className="h-7 w-7 text-amber-400 shrink-0"
            strokeWidth={1.25}
          />
          <div>
            <p className="font-serif text-lg text-amber-300 font-semibold">
              Visítanos en tienda
            </p>
            <p className="mt-1 text-sm text-amber-100/50">
              {LEGAL_ENTITY.address}
            </p>
          </div>
        </div>
        <Link
          href="/nosotros#ubicacion"
          className="shrink-0 text-xs tracking-[0.3em] uppercase border px-8 py-3.5 border-amber-400/70 text-amber-400 hover:bg-amber-400/10 transition-colors duration-300"
        >
          Cómo llegar
        </Link>
      </motion.div>
    </motion.section>
  );
}
