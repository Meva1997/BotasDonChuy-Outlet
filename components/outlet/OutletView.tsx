"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import OutletCard from "@/components/ui/OutletCard";
import EmptyState from "@/components/ui/EmptyState";
import OutletFilters from "@/components/outlet/OutletFilters";
import OutletPagination from "@/components/outlet/OutletPagination";
import { fadeUp, staggerContainer, EASE_LUXE } from "@/lib/motion";
import {
  getProducts,
  productKeys,
  type ProductFilters,
  type ProductsResult,
} from "@/lib/getProducts";

const TRUST_SIGNALS = [
  "Piezas únicas · sin reposición",
  "Calidad de piel verificada",
  "Envío a todo México",
];

// When adding TanStack Query, replace the useEffect block with:
//   const { data: result } = useQuery({
//     queryKey: productKeys.filtered(filters),
//     queryFn: () => getProducts(filters),
//   })

const CATEGORY_LABELS: Record<string, string> = {
  bota: "Botas",
  sombrero: "Sombreros",
  ropa: "Ropa",
};

interface OutletViewProps {
  // Set on category-specific routes (/botas, /sombreros, /ropa).
  // When provided, the category select is hidden and the URL `categoria` param is ignored.
  defaultCategoria?: string;
}

export default function OutletView({ defaultCategoria }: OutletViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const categoria =
    defaultCategoria ?? searchParams.get("categoria") ?? undefined;
  const talla = searchParams.get("talla")
    ? Number(searchParams.get("talla"))
    : undefined;
  const page = searchParams.get("pagina")
    ? Number(searchParams.get("pagina"))
    : 1;

  const filters: ProductFilters = { categoria, talla, page };

  const [result, setResult] = useState<ProductsResult | null>(null);

  useEffect(() => {
    // Intentionally not void-wrapped so eslint exhaustive-deps is explicit.
    // Replace this entire effect with useQuery when adding TanStack Query.
    getProducts(filters).then(setResult);
    // productKeys.filtered(filters) documents the shape for future cache keys.
    void productKeys;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoria, talla, page]);

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      if (key !== "pagina") params.delete("pagina");
      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  const title = categoria
    ? `Outlet — ${CATEGORY_LABELS[categoria] ?? categoria}`
    : "Outlet — todo";

  return (
    <section className="min-dvh-screen bg-tobacco-950 px-6 md:p-10 py-12 my-20">
      {/* Trust strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto mb-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-amber-400/15 py-3"
      >
        {TRUST_SIGNALS.map((signal, i) => (
          <span
            key={signal}
            className="font-sans text-[11px] tracking-[0.18em] uppercase text-amber-100/40 flex items-center gap-2"
          >
            {i !== 0 && (
              <span className="hidden sm:inline text-amber-400/40">/</span>
            )}
            {signal}
          </span>
        ))}
      </motion.div>

      {/* Header */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        transition={{ duration: 0.6, ease: EASE_LUXE }}
        className="mb-8 max-w-7xl mx-auto"
      >
        <p className="font-sans text-amber-400/70 text-xs tracking-[0.3em] uppercase mb-3">
          Edición de bodega
        </p>
        <h1 className="font-serif text-amber-50 text-4xl md:text-5xl mb-2">
          {title}
        </h1>
        <p className="font-sans text-amber-100/45 text-sm tracking-wide">
          Inventario final de bodega. Lo que ves es lo que queda.
        </p>
      </motion.div>

      {/* Filters — talla select only appears when a category is active */}
      <OutletFilters
        showCategoria={!defaultCategoria}
        showTalla={!!categoria}
        selectedCategoria={categoria}
        selectedTalla={talla}
        availableSizes={result?.availableSizes ?? []}
        total={result?.total}
        onCategoriaChange={(val) => updateParam("categoria", val)}
        onTallaChange={(val) => updateParam("talla", val)}
      />

      {/* Product grid */}
      {result && (
        <>
          {result.products.length === 0 ? (
            <EmptyState
              title="Sin productos disponibles"
              message="No hay piezas en esta categoría por el momento. Vuelve pronto — el inventario cambia constantemente."
            />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${categoria ?? "all"}-${talla ?? "all"}-${page}`}
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 max-w-6xl mx-auto"
              >
                {result.products.map((product) => (
                  <OutletCard
                    key={product.id}
                    slug={product.id}
                    name={product.name}
                    originalPrice={product.originalPrice}
                    salePrice={product.salePrice}
                    discountPercent={product.discountPercent}
                    stock={product.stock === 1 ? "ultima" : product.stock}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          )}

          {result.products.length > 0 && (
            <OutletPagination
              currentPage={result.page}
              totalPages={result.totalPages}
              onPageChange={(p) =>
                updateParam("pagina", p > 1 ? String(p) : null)
              }
            />
          )}
        </>
      )}
    </section>
  );
}
