"use client";

import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { type AdminProduct } from "@/lib/api/adminProducts";
import { categorySingular } from "@/lib/domain/categories";
import { formatPrice } from "@/lib/utils";
import { EASE_LUXE } from "@/lib/ui/motion";

interface Props {
  product: AdminProduct;
  onClose: () => void;
  onEdit: () => void;
}

// `sizes` viene como array plano donde la repetición representa unidades de stock
// (["26","26","27"] → talla 26 con 2 unidades, 27 con 1). Lo agrupamos para
// mostrar el desglose "26 ×2 · 27 ×1".
function groupSizes(sizes: number[]): { size: number; count: number }[] {
  const counts = new Map<number, number>();
  for (const s of sizes) counts.set(s, (counts.get(s) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([size, count]) => ({ size, count }));
}

function formatDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function CrosshatchPlaceholder() {
  return (
    <div className="w-full h-full bg-stone-800">
      <svg
        aria-hidden="true"
        className="w-full h-full text-stone-700"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        {Array.from({ length: 14 }, (_, i) => (
          <g key={i}>
            <line
              x1={i * 10}
              y1="0"
              x2="0"
              y2={i * 10}
              stroke="currentColor"
              strokeWidth="0.6"
            />
            <line
              x1="100"
              y1={i * 10}
              x2={i * 10}
              y2="100"
              stroke="currentColor"
              strokeWidth="0.6"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

const labelCls =
  "block text-[10px] tracking-[0.25em] uppercase text-amber-100/40 mb-1.5";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="text-amber-50 text-sm">{children}</div>
    </div>
  );
}

export default function ProductDetailModal({
  product,
  onClose,
  onEdit,
}: Props) {
  const reduceMotion = useReducedMotion();

  // Cerrar con la tecla Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const grouped = groupSizes(product.sizes);
  const margin = product.salePrice - product.unitCost;
  const created = formatDate(product.createdAt);
  const updated = formatDate(product.updatedAt);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel centrado */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`Detalle de ${product.name}`}
          initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE_LUXE }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-tobacco-950 border border-amber-400/15 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]"
        >
          {/* Gold-foil edge */}
          <div
            aria-hidden="true"
            className="absolute left-0 top-0 h-full w-px bg-linear-to-b from-transparent via-amber-400/50 to-transparent"
          />

          {/* Header */}
          <div className="flex items-start gap-5 p-6 border-b border-amber-900/40">
            <div className="shrink-0 w-24 h-24 border border-stone-700/60 overflow-hidden">
              {product.imageSrc ? (
                // Previsualización local (blob:) o URL remota; en modo lectura
                // basta un <img> — no se optimiza aquí. eslint-disable por el blob.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.imageSrc}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <CrosshatchPlaceholder />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[10px] tracking-[0.25em] uppercase text-amber-100/40 mb-1">
                {categorySingular(product.type)}
                {product.code ? ` · ${product.code}` : ""}
              </p>
              <h2 className="font-serif text-amber-50 text-2xl leading-snug">
                {product.name}
              </h2>
              <span
                className={[
                  "inline-block mt-2 text-[10px] tracking-[0.2em] uppercase px-2.5 py-1 border",
                  product.visible
                    ? "text-amber-400 border-amber-400/50 bg-amber-400/5"
                    : "text-amber-100/40 border-stone-600/60",
                ].join(" ")}
              >
                {product.visible ? "Visible en catálogo" : "Oculto"}
              </span>
            </div>

            <button
              type="button"
              aria-label="Cerrar"
              onClick={onClose}
              className="group shrink-0 w-7 h-7 flex items-center justify-center border border-amber-100/15 text-amber-100/40 hover:text-red-400 hover:border-red-600 transition-colors cursor-pointer"
            >
              <svg
                width="13"
                height="13"
                fill="none"
                aria-hidden="true"
                className="transition-transform duration-300 group-hover:rotate-90"
                viewBox="0 0 18 18"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                  d="m2 2 14 14m0-14L2 16"
                />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Precios */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
              <Field label="Precio original">
                <span className="line-through text-amber-100/40 tabular-nums">
                  {formatPrice(product.originalPrice)}
                </span>
              </Field>
              <Field label="Precio outlet">
                <span className="text-amber-400 font-medium tabular-nums">
                  {formatPrice(product.salePrice)}
                </span>
              </Field>
              <Field label="Descuento">
                <span className="tabular-nums">
                  −{product.discountPercent}%
                </span>
              </Field>
            </div>

            <div className="border-t border-stone-700/40" />

            {/* Negocio (admin) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
              <Field label="Costo unitario">
                <span className="tabular-nums">
                  {formatPrice(product.unitCost)}
                </span>
              </Field>
              <Field label="Margen unit.">
                <span
                  className={`tabular-nums ${margin >= 0 ? "text-amber-50" : "text-red-400"}`}
                >
                  {formatPrice(margin)}
                </span>
              </Field>
              <Field label="Existencia">
                <span className="tabular-nums">{product.stock}</span>
              </Field>
            </div>

            {/* Tallas — producto sin tallas (Fase 24): sin selector que
                mostrar, la existencia ya se ve arriba en "Existencia". */}
            {product.hasSizes && (
              <Field label="Tallas (unidades)">
                {grouped.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {grouped.map(({ size, count }) => (
                      <span
                        key={size}
                        className="inline-flex items-center gap-1.5 border border-stone-700/60 px-2.5 py-1 text-xs tabular-nums"
                      >
                        <span className="text-amber-50">{size}</span>
                        <span className="text-amber-100/40">×{count}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-amber-100/30">—</span>
                )}
              </Field>
            )}

            <div className="border-t border-stone-700/40" />

            {/* Empaque */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
              <Field label="Código / SKU">
                {product.code || <span className="text-amber-100/30">—</span>}
              </Field>
              <Field label="Peso">
                <span className="tabular-nums">{product.weightKg} kg</span>
              </Field>
              <Field label="Dimensiones (L×An×Al)">
                <span className="tabular-nums">
                  {product.lengthCm} × {product.widthCm} × {product.heightCm} cm
                </span>
              </Field>
            </div>

            {/* Descripción */}
            <Field label="Descripción">
              {product.description ? (
                <p className="text-amber-100/70 text-sm leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              ) : (
                <span className="text-amber-100/30">Sin descripción</span>
              )}
            </Field>

            {(created || updated) && (
              <p className="text-[11px] text-amber-100/30 pt-1">
                {created && <>Creado {created}</>}
                {created && updated && " · "}
                {updated && <>actualizado {updated}</>}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-5 border-t border-amber-900/40">
            <button
              type="button"
              onClick={onClose}
              className="border border-stone-600/60 text-amber-100/50 text-[10px] tracking-[0.2em] uppercase px-6 py-3 hover:border-red-600 hover:text-red-400 transition-all cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="border border-amber-400/60 text-amber-400 text-[10px] tracking-[0.25em] uppercase px-6 py-3 hover:bg-amber-400/10 transition-colors cursor-pointer"
            >
              Editar
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}
