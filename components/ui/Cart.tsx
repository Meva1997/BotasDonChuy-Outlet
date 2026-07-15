"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  LoaderCircle,
  ShoppingCart,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { formatPrice } from "@/lib/utils";
import { EASE_LUXE } from "@/lib/ui/motion";
import { useBrand } from "@/components/providers/BrandProvider";

function ProductPlaceholder({ type }: { type: string }) {
  return (
    <div className="w-16 h-16 shrink-0 bg-stone-800 border border-amber-900/30 flex items-center justify-center">
      <span className="text-amber-100/20 text-xs uppercase tracking-widest">
        {type === "bota" ? "B" : type === "sombrero" ? "S" : "R"}
      </span>
    </div>
  );
}

export default function Cart() {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);
  const {
    items,
    isOpen,
    closeCart,
    removeItem,
    updateQuantity,
    totalItems,
    subtotal,
    savings,
  } = useCartStore();
  const brand = useBrand();

  const reduceMotion = useReducedMotion();
  const total = subtotal() - savings();
  const itemCount = totalItems();

  // Resetea el estado de carga al reabrir el carrito (p. ej. al volver desde
  // /checkout). Ajuste de estado en render — patrón recomendado de React en vez
  // de un efecto, evita el render en cascada de setState dentro de useEffect.
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) setNavigating(false);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40"
            onClick={closeCart}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.aside
            role="dialog"
            aria-label="Carrito de compras"
            aria-modal="true"
            initial={{ x: reduceMotion ? 0 : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: reduceMotion ? 0 : "100%" }}
            transition={{ duration: 0.45, ease: EASE_LUXE }}
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-tobacco-950 z-50 flex flex-col shadow-[-24px_0_60px_-20px_rgba(0,0,0,0.7)]"
          >
            {/* Gold-foil edge */}
            <div
              aria-hidden="true"
              className="absolute w-px left-0 top-0 h-full bg-linear-to-b from-transparent via-amber-400/50 to-transparent"
            />

            {/* Header */}
            <div className="px-6 pt-6 pb-5 border-b border-amber-900/40 shrink-0">
              <div className="flex items-center justify-between">
                <p className="text-[9px] tracking-[0.3em] uppercase text-amber-100/30">
                  Botas Don Chuy &middot; Outlet
                </p>
                <button
                  type="button"
                  aria-label="Cerrar carrito"
                  onClick={closeCart}
                  className="group w-7 h-7 flex items-center justify-center border border-amber-100/15 text-amber-100/40 hover:text-amber-100 hover:border-amber-100/40 transition-colors cursor-pointer"
                >
                  <X
                    size={13}
                    strokeWidth={1.5}
                    aria-hidden="true"
                    className="transition-transform duration-300 group-hover:rotate-90"
                  />
                </button>
              </div>
              <h2 className="font-serif text-xl text-amber-50 mt-2">
                Tu corte <span className="italic text-amber-400">final</span>
                <span className="text-amber-100/40 text-sm font-sans not-italic ml-2">
                  ({itemCount} {itemCount === 1 ? "artículo" : "artículos"})
                </span>
              </h2>
            </div>

            {/* Warning banner */}
            <div className="flex items-center justify-center gap-2 bg-amber-400/6 border-b border-amber-400/15 px-6 py-2.5 shrink-0">
              <TriangleAlert
                size={11}
                strokeWidth={2}
                aria-hidden="true"
                className="text-amber-400/70 shrink-0"
              />
              <p className="text-center text-[10px] tracking-[0.2em] uppercase text-amber-400/90">
                {brand.cartNotice}
              </p>
            </div>

            {/* Content */}
            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center px-8 gap-5">
                <div className="w-16 h-16 border border-dashed border-amber-900/40 flex items-center justify-center">
                  <ShoppingCart
                    size={28}
                    strokeWidth={1.2}
                    aria-hidden="true"
                    className="text-amber-100/20"
                  />
                </div>
                <div className="text-center">
                  <p className="font-serif text-amber-50/80 text-lg mb-1.5">
                    Tu carrito está{" "}
                    <span className="italic text-amber-400">vacío</span>
                  </p>
                  <p className="text-amber-100/30 text-xs tracking-wide max-w-55 mx-auto leading-relaxed">
                    Agrega piezas desde el outlet para continuar
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    closeCart();
                    router.push("/outlet");
                  }}
                  className="mt-1 text-xs tracking-[0.2em] uppercase border border-amber-400/40 text-amber-400 px-6 py-2.5 hover:bg-amber-400/10 transition-colors cursor-pointer"
                >
                  Ver outlet
                </button>
              </div>
            ) : (
              <ul className="flex-1 overflow-y-auto divide-y divide-amber-900/15">
                {items.map((item, index) => (
                  <li
                    key={item.id}
                    style={{ animationDelay: `${index * 60}ms` }}
                    className="flex gap-4 px-6 py-5 animate-fade-in-up hover:bg-amber-400/2.5 transition-colors"
                  >
                    {/* Image */}
                    {item.product.imageSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.product.imageSrc}
                        alt={item.product.name}
                        className="w-16 h-16 shrink-0 object-cover border border-amber-900/30"
                      />
                    ) : (
                      <ProductPlaceholder type={item.product.type} />
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-amber-50 text-sm leading-snug pr-2">
                          {item.product.name}
                        </p>
                        <button
                          type="button"
                          aria-label={`Quitar ${item.product.name}`}
                          onClick={() => removeItem(item.id)}
                          className="shrink-0 text-amber-100/25 hover:text-amber-400 transition-colors cursor-pointer p-1"
                        >
                          <Trash2 size={16} strokeWidth={1.6} aria-hidden="true" />
                        </button>
                      </div>
                      <p className="text-amber-100/40 text-xs mt-0.5 capitalize">
                        Talla: {item.size} &middot; {item.product.type}
                      </p>

                      {/* Quantity + price row */}
                      <div className="flex items-center justify-between mt-3.5">
                        <div className="flex items-center border border-amber-900/40 divide-x divide-amber-900/40">
                          <button
                            type="button"
                            aria-label="Disminuir cantidad"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                            className="w-6 h-6 flex items-center justify-center text-amber-100/50 hover:text-amber-100 hover:bg-amber-100/5 transition-colors text-xs cursor-pointer"
                          >
                            −
                          </button>
                          <span className="text-amber-50 text-xs w-7 text-center">
                            {item.quantity}
                          </span>
                          {(() => {
                            const sizeStock = item.product.sizes.filter(
                              (s) => s === item.size,
                            ).length;
                            const atMax = item.quantity >= sizeStock;
                            return (
                              <button
                                type="button"
                                aria-label="Aumentar cantidad"
                                disabled={atMax}
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity + 1)
                                }
                                className={`w-6 h-6 flex items-center justify-center transition-colors text-xs ${
                                  atMax
                                    ? "text-amber-100/15 cursor-not-allowed"
                                    : "text-amber-100/50 hover:text-amber-100 hover:bg-amber-100/5 cursor-pointer"
                                }`}
                              >
                                +
                              </button>
                            );
                          })()}
                        </div>
                        <div className="text-right">
                          <s className="block text-amber-100/25 text-[10px] not-italic">
                            {formatPrice(
                              item.product.originalPrice * item.quantity,
                            )}
                          </s>
                          <span className="text-amber-400 text-sm font-medium">
                            {formatPrice(
                              item.product.salePrice * item.quantity,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Footer — solo cuando hay items */}
            {items.length > 0 && (
              <div className="border-t border-amber-900/40 px-6 py-5 shrink-0 bg-tobacco-900/40">
                <div className="space-y-2 pb-4 border-b border-dashed border-amber-900/40">
                  <div className="flex justify-between text-xs text-amber-100/30">
                    <span className="tracking-wide">Precio original</span>
                    <s className="not-italic">{formatPrice(subtotal())}</s>
                  </div>
                  <div className="flex justify-between text-xs text-amber-50/70">
                    <span className="tracking-wide">Precio outlet</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="tracking-wide text-amber-400">
                      Descuento outlet
                    </span>
                    <span className="text-amber-400">
                      −{formatPrice(savings())}
                    </span>
                  </div>
                </div>

                <div className="flex items-end justify-between pt-4">
                  <span className="font-serif text-amber-50 text-base">
                    Total
                  </span>
                  <span className="font-serif text-2xl text-amber-50">
                    {formatPrice(total)}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={navigating}
                  onClick={() => {
                    setNavigating(true);
                    closeCart();
                    router.push("/checkout");
                  }}
                  className="btn-shimmer w-full mt-4 bg-amber-400 text-stone-950 text-xs tracking-[0.25em] uppercase py-3.5 font-medium hover:bg-amber-300 transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {navigating && (
                    <LoaderCircle
                      strokeWidth={3}
                      aria-hidden="true"
                      className="animate-spin w-3.5 h-3.5 shrink-0"
                    />
                  )}
                  {navigating ? "Cargando..." : "Proceder al checkout"}
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
