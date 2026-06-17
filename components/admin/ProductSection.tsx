"use client";

import { useState } from "react";
import { MOCK_PRODUCTS } from "@/db/mockProducts";
import { CATEGORIES, type CategoryInfo } from "@/lib/categories";
import ProductCategoryView from "./ProductCategoryView";

export default function ProductSection() {
  const [selected, setSelected] = useState<CategoryInfo | null>(null);

  if (selected) {
    const products = MOCK_PRODUCTS.filter((p) => p.type === selected.type);
    return (
      <ProductCategoryView
        category={selected}
        products={products}
        onBack={() => setSelected(null)}
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
          const products = MOCK_PRODUCTS.filter((p) => p.type === cat.type);
          const totalStock = products.reduce((acc, p) => acc + p.stock, 0);

          return (
            <button
              key={cat.type}
              onClick={() => setSelected(cat)}
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
