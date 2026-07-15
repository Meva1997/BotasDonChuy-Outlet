import type { Metadata } from "next";
import Link from "next/link";
import NavHeader from "@/components/home/NavHeader";
import Footer from "@/components/home/Footer";
import { CATEGORIES } from "@/lib/domain/categories";

export const metadata: Metadata = {
  title: "Página no encontrada",
  description: "La página que buscas no existe o ya no está disponible.",
};

export default function NotFound() {
  return (
    <>
      <NavHeader />

      <main className="flex-1 bg-tobacco-950 flex items-center justify-center px-8 py-24 md:py-32">
        <div className="animate-fade-in-up flex flex-col items-center text-center gap-6 max-w-md">
          {/* Stamp — mismo patrón que EmptyState.tsx */}
          <div className="border border-amber-400/20 px-6 py-2 rotate-[-4deg]">
            <span className="font-sans text-xs tracking-[0.4em] uppercase text-amber-400/30">
              Error 404
            </span>
          </div>

          <p className="font-serif text-7xl md:text-8xl text-amber-50/90 leading-none">
            404
          </p>

          <h1 className="font-serif text-2xl md:text-3xl text-amber-50">
            Esta página no existe
          </h1>

          <p className="font-sans text-amber-100/50 text-sm tracking-wide leading-relaxed">
            El enlace que seguiste no corresponde a ninguna página. Puede que
            haya cambiado de dirección o que la pieza ya se haya agotado.
          </p>

          <Link
            href="/"
            className="btn-shimmer bg-amber-400 text-stone-950 text-xs tracking-[0.25em] uppercase py-3.5 px-10 font-medium hover:bg-amber-300 transition-colors cursor-pointer mt-2"
          >
            Volver al inicio
          </Link>

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
