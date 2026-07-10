"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import {
  adminProductKeys,
  deleteProduct,
  type AdminProduct,
} from "@/lib/api/adminProducts";
import { formatPrice } from "@/lib/utils";
import { type CategoryInfo } from "@/lib/domain/categories";
import ProductForm from "./ProductForm";
import ProductDetailModal from "./ProductDetailModal";

interface Props {
  category: CategoryInfo;
  products: AdminProduct[];
  onBack: () => void;
}

type FormMode =
  | { mode: "new" }
  | { mode: "edit"; product: AdminProduct }
  | null;

const PAGE_SIZE = 10;

function Thumbnail({ src }: { src?: string | null }) {
  if (src) {
    return (
      // Previsualización local (blob: URL) — next/image no optimiza object URLs.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className="w-12 h-12 object-cover bg-stone-800 shrink-0"
      />
    );
  }
  return (
    <div className="w-12 h-12 bg-stone-800 shrink-0 overflow-hidden">
      <svg
        viewBox="0 0 48 48"
        className="w-full h-full text-stone-700"
        aria-hidden="true"
      >
        {Array.from({ length: 10 }, (_, i) => (
          <g key={i}>
            <line
              x1={i * 8}
              y1="0"
              x2="0"
              y2={i * 8}
              stroke="currentColor"
              strokeWidth="0.6"
            />
            <line
              x1="48"
              y1={i * 8}
              x2={i * 8}
              y2="48"
              stroke="currentColor"
              strokeWidth="0.6"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function ProductCategoryView({
  category,
  products,
  onBack,
}: Props) {
  const [formMode, setFormMode] = useState<FormMode>(null);
  // Producto abierto en el modal de detalle (solo lectura).
  const [viewing, setViewing] = useState<AdminProduct | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // Confirmación de borrado inline (sin window.confirm, que bloquea la UI).
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: adminProductKeys.all });
      setConfirmingId(null);
      setNotice(
        res.softDeleted
          ? "El producto se ocultó del catálogo porque tiene pedidos asociados (se conserva para el historial)."
          : "Producto eliminado.",
      );
    },
  });

  const totalStock = products.reduce((acc, p) => acc + p.stock, 0);
  const visibleProducts = products.slice(0, visibleCount);
  const hasMore = products.length > visibleCount;

  if (formMode) {
    return (
      <ProductForm
        category={category}
        product={formMode.mode === "edit" ? formMode.product : undefined}
        onBack={() => setFormMode(null)}
      />
    );
  }

  return (
    <>
      {/* Breadcrumb */}
      <nav className="mb-7 flex items-center gap-2.5">
        <button
          onClick={onBack}
          className="text-[10px] tracking-[0.25em] uppercase text-amber-100/40 hover:text-amber-100/70 transition-colors cursor-pointer"
        >
          Productos
        </button>
        <span className="text-amber-100/20 text-xs">/</span>
        <span className="text-[10px] tracking-[0.25em] uppercase text-amber-50/80">
          {category.plural}
        </span>
      </nav>

      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-amber-50 text-3xl mb-1.5">
            {category.plural}
          </h2>
          <p className="text-amber-100/40 text-sm">
            {products.length} productos · {totalStock} en existencia
          </p>
        </div>
        <button
          onClick={() => setFormMode({ mode: "new" })}
          className="shrink-0 border border-amber-400/60 text-amber-400 text-[10px] tracking-[0.25em] uppercase px-5 py-3 hover:bg-amber-400/10 transition-colors cursor-pointer"
        >
          + Agregar producto
        </button>
      </div>

      {/* Avisos (borrado / soft-delete / error) */}
      {notice && (
        <p
          role="status"
          className="max-w-5xl mb-5 text-[12px] leading-relaxed text-amber-200/80 border border-amber-400/25 bg-amber-400/5 rounded-md px-4 py-2.5"
        >
          {notice}
        </p>
      )}
      {deleteMutation.isError && (
        <p
          role="alert"
          className="max-w-5xl mb-5 text-[12px] leading-relaxed text-red-400/90 border border-red-500/30 bg-red-500/5 rounded-md px-4 py-2.5"
        >
          No pudimos eliminar el producto. Inténtalo de nuevo.
        </p>
      )}

      {/* Product table */}
      {products.length === 0 ? (
        <div className="py-16 text-center border border-amber-400/10">
          <p className="text-amber-100/30 text-sm">
            Sin productos en esta categoría
          </p>
        </div>
      ) : (
        <div className="max-w-5xl">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-amber-400/15">
                <th className="pb-3 pr-4 w-12" />
                <th className="text-left text-[10px] tracking-[0.25em] uppercase text-amber-100/35 font-normal pb-3 pr-6">
                  Nombre
                </th>
                <th className="text-center text-[10px] tracking-[0.25em] uppercase text-amber-100/35 font-normal pb-3 px-4">
                  Precio original
                </th>
                <th className="text-center text-[10px] tracking-[0.25em] uppercase text-amber-100/35 font-normal pb-3 px-4">
                  Precio outlet
                </th>
                <th className="text-center text-[10px] tracking-[0.25em] uppercase text-amber-100/35 font-normal pb-3 px-4">
                  Desc.
                </th>
                <th className="text-center text-[10px] tracking-[0.25em] uppercase text-amber-100/35 font-normal pb-3 px-4">
                  Existencia
                </th>
                <th className="pb-3 pl-4" />
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((product) => {
                const isConfirming = confirmingId === product.id;
                const isDeleting =
                  deleteMutation.isPending &&
                  deleteMutation.variables === product.id;
                return (
                  <tr
                    key={product.id}
                    onClick={() => setViewing(product)}
                    className="border-b border-amber-400/8 hover:bg-amber-400/3 transition-colors group cursor-pointer"
                  >
                    <td className="py-3 pr-4">
                      <Thumbnail src={product.imageSrc} />
                    </td>
                    <td className="py-3 pr-6">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewing(product);
                        }}
                        className="font-serif text-amber-50 text-sm leading-snug text-left hover:text-amber-400 transition-colors cursor-pointer"
                      >
                        {product.name}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-amber-100/35 line-through text-sm tabular-nums">
                        {formatPrice(product.originalPrice)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-amber-400 text-sm font-medium tabular-nums">
                        {formatPrice(product.salePrice)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-amber-100/35 text-sm tabular-nums">
                        −{product.discountPercent}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-amber-100/50 text-sm tabular-nums">
                        {product.stock}
                      </span>
                    </td>
                    <td className="py-3 pl-4 text-right whitespace-nowrap">
                      {isConfirming ? (
                        <span className="inline-flex items-center gap-3">
                          <span className="text-[10px] tracking-[0.15em] uppercase text-amber-100/45">
                            {isDeleting ? "Eliminando…" : "¿Eliminar?"}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMutation.mutate(product.id);
                            }}
                            disabled={isDeleting}
                            className="text-[10px] tracking-[0.2em] uppercase text-red-400/80 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            Sí
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmingId(null);
                            }}
                            disabled={isDeleting}
                            className="text-[10px] tracking-[0.2em] uppercase text-amber-100/35 hover:text-amber-100/70 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            No
                          </button>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormMode({ mode: "edit", product });
                            }}
                            aria-label="Editar"
                            title="Editar"
                            className="text-amber-100/35 hover:text-amber-400 transition-colors cursor-pointer"
                          >
                            <Pencil
                              className="w-4 h-4 text-blue-400 hover:scale-120 hover:text-blue-600"
                              strokeWidth={1.5}
                            />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setNotice(null);
                              setConfirmingId(product.id);
                            }}
                            aria-label="Eliminar"
                            title="Eliminar"
                            className="text-amber-100/35 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash2
                              className="w-4 h-4 text-red-400 hover:scale-120 hover:text-red-600"
                              strokeWidth={1.5}
                            />
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="border border-stone-600/50 text-amber-100/45 text-[10px] tracking-[0.25em] uppercase px-8 py-3 hover:border-amber-400/40 hover:text-amber-100/75 transition-all cursor-pointer"
              >
                Cargar más · {products.length - visibleCount} restantes
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal de detalle (solo lectura) */}
      {viewing && (
        <ProductDetailModal
          product={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setFormMode({ mode: "edit", product: viewing });
            setViewing(null);
          }}
        />
      )}
    </>
  );
}
