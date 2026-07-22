import { Suspense } from "react";
import type { Metadata } from "next";
import { Toaster } from "sileo";
import "sileo/styles.css";
import AdminGuard from "@/components/auth/AdminGuard";

// Cubre todo /admin/* — el panel expone unitCost y márgenes, que no deben acabar
// en ningún índice. El `noindex` va aquí (layout) y no en cada página para que
// cualquier sección futura lo herede sin tener que acordarse.
export const metadata: Metadata = {
  title: "Panel de administración",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-tobacco-950 font-sans flex">
        {/* Boundary requerido por useSearchParams (sección/categoría en la URL) */}
        <Suspense>{children}</Suspense>
      </div>
      {/* Único consumidor hoy: OrdersSection (toast de polling, ver CLAUDE.md).
          Montado aquí (no en el root layout) para no cargar Sileo en el storefront público.
          `theme="light"` resuelve `data-theme="light"`, que es lo que hace que el texto de
          Sileo se pinte claro (su CSS interno asume pill oscura en ese theme); `fill` fija
          esa pill a negro puro en vez de su default (#1a1a1a). `styles.description` sube la
          opacidad del texto de descripción (blanco/50% por defecto → blanco/75%, más legible).
          El resto del theming (tamaño de pill, tipografía, acento "info" ámbar) vive en
          globals.css. */}
      <Toaster
        theme="light"
        position="top-center"
        offset={{ top: 16 }}
        options={{ fill: "#000000", styles: { description: "text-white/75!" } }}
      />
    </AdminGuard>
  );
}
