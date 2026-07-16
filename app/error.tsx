"use client";

import { startTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NavHeader from "@/components/home/NavHeader";
import Footer from "@/components/home/Footer";
import { CATEGORIES } from "@/lib/domain/categories";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function StorefrontError({ error, reset }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  // `reset()` por sí solo NO re-fetchea: limpia el estado del boundary y re-renderiza
  // con el mismo payload fallido, así que un error de Server Component (backend caído)
  // reaparece de inmediato. Hay que pedirle datos nuevos al servidor con `refresh()`
  // ANTES de limpiar, ambos en la misma transición.
  //
  // Next expone esto como prop, pero el nombre es inestable (`unstable_retry` en 16.2,
  // `retry` en canary), así que lo componemos con API estable en lugar de depender de él.
  function handleRetry() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <>
      <NavHeader />

      <main className="flex-1 bg-tobacco-950 flex items-center justify-center px-8 py-24 md:py-32">
        <div className="animate-fade-in-up flex flex-col items-center text-center gap-6 max-w-md">
          {/* Stamp — mismo patrón que not-found.tsx / EmptyState.tsx */}
          <div className="border border-amber-400/20 px-6 py-2 rotate-[-4deg]">
            <span className="font-sans text-xs tracking-[0.4em] uppercase text-amber-400/30">
              Error
            </span>
          </div>

          <h1 className="font-serif text-2xl md:text-3xl text-amber-50">
            Algo salió mal
          </h1>

          <p className="font-sans text-amber-100/50 text-sm tracking-wide leading-relaxed">
            No pudimos cargar esta página. Puede ser una falla temporal de
            conexión — vuelve a intentarlo en unos segundos.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
            <button
              type="button"
              onClick={handleRetry}
              className="btn-shimmer bg-amber-400 text-stone-950 text-xs tracking-[0.25em] uppercase py-3.5 px-10 font-medium hover:bg-amber-300 transition-colors cursor-pointer"
            >
              Reintentar
            </button>
            <Link
              href="/"
              className="font-sans text-xs tracking-[0.25em] uppercase text-amber-100/60 hover:text-amber-100 transition-colors py-3.5 px-6"
            >
              Volver al inicio
            </Link>
          </div>

          {/* El digest es la única pista que Next expone en producción: sirve para
              cruzar el error del usuario con el log del servidor. */}
          {error.digest && (
            <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-amber-100/20 mt-2">
              Ref: {error.digest}
            </p>
          )}

          <div className="flex flex-col items-center gap-3 mt-6 pt-6 border-t border-amber-900/30 w-full">
            <span className="text-[10px] tracking-[0.3em] uppercase text-amber-100/30">
              O sigue explorando
            </span>
            <nav
              aria-label="Categorías"
              className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
            >
              {CATEGORIES.map((category) => (
                <Link
                  key={category.type}
                  href={category.href}
                  className="text-xs tracking-[0.2em] uppercase text-amber-100/60 hover:text-amber-100 transition-colors duration-200"
                >
                  Ver {category.plural}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
