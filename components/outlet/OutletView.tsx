"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import OutletCard from "@/components/outlet/OutletCard";
import EmptyState from "@/components/outlet/EmptyState";
import OutletFilters from "@/components/outlet/OutletFilters";
import OutletPagination from "@/components/outlet/OutletPagination";
import { fadeUp, staggerContainer, EASE_LUXE } from "@/lib/ui/motion";
import {
  getProducts,
  productKeys,
  type ProductFilters,
} from "@/lib/api/products";
import { categoryHref, categoryPlural } from "@/lib/domain/categories";
import {
  hasActiveFilters,
  isInvertedPriceRange,
  parseOrdenParam,
  parsePageParam,
  parsePriceParam,
  parseSearchParam,
  parseTallaParam,
} from "@/lib/domain/catalogFilters";

const TRUST_SIGNALS = [
  "Piezas únicas · sin reposición",
  "Calidad de piel verificada",
  "Envío a todo México",
];

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
  const talla = parseTallaParam(searchParams.get("talla"));
  const page = parsePageParam(searchParams.get("pagina"));
  const orden = parseOrdenParam(searchParams.get("orden"));

  // Texto crudo de los tres campos con debounce: es lo que se pinta en los
  // inputs. La versión saneada (la de abajo) es la que viaja al backend y al
  // queryKey — ver el comentario de `qText` en OutletFilters.
  const qText = searchParams.get("q") ?? "";
  const precioMinText = searchParams.get("precioMin") ?? "";
  const precioMaxText = searchParams.get("precioMax") ?? "";

  const q = parseSearchParam(qText);
  const precioMin = parsePriceParam(precioMinText);
  const precioMax = parsePriceParam(precioMaxText);

  const filters: ProductFilters = {
    categoria,
    talla,
    page,
    q,
    orden,
    precioMin,
    precioMax,
  };

  const {
    data: result,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: productKeys.filtered(filters),
    queryFn: () => getProducts(filters),
    // Mantiene visible la página/filtro anterior mientras carga el nuevo → sin flash a vacío.
    placeholderData: keepPreviousData,
    // El admin corre en otra pestaña con su propio QueryClient — al volver el foco a
    // esta pestaña tras crear/borrar un producto, se refresca sola (sin polling).
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  // Escribe varios params de una sola vez (los tres campos con debounce se
  // comitean juntos, no en tres navegaciones encadenadas).
  //
  // `replace` es para esos campos de texto: con `push`, cada commit del debounce
  // dejaría una entrada de historial y el botón «atrás» haría recorrer «b», «bo»,
  // «bot»… Los controles que son un clic deliberado (categoría, talla, orden,
  // página) sí empujan historial.
  const updateParams = useCallback(
    (entries: Record<string, string | null>, opts?: { replace?: boolean }) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(entries)) {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      // Cambiar cualquier filtro vuelve a la página 1: la página actual puede no
      // existir en el resultado nuevo y el backend la clampea sin avisar.
      if (!("pagina" in entries)) params.delete("pagina");
      const query = params.toString();
      const url = query ? `?${query}` : window.location.pathname;
      if (opts?.replace) {
        router.replace(url);
      } else {
        router.push(url);
      }
    },
    [router, searchParams],
  );

  const updateParam = useCallback(
    (key: string, value: string | null) => updateParams({ [key]: value }),
    [updateParams],
  );

  // En /botas, /sombreros y /ropa la categoría la fija la ruta, no un query
  // param — el select sigue visible (ver showCategoria más abajo) para poder
  // cambiar de categoría sin volver al NavHeader, pero cambiarla aquí significa
  // navegar a la ruta dedicada de la nueva categoría (o a /outlet para "Todas"),
  // conservando el resto de los filtros ya puestos.
  const onCategoriaChange = useCallback(
    (val: string | null) => {
      if (!defaultCategoria) {
        updateParam("categoria", val);
        return;
      }
      const targetPath = val ? categoryHref(val) : "/outlet";
      const params = new URLSearchParams(searchParams.toString());
      params.delete("categoria");
      params.delete("pagina");
      const query = params.toString();
      router.push(query ? `${targetPath}?${query}` : targetPath);
    },
    [defaultCategoria, router, searchParams, updateParam],
  );

  // Los tres campos de texto llegan crudos desde el input: "" significa quitar
  // el param. No se recortan ni se validan aquí — el saneo pasa al leer la URL,
  // y trimear en el commit borraría el espacio que el comprador acaba de teclear
  // en medio de una frase.
  const commitTextFilters = useCallback(
    (next: { q: string; precioMin: string; precioMax: string }) => {
      updateParams(
        {
          q: next.q || null,
          precioMin: next.precioMin || null,
          precioMax: next.precioMax || null,
        },
        { replace: true },
      );
    },
    [updateParams],
  );

  const filtersActive = hasActiveFilters(
    { categoria, talla, q, orden, precioMin, precioMax },
    { ignoreCategoria: !!defaultCategoria },
  );

  // En /botas, /sombreros y /ropa la categoría la fija la ruta: limpiar no debe
  // sacar al comprador de la sección en la que entró.
  const clearFilters = useCallback(() => {
    updateParams({
      q: null,
      orden: null,
      precioMin: null,
      precioMax: null,
      talla: null,
      pagina: null,
      ...(defaultCategoria ? {} : { categoria: null }),
    });
  }, [updateParams, defaultCategoria]);

  const title = categoria
    ? `Outlet — ${categoryPlural(categoria)}`
    : "Outlet — todo";

  // Mensaje del estado vacío con filtros puestos. El rango invertido va primero
  // porque es la causa que el comprador no vería de otro modo: el backend no lo
  // corrige, devuelve cero resultados a propósito.
  const emptyMessage = isInvertedPriceRange(precioMin, precioMax)
    ? "El precio mínimo es mayor que el máximo, así que ninguna pieza puede entrar en ese rango."
    : q
      ? `Ninguna pieza coincide con «${q}» y los filtros que elegiste. Prueba con otro término o quita algún filtro.`
      : "Ninguna pieza coincide con los filtros que elegiste. Prueba quitando alguno.";

  return (
    <section className="min-h-dvh bg-tobacco-950 px-6 md:p-10 py-6 md:py-12 my-4 md:mb-20 md:mt-2">
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

      {/* Filters — categoria select always shows (even on /botas /sombreros /ropa,
          so switching categories doesn't require going back through NavHeader);
          talla select only appears when a category is active */}
      <OutletFilters
        showCategoria
        showTalla={!!categoria}
        selectedCategoria={categoria}
        selectedTalla={talla}
        selectedOrden={orden}
        qText={qText}
        precioMinText={precioMinText}
        precioMaxText={precioMaxText}
        invertedPriceRange={isInvertedPriceRange(precioMin, precioMax)}
        // availableSizes ya viene acotado por `q` y por el rango de precio desde
        // el backend (pero no por la talla elegida): nunca ofrece una talla que
        // daría cero resultados, así que aquí no se filtra nada.
        availableSizes={result?.availableSizes ?? []}
        total={result?.total}
        filtersActive={filtersActive}
        onCategoriaChange={onCategoriaChange}
        onTallaChange={(val) => updateParam("talla", val)}
        onOrdenChange={(val) => updateParam("orden", val)}
        onTextFiltersCommit={commitTextFilters}
        onClearFilters={clearFilters}
      />

      {/* Loading state — only on first load, keepPreviousData covers subsequent fetches */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-amber-400/25 border-t-amber-400 animate-spin" />
          <p className="font-sans text-amber-100/40 text-sm tracking-wide">
            Cargando piezas…
          </p>
        </div>
      )}

      {/* Error state — e.g. backend unreachable */}
      {isError && !result && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="border border-amber-400/20 px-6 py-2 rotate-[-4deg] mb-2">
            <span className="font-sans text-xs tracking-[0.4em] uppercase text-amber-400/30">
              Error
            </span>
          </div>
          <h3 className="font-serif text-amber-50/60 text-xl">
            No se pudo cargar el inventario
          </h3>
          <p className="font-sans text-amber-100/30 text-sm tracking-wide text-center max-w-xs">
            Revisa tu conexión e intenta de nuevo.
          </p>
          <button
            onClick={() => refetch()}
            className="mt-2 font-sans text-xs tracking-[0.2em] uppercase text-amber-400 border border-amber-400/40 px-5 py-2.5 hover:bg-amber-400/10 transition-colors duration-200"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Product grid */}
      {result && (
        <>
          {result.products.length === 0 ? (
            filtersActive ? (
              // Con filtros activos el catálogo sí tiene piezas: lo que falla es
              // la búsqueda. Sin la salida a limpiar, el comprador se queda
              // atorado en un outlet aparentemente vacío.
              <EmptyState
                stamp="Sin resultados"
                title="No encontramos nada"
                message={emptyMessage}
                action={
                  <button
                    onClick={clearFilters}
                    className="mt-2 font-sans text-xs tracking-[0.2em] uppercase text-amber-400 border border-amber-400/40 px-5 py-2.5 hover:bg-amber-400/10 transition-colors duration-200"
                  >
                    Limpiar filtros
                  </button>
                }
              />
            ) : (
              <EmptyState
                title="Sin productos disponibles"
                message="No hay piezas en esta categoría por el momento. Vuelve pronto — el inventario cambia constantemente."
              />
            )
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${categoria ?? "all"}-${talla ?? "all"}-${q ?? ""}-${orden ?? ""}-${precioMin ?? ""}-${precioMax ?? ""}-${page}`}
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 auto-rows-fr gap-5 max-w-6xl mx-auto"
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
                    imageSrc={product.imageSrc ?? undefined}
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
