"use client";

import { useEffect } from "react";
import { Playfair_Display, Jost } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/lib/domain/brand";

// Último recurso: el único boundary que atrapa un error del *layout raíz* (o del
// propio error.tsx). Como el fallo está en el layout, React lo descarta entero —
// por eso este archivo tiene que traer su propio <html> y <body>: no hay layout
// sobre el cual montarse.
//
// Consecuencia importante: aquí NO existen QueryProvider, BrandProvider ni
// CartProvider. Por eso no se reusan NavHeader/Footer: renderizarían un botón de
// carrito cuyo drawer no está montado (un control muerto). Todo lo que se ve aquí
// es estático y sale de BRAND.
//
// Solo se activa en producción — en dev, el overlay de Next se pone encima.

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html
      lang="es"
      className={`${playfair.variable} ${jost.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-tobacco-950 text-amber-50 font-sans">
        <main className="flex-1 flex items-center justify-center px-8 py-24">
          <div className="flex flex-col items-center text-center gap-6 max-w-md">
            {/* Stamp — mismo patrón que not-found.tsx / error.tsx / EmptyState.tsx */}
            <div className="border border-amber-400/20 px-6 py-2 rotate-[-4deg]">
              <span className="font-sans text-xs tracking-[0.4em] uppercase text-amber-400/30">
                Error
              </span>
            </div>

            <p className="font-serif text-2xl md:text-3xl text-amber-50/90">
              {BRAND.namePrimary}{" "}
              <span className="italic text-amber-400">{BRAND.nameAccent}</span>
            </p>

            <h1 className="font-serif text-2xl md:text-3xl text-amber-50">
              La página no pudo cargarse
            </h1>

            <p className="font-sans text-amber-100/50 text-sm tracking-wide leading-relaxed">
              Tuvimos una falla inesperada al armar el sitio. Vuelve a intentarlo
              en unos segundos.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
              {/* `reset()` re-monta el árbol completo, layout raíz incluido: es lo
                  máximo que se puede reintentar desde aquí. */}
              <button
                type="button"
                onClick={() => reset()}
                className="bg-amber-400 text-stone-950 text-xs tracking-[0.25em] uppercase py-3.5 px-10 font-medium hover:bg-amber-300 transition-colors cursor-pointer"
              >
                Reintentar
              </button>
              {/* <a> y no <Link>: el router vive en el layout que acaba de fallar.
                  Una recarga completa es justo lo que se quiere. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                className="font-sans text-xs tracking-[0.25em] uppercase text-amber-100/60 hover:text-amber-100 transition-colors py-3.5 px-6"
              >
                Volver al inicio
              </a>
            </div>

            {error.digest && (
              <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-amber-100/20 mt-2">
                Ref: {error.digest}
              </p>
            )}
          </div>
        </main>
      </body>
    </html>
  );
}
