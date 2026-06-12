"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { formatPrice } from "@/lib/utils";

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

  const total = subtotal() - savings();
  const itemCount = totalItems();

  useEffect(() => {
    if (isOpen) setNavigating(false);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label="Carrito de compras"
        aria-modal="true"
        className="fixed right-0 top-0 h-full w-full max-w-sm bg-stone-950 border-l border-amber-900/40 z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-amber-900/40 shrink-0">
          <h2 className="font-serif text-lg text-amber-50">
            Tu corte <span className="italic text-amber-400">final</span>{" "}
            <span className="text-amber-100/50 text-base font-sans not-italic">
              ({itemCount})
            </span>
          </h2>
          <button
            type="button"
            aria-label="Cerrar carrito"
            onClick={closeCart}
            className="text-amber-100/40 hover:text-amber-100 transition-colors p-1 cursor-pointer"
          >
            <svg
              width="18"
              height="18"
              fill="none"
              aria-hidden="true"
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

        {/* Warning banner */}
        <div className="bg-amber-400/10 border-b border-amber-400/20 px-6 py-2.5 shrink-0">
          <p className="text-center text-[10px] tracking-[0.25em] uppercase text-amber-400">
            Estos artículos no se reservan
          </p>
        </div>

        {/* Content */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-8 gap-4">
            <div className="w-16 h-16 border border-amber-900/30 flex items-center justify-center">
              <svg
                width="28"
                height="28"
                fill="none"
                aria-hidden="true"
                className="text-amber-100/20"
                viewBox="0 0 28 28"
              >
                <path
                  stroke="currentColor"
                  strokeLinejoin="round"
                  strokeWidth="1.2"
                  d="M6 7h16l-2 10H8z"
                />
                <circle cx="10.5" cy="21.5" r="1.5" fill="currentColor" />
                <circle cx="17.5" cy="21.5" r="1.5" fill="currentColor" />
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.2"
                  d="M3 4h2l1 3"
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-serif text-amber-50/80 text-base mb-1">
                Tu carrito está vacío
              </p>
              <p className="text-amber-100/30 text-xs tracking-wide">
                Agrega piezas desde el outlet para continuar
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                closeCart();
                router.push("/outlet");
              }}
              className="mt-2 text-xs tracking-[0.2em] uppercase border border-amber-400/40 text-amber-400 px-6 py-2.5 hover:bg-amber-400/10 transition-colors cursor-pointer"
            >
              Ver outlet
            </button>
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto divide-y divide-amber-900/20">
            {items.map((item) => (
              <li key={item.id} className="flex gap-4 px-6 py-5">
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
                  <p className="text-amber-50 text-sm leading-snug truncate pr-2">
                    {item.product.name}
                  </p>
                  <p className="text-amber-100/40 text-xs mt-0.5 capitalize">
                    Talla: {item.size} &middot; {item.product.type}
                  </p>

                  {/* Quantity + price row */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Disminuir cantidad"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                        className="w-6 h-6 border border-amber-900/40 text-amber-100/50 hover:text-amber-100 hover:border-amber-100/40 transition-colors text-xs cursor-pointer"
                      >
                        −
                      </button>
                      <span className="text-amber-50 text-xs w-4 text-center">
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
                            className={`w-6 h-6 border transition-colors text-xs ${
                              atMax
                                ? "border-amber-900/20 text-amber-100/15 cursor-not-allowed"
                                : "border-amber-900/40 text-amber-100/50 hover:text-amber-100 hover:border-amber-100/40 cursor-pointer"
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
                        {formatPrice(item.product.salePrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Remove */}
                <button
                  type="button"
                  aria-label={`Quitar ${item.product.name}`}
                  onClick={() => removeItem(item.id)}
                  className="self-start text-[10px] tracking-widest uppercase text-amber-100/30 hover:text-amber-100/70 transition-colors cursor-pointer pt-0.5"
                >
                  quitar
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Footer — solo cuando hay items */}
        {items.length > 0 && (
          <div className="border-t border-amber-900/40 px-6 py-5 shrink-0 space-y-2">
            <div className="flex justify-between text-xs text-amber-100/30">
              <span className="tracking-wide">Precio original</span>
              <s className="not-italic">{formatPrice(subtotal())}</s>
            </div>
            <div className="flex justify-between text-xs text-amber-50/70">
              <span className="tracking-wide">
                Precio outlet de tus productos juntos
              </span>
              <span>{formatPrice(total)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="tracking-wide text-amber-400">
                Descuento outlet
              </span>
              <span className="text-amber-400">−{formatPrice(savings())}</span>
            </div>
            <div className="flex justify-between text-sm text-amber-50 pt-2 border-t border-amber-900/30">
              <span className="font-medium tracking-wide text-2xl">Total</span>
              <span className="font-medium">{formatPrice(total)}</span>
            </div>
            <button
              type="button"
              disabled={navigating}
              onClick={() => {
                setNavigating(true);
                closeCart();
                router.push("/checkout");
              }}
              className="w-full mt-3 bg-amber-400 text-stone-950 text-xs tracking-[0.25em] uppercase py-3.5 font-medium hover:bg-amber-300 transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {navigating && (
                <svg
                  fill="none"
                  aria-hidden="true"
                  className="animate-spin w-3.5 h-3.5 shrink-0"
                  viewBox="0 0 24 24"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="opacity-25"
                  />
                  <path
                    fill="currentColor"
                    d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4z"
                    className="opacity-75"
                  />
                </svg>
              )}
              {navigating ? "Cargando..." : "Proceder al checkout"}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
