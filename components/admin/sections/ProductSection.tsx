"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { adminProductKeys, getAdminProducts } from "@/lib/api/adminProducts";
import { CATEGORIES, type CategoryInfo } from "@/lib/domain/categories";
import ProductCategoryView from "../products/ProductCategoryView";

export default function ProductSection() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // La categoría abierta vive en la URL (?categoria=bota) para sobrevivir al refresh.
  const categoriaParam = searchParams.get("categoria");
  const selected = categoriaParam
    ? CATEGORIES.find((c) => c.type === categoriaParam) ?? null
    : null;

  const selectCategory = (cat: CategoryInfo | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (cat) {
      params.set("categoria", cat.type);
    } else {
      params.delete("categoria");
    }
    router.push(`?${params.toString()}`);
  };

  // Una sola query trae el catálogo admin completo; el filtrado por categoría se
  // hace en memoria (mismo modelo que antes con MOCK_PRODUCTS, ahora desde el backend).
  const {
    data: allProducts,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: adminProductKeys.all,
    queryFn: getAdminProducts,
  });

  if (isPending) {
    return (
      <p className="text-amber-100/40 text-sm tracking-[0.15em] uppercase">
        Cargando catálogo…
      </p>
    );
  }

  if (isError) {
    return (
      <div className="max-w-md space-y-4">
        <p className="text-red-400/90 text-sm border border-red-500/30 bg-red-500/5 rounded-md px-4 py-3">
          No pudimos cargar el catálogo. Revisa tu conexión e inténtalo de nuevo.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="border border-amber-400/60 text-amber-400 text-[10px] tracking-[0.25em] uppercase px-6 py-2.5 hover:bg-amber-400/10 transition-colors cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (selected) {
    const products = allProducts.filter((p) => p.type === selected.type);
    return (
      <ProductCategoryView
        category={selected}
        products={products}
        onBack={() => selectCategory(null)}
      />
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8 flex flex-col items-start">
        <h2 className="font-serif text-amber-50 text-3xl mb-2">Productos</h2>
        <p className="text-amber-100/40 text-sm leading-relaxed">
          Listado de productos disponibles al público
        </p>
      </div>

      {/* Category grid */}
      <section className="grid sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 max-w-6xl">
        {CATEGORIES.map((cat) => {
          const products = allProducts.filter((p) => p.type === cat.type);
          const totalStock = products.reduce((acc, p) => acc + p.stock, 0);

          return (
            <button
              key={cat.type}
              onClick={() => selectCategory(cat)}
              className="group bg-stone-900 border border-amber-400/15 p-6 text-left hover:border-amber-400/40 hover:bg-stone-800/70 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-5">
                <h3 className="font-serif text-amber-50 text-2xl group-hover:text-amber-100 transition-colors">
                  {cat.plural}
                </h3>
                <span className="text-amber-400/40 group-hover:text-amber-400/70 transition-colors text-xl leading-none mt-0.5">
                  →
                </span>
              </div>

              <div className="flex items-end justify-between">
                <div className="space-y-1">
                  <p className="text-amber-100/45 text-sm">
                    <span className="text-amber-50/70 font-medium">{products.length}</span>{" "}
                    productos
                  </p>
                  <p className="text-amber-100/45 text-sm">
                    <span className="text-amber-50/70 font-medium">{totalStock}</span>{" "}
                    en stock
                  </p>
                </div>

                {/* Mini stock dots */}
                <div className="flex gap-1 items-end pb-0.5">
                  {products.slice(0, 4).map((p) => (
                    <div
                      key={p.id}
                      title={p.name}
                      style={{ height: `${Math.min(4 + p.stock * 4, 20)}px` }}
                      className="w-1.5 bg-amber-400/25 group-hover:bg-amber-400/40 transition-colors rounded-sm"
                    />
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </section>
    </>
  );
}
