"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Product } from "@/lib/api/products";
import { useCartStore } from "@/store/cartStore";
import { fadeUp, EASE_LUXE } from "@/lib/ui/motion";
import { formatPrice } from "@/lib/utils";
import { categoryHref, categoryPlural } from "@/lib/domain/categories";
import ImageCarousel, {
  type CarouselImage,
} from "@/components/ui/ImageCarousel";

interface ProductInfoProps {
  product: Product;
}

export default function ProductInfo({ product }: ProductInfoProps) {
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [added, setAdded] = useState(false);
  const { addItem, openCart, items: cartItems } = useCartStore();

  const isOutOfStock = product.stock === 0;
  const isLastPiece = product.stock === 1;
  // Producto sin tallas (Fase 24): la existencia se captura como cantidad, sin
  // selector — `product.sizes` es el array del centinela `0` repetido `stock`
  // veces (transparente para el resto de la página), así que aquí se ignora y
  // se agrega directo con size 0, nunca mostrado como "talla 0".
  const isSizeless = !product.hasSizes;

  // Stock disponible por talla (un tamaño puede repetirse en el array)
  const sizeStockMap = product.sizes.reduce<Record<number, number>>(
    (acc, s) => {
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    },
    {},
  );

  const uniqueSizes = [...new Set(product.sizes)].sort((a, b) => a - b);

  function cartQuantityFor(size: number) {
    return (
      cartItems.find((i) => i.id === `${product.id}-${size}`)?.quantity ?? 0
    );
  }

  const effectiveSize = isSizeless ? 0 : selectedSize;

  const selectedSizeAtMax =
    effectiveSize !== null &&
    cartQuantityFor(effectiveSize) >= sizeStockMap[effectiveSize];

  function handleAddToCart() {
    if (effectiveSize === null || selectedSizeAtMax) return;
    addItem(product, effectiveSize);
    openCart();
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  const categoryLabel = categoryPlural(product.type);
  const categoryRoute = categoryHref(product.type);

  // Galería para el carousel: usa la lista de imágenes real (Cloudinary, hasta 3);
  // si el producto aún no tiene galería, cae a `imageSrc` (una foto) o a placeholder.
  const carouselImages: CarouselImage[] =
    product.images && product.images.length > 0
      ? product.images.map((img) => ({ url: img.url, alt: product.name }))
      : product.imageSrc
        ? [{ url: product.imageSrc, alt: product.name }]
        : [];

  return (
    <main className="min-h-dvh bg-tobacco-950">
      {/* Breadcrumb — nav > ol > li es el patrón semántico correcto */}
      <nav
        aria-label="Ruta de navegación"
        className="max-w-6xl mx-auto px-10 md:px-16 pt-4 sm:pt-6 my-10"
      >
        <ol className="flex items-center gap-2 font-sans text-amber-100/35 text-[11px] sm:text-xs tracking-[0.16em] sm:tracking-[0.18em] uppercase list-none overflow-x-auto ">
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
              href={categoryRoute}
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
      <div className="max-w-6xl mx-auto px-10 md:px-16 py-6 sm:py-8 flex flex-col md:flex-row gap-8 md:gap-12 lg:gap-12 my-10 md:my-20">
        {/* ── Columna izquierda — imagen, compacta en móvil, ~42% en desktop ── */}
        <motion.figure
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: EASE_LUXE }}
          className="w-full sm:w-72 md:w-[42%] md:max-w-md shrink-0 m-0 mx-auto sm:mx-0"
        >
          <ImageCarousel
            images={carouselImages}
            className={isOutOfStock ? "grayscale" : ""}
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 18rem, 42vw"
          >
            {/* Discount badge — se superpone sobre la imagen del carousel. */}
            <div className="absolute top-3 left-3 z-10 bg-stone-950/80 border border-amber-400/35 px-3 py-1.5 backdrop-blur-sm">
              <span className="font-sans text-amber-400 text-xs tracking-[0.12em] font-medium">
                −{product.discountPercent}%
              </span>
            </div>

            {isOutOfStock && (
              <>
                {/* Out-of-stock scrim: darkens the photo further, sits under the stamp */}
                <div
                  className="absolute inset-0 bg-stone-950/45 pointer-events-none"
                  aria-hidden="true"
                />
                {/* Agotado stamp — echoes OutletCard.tsx's rubber-stamp motif */}
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  aria-hidden="true"
                >
                  <div className="border border-amber-100/25 bg-stone-950/50 px-3 py-1.5 rotate-[-4deg]">
                    <span className="font-sans text-amber-100/70 text-[10px] tracking-[0.3em] uppercase">
                      Agotado
                    </span>
                  </div>
                </div>
              </>
            )}
          </ImageCarousel>

          {/* Selling-point chips below image */}
          <div className="flex flex-wrap gap-2 mt-4 justify-center sm:justify-start">
            <span className="font-sans text-[10px] tracking-[0.15em] uppercase text-amber-100/45 border border-amber-400/15 px-2.5 py-1 rounded-sm">
              Pieza única
            </span>
            <span className="font-sans text-[10px] tracking-[0.15em] uppercase text-amber-100/45 border border-amber-400/15 px-2.5 py-1 rounded-sm">
              Piel genuina
            </span>
          </div>
        </motion.figure>

        {/* ── Columna derecha (flex-1, ocupa el resto) — información ── */}
        <motion.article
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.6, delay: 0.1, ease: EASE_LUXE }}
          className="flex flex-col gap-5 sm:gap-6 md:gap-7 flex-1 min-w-0"
        >
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <p className="font-sans text-amber-400/70 text-xs tracking-[0.25em] uppercase">
                {categoryLabel} · outlet
              </p>
              {isLastPiece && (
                <span
                  aria-hidden="true"
                  className="font-sans text-tobacco-950 bg-amber-400 text-[10px] tracking-[0.2em] uppercase font-semibold px-2.5 py-1 rounded-sm"
                >
                  Última pieza
                </span>
              )}
            </div>
            <h1 className="font-serif text-amber-50 text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-tight pt-6 md:pt-0">
              {product.name}
            </h1>
          </div>

          {product.description && (
            <p className="font-sans text-amber-100/55 text-sm leading-relaxed max-w-md">
              {product.description}
            </p>
          )}

          {/* Precios — <s> marca semánticamente el precio tachado */}
          <section
            aria-label="Precio"
            className="border-l-2 border-amber-400/40 pl-4 mb-4 md:mb-0"
          >
            <div className="flex items-baseline gap-3 sm:gap-4 flex-wrap">
              <s className="font-sans text-amber-100/35 text-sm line-through">
                {formatPrice(product.originalPrice)}
              </s>
              <strong className="font-serif text-amber-400 text-3xl sm:text-4xl md:text-5xl leading-none font-normal">
                {formatPrice(product.salePrice)}
              </strong>
            </div>
            <p className="font-sans text-amber-100/40 text-xs tracking-wide mt-1.5">
              Ahorras −{product.discountPercent}% sobre el precio original ·
              precio final de outlet
            </p>
          </section>

          {/* Tallas — fieldset + legend agrupa semánticamente controles relacionados.
              Oculto por completo en productos sin tallas (Fase 24). */}
          {!isSizeless && (
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
                  <motion.button
                    key={size}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={isExhausted}
                    onClick={() => setSelectedSize(isSelected ? null : size)}
                    whileHover={isExhausted ? undefined : { y: -2 }}
                    whileTap={isExhausted ? undefined : { scale: 0.95 }}
                    className={`relative w-12 h-12 sm:w-14 sm:h-14 border font-sans text-sm transition-colors duration-150 flex flex-col items-center justify-center gap-0.5 ${
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
                  </motion.button>
                );
              })}
            </div>
          </fieldset>
          )}

          {/* Disponibilidad — role="status" informa cambios a lectores de pantalla */}
          <p
            role="status"
            className={`font-sans text-xs tracking-wide border px-4 py-2 rounded-sm w-fit ${
              isOutOfStock
                ? "text-amber-100/30 border-amber-100/15"
                : "text-amber-100/45 border-amber-400/20"
            }`}
          >
            {isOutOfStock
              ? "Agotado"
              : product.stock === 1
                ? "Última pieza"
                : `Solo ${product.stock} disponibles`}
          </p>

          <motion.button
            type="button"
            onClick={handleAddToCart}
            disabled={
              isOutOfStock || effectiveSize === null || added || selectedSizeAtMax
            }
            whileHover={
              !isOutOfStock && effectiveSize !== null && !added && !selectedSizeAtMax
                ? { scale: 1.015 }
                : undefined
            }
            whileTap={
              !isOutOfStock && effectiveSize !== null && !added && !selectedSizeAtMax
                ? { scale: 0.985 }
                : undefined
            }
            className={`w-full md:max-w-md font-sans text-xs tracking-[0.2em] sm:tracking-[0.25em] uppercase py-3.5 sm:py-4 transition-all duration-200 border ${
              added
                ? "bg-amber-400/20 border-amber-400/60 text-amber-400 cursor-default"
                : isOutOfStock || selectedSizeAtMax
                  ? "bg-transparent border-amber-100/10 text-amber-100/25 cursor-not-allowed"
                  : effectiveSize !== null
                    ? "bg-linear-to-r from-amber-950 to-amber-900 hover:from-amber-900 hover:to-amber-800 border-amber-700/40 hover:border-amber-600/60 text-amber-50 cursor-pointer"
                    : "bg-transparent border-amber-100/10 text-amber-100/25 cursor-not-allowed"
            }`}
          >
            {added
              ? "Agregado al carrito ✓"
              : isOutOfStock
                ? "Agotado"
                : selectedSizeAtMax
                  ? "Ya está en tu carrito"
                  : effectiveSize !== null
                    ? "Agregar al carrito"
                    : "Selecciona una talla"}
          </motion.button>

          {/* <small> es semánticamente correcto para letra chica / avisos legales */}
          <small className="font-sans text-amber-100/25 not-italic leading-relaxed max-w-md block">
            Este producto no se repondrá. Precio de outlet final — sin cambios
            ni devoluciones.
          </small>
        </motion.article>
      </div>
    </main>
  );
}
