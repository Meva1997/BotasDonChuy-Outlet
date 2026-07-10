"use client";

import { motion } from "framer-motion";

interface OrdersPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

// Pager con ventana + elipsis (a diferencia de components/outlet/OutletPagination.tsx,
// que pinta un botón por página). El catálogo tiene pocas páginas; los pedidos crecen
// sin límite con el tiempo, así que aquí se muestra Anterior/Siguiente + primera +
// (actual ±1) + última, rellenando los huecos con "…".
function pageWindow(current: number, total: number): (number | "…")[] {
  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  const visible = [...pages]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);

  const out: (number | "…")[] = [];
  let prev = 0;
  for (const p of visible) {
    if (p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}

const arrowBase =
  "relative w-9 h-9 flex items-center justify-center font-sans text-sm border transition-colors duration-200";

export default function OrdersPagination({
  currentPage,
  totalPages,
  onPageChange,
}: OrdersPaginationProps) {
  if (totalPages <= 1) return null;

  const atFirst = currentPage <= 1;
  const atLast = currentPage >= totalPages;

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        aria-label="Página anterior"
        disabled={atFirst}
        onClick={() => onPageChange(currentPage - 1)}
        className={`${arrowBase} ${
          atFirst
            ? "border-amber-400/10 text-amber-100/20 cursor-not-allowed"
            : "border-amber-400/20 text-amber-100/40 hover:border-amber-400/40 hover:text-amber-100/70 cursor-pointer"
        }`}
      >
        ‹
      </button>

      {pageWindow(currentPage, totalPages).map((page, i) =>
        page === "…" ? (
          <span
            key={`ellipsis-${i}`}
            aria-hidden="true"
            className="w-9 h-9 flex items-center justify-center text-amber-100/30 font-sans text-sm select-none"
          >
            …
          </span>
        ) : (
          <motion.button
            key={page}
            type="button"
            aria-label={`Página ${page}`}
            aria-current={page === currentPage ? "page" : undefined}
            onClick={() => onPageChange(page)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.94 }}
            className={`relative w-9 h-9 font-sans text-sm border transition-colors duration-200 cursor-pointer ${
              page === currentPage
                ? "border-amber-400/70 text-amber-400 bg-amber-400/10"
                : "border-amber-400/20 text-amber-100/40 hover:border-amber-400/40 hover:text-amber-100/70"
            }`}
          >
            {page}
            {page === currentPage && (
              <motion.span
                layoutId="orders-pagination-active"
                className="absolute inset-0 border border-amber-400/70 -z-10"
                transition={{ duration: 0.3 }}
              />
            )}
          </motion.button>
        )
      )}

      <button
        type="button"
        aria-label="Página siguiente"
        disabled={atLast}
        onClick={() => onPageChange(currentPage + 1)}
        className={`${arrowBase} ${
          atLast
            ? "border-amber-400/10 text-amber-100/20 cursor-not-allowed"
            : "border-amber-400/20 text-amber-100/40 hover:border-amber-400/40 hover:text-amber-100/70 cursor-pointer"
        }`}
      >
        ›
      </button>
    </div>
  );
}
