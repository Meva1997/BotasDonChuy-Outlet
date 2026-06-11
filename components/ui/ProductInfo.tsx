"use client";

import { useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/getProducts";
import { useCartStore } from "@/store/cartStore";

const CATEGORY_LABELS: Record<string, string> = {
  bota: "Botas",
  sombrero: "Sombreros",
  ropa: "Ropa",
};

interface ProductInfoProps {
  product: Product;
}

export default function ProductInfo({ product }: ProductInfoProps) {
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [added, setAdded] = useState(false);
  const { addItem, openCart, items: cartItems } = useCartStore();

  // Stock disponible por talla (un tamaño puede repetirse en el array)
  const sizeStockMap = product.sizes.reduce<Record<number, number>>((acc, s) => {
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const uniqueSizes = [...new Set(product.sizes)].sort((a, b) => a - b);

  function cartQuantityFor(size: number) {
    return cartItems.find((i) => i.id === `${product.id}-${size}`)?.quantity ?? 0;
  }

  const selectedSizeAtMax =
    selectedSize !== null &&
    cartQuantityFor(selectedSize) >= sizeStockMap[selectedSize];

  function handleAddToCart() {
    if (!selectedSize || selectedSizeAtMax) return;
    addItem(product, selectedSize);
    openCart();
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  const formatPrice = (n: number) =>
    n.toLocaleString("es-MX", { minimumFractionDigits: 0 });

  const categoryLabel = CATEGORY_LABELS[product.type] ?? product.type;

  return (
    <main className="min-h-screen bg-stone-950">
      {/* Breadcrumb — nav > ol > li es el patrón semántico correcto */}
      <nav aria-label="Ruta de navegación" className="px-8 md:px-16 pt-6 pb-2">
        <ol className="flex items-center gap-2 font-sans text-amber-100/35 text-xs tracking-[0.18em] uppercase list-none">
          <li>
            <Link
              href="/"
              className="hover:text-amber-100/60 transition-colors"
            >
              Inicio
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href="/outlet"
              className="hover:text-amber-100/60 transition-colors"
            >
              {categoryLabel}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-amber-100/55">
            {product.name.toUpperCase()}
          </li>
        </ol>
      </nav>

      {/* Contenido principal: dos columnas en desktop, apilado en móvil */}
      <div className="px-8 md:px-16 py-8 flex flex-col md:flex-row gap-12 lg:gap-20">
        {/* ── Columna izquierda (45% en desktop) — imagen ── */}
        <figure className="w-full md:w-[45%] shrink-0 m-0">
          <div
            role="img"
            aria-label={`Fotografía de ${product.name}`}
            className="relative w-full aspect-square rounded-sm overflow-hidden"
            style={{
              backgroundImage: product.imageSrc
                ? `url(${product.imageSrc})`
                : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: "#1c1209",
            }}
          >
            {/* Viñeta decorativa */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#2c1a08_0%,#0d0a06_70%)]"
            />

            {/* Textura de grano */}
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-25"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E\")",
                backgroundSize: "128px 128px",
              }}
            />
          </div>
        </figure>

        {/* ── Columna derecha (flex-1, ocupa el resto) — información ── */}
        <article className="flex flex-col gap-7 flex-1">
          <h1 className="font-serif text-amber-50 text-4xl md:text-5xl leading-tight">
            {product.name}
          </h1>

          {product.description && (
            <p className="font-sans text-amber-100/55 text-sm leading-relaxed max-w-md">
              {product.description}
            </p>
          )}

          {/* Precios — <s> marca semánticamente el precio tachado */}
          <section aria-label="Precio">
            <div className="flex items-baseline gap-4">
              <s className="font-sans text-amber-100/35 text-sm line-through">
                ${formatPrice(product.originalPrice)}
              </s>
              <strong className="font-serif text-amber-400 text-5xl leading-none font-normal">
                ${formatPrice(product.salePrice)}
              </strong>
            </div>
            <p className="font-sans text-amber-100/35 text-xs tracking-wide mt-1">
              −{product.discountPercent}% sobre el precio original
            </p>
          </section>

          {/* Tallas — fieldset + legend agrupa semánticamente controles relacionados */}
          <fieldset className="border-0 p-0 m-0 flex flex-col gap-3">
            <legend className="font-sans text-amber-100/50 text-xs tracking-[0.22em] uppercase mb-1">
              Talla
            </legend>
            <div className="flex flex-wrap gap-2">
              {uniqueSizes.map((size) => {
                const stock = sizeStockMap[size];
                const inCart = cartQuantityFor(size);
                const isExhausted = inCart >= stock;
                const isSelected = selectedSize === size;

                return (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={isExhausted}
                    onClick={() =>
                      setSelectedSize(isSelected ? null : size)
                    }
                    className={`relative w-14 h-14 border font-sans text-sm transition-all duration-150 flex flex-col items-center justify-center gap-0.5 ${
                      isExhausted
                        ? "border-amber-900/20 text-amber-100/15 cursor-not-allowed"
                        : isSelected
                        ? "border-amber-400 text-amber-400 bg-amber-400/10 cursor-pointer"
                        : "border-amber-400/25 text-amber-100/55 hover:border-amber-400/55 hover:text-amber-100/80 cursor-pointer"
                    }`}
                  >
                    <span>{size}</span>
                    {stock > 1 && !isExhausted && (
                      <span className="text-[9px] tracking-wide text-amber-100/30 leading-none">
                        ×{stock - inCart}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Disponibilidad — role="status" informa cambios a lectores de pantalla */}
          <p
            role="status"
            className="font-sans text-amber-100/45 text-xs tracking-wide border border-amber-400/20 px-4 py-2 rounded-sm w-fit"
          >
            {product.stock === 1
              ? "Última pieza"
              : `Solo ${product.stock} disponibles`}
          </p>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!selectedSize || added || selectedSizeAtMax}
            className={`w-full md:max-w-md font-sans text-xs tracking-[0.25em] uppercase py-4 transition-all duration-200 border ${
              added
                ? "bg-amber-400/20 border-amber-400/60 text-amber-400 cursor-default"
                : selectedSizeAtMax
                ? "bg-transparent border-amber-100/10 text-amber-100/25 cursor-not-allowed"
                : selectedSize
                ? "bg-linear-to-r from-amber-950 to-amber-900 hover:from-amber-900 hover:to-amber-800 border-amber-700/40 hover:border-amber-600/60 text-amber-50 cursor-pointer"
                : "bg-transparent border-amber-100/10 text-amber-100/25 cursor-not-allowed"
            }`}
          >
            {added
              ? "Agregado al carrito ✓"
              : selectedSizeAtMax
              ? "Ya está en tu carrito"
              : selectedSize
              ? "Agregar al carrito"
              : "Selecciona una talla"}
          </button>

          {/* <small> es semánticamente correcto para letra chica / avisos legales */}
          <small className="font-sans text-amber-100/25 not-italic leading-relaxed max-w-md block">
            Este producto no se repondrá. Precio de outlet final — sin cambios
            ni devoluciones.
          </small>
        </article>
      </div>
    </main>
  );
}
