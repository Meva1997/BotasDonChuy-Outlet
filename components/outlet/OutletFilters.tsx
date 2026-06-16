"use client";

import { motion } from "framer-motion";
import { fadeIn } from "@/lib/motion";

const SELECT_CLASS =
  "font-sans text-amber-50 text-sm bg-stone-900/60 border border-amber-400/25 rounded-sm px-4 py-2.5 pr-9 appearance-none cursor-pointer hover:border-amber-400/55 focus:outline-none focus:border-amber-400/70 focus:ring-1 focus:ring-amber-400/30 transition-all duration-200";

const ARROW_STYLE: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23fbbf24' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
};

interface OutletFiltersProps {
  showCategoria: boolean;
  showTalla: boolean;
  selectedCategoria?: string;
  selectedTalla?: number;
  availableSizes: number[];
  total?: number;
  onCategoriaChange: (value: string | null) => void;
  onTallaChange: (value: string | null) => void;
}

export default function OutletFilters({
  showCategoria,
  showTalla,
  selectedCategoria,
  selectedTalla,
  availableSizes,
  total,
  onCategoriaChange,
  onTallaChange,
}: OutletFiltersProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="flex flex-wrap items-center gap-3 mb-10 max-w-7xl mx-auto sticky top-0 z-10 bg-tobacco-950/85 backdrop-blur-sm py-3 -mx-6 px-6 md:mx-0 md:px-0 md:static md:bg-transparent md:backdrop-blur-none"
    >
      {showCategoria && (
        <select
          value={selectedCategoria ?? ""}
          onChange={(e) => onCategoriaChange(e.target.value || null)}
          className={SELECT_CLASS}
          style={ARROW_STYLE}
        >
          <option value="" className="bg-stone-900">
            Todas las categorías
          </option>
          <option value="bota" className="bg-stone-900">
            Botas
          </option>
          <option value="sombrero" className="bg-stone-900">
            Sombreros
          </option>
          <option value="ropa" className="bg-stone-900">
            Ropa
          </option>
        </select>
      )}

      {showTalla && (
        <select
          value={selectedTalla ?? ""}
          onChange={(e) => onTallaChange(e.target.value || null)}
          className={SELECT_CLASS}
          style={ARROW_STYLE}
        >
          <option value="" className="bg-stone-900">
            Todas las tallas
          </option>
          {availableSizes.map((size) => (
            <option key={size} value={size} className="bg-stone-900">
              {size}
            </option>
          ))}
        </select>
      )}

      {total !== undefined && (
        <span className="ml-auto font-sans text-amber-100/40 text-xs sm:text-sm tracking-[0.1em] uppercase">
          {total} {total === 1 ? "pieza" : "piezas"}
          <span className="text-amber-400/50 mx-1.5">·</span>
          sin reposición
        </span>
      )}
    </motion.div>
  );
}
