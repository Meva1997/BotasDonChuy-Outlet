import { Suspense } from "react";
import type { Metadata } from "next";
import AdminGuard from "@/components/auth/AdminGuard";

// Cubre todo /admin/* — el panel expone unitCost y márgenes, que no deben acabar
// en ningún índice. El `noindex` va aquí (layout) y no en cada página para que
// cualquier sección futura lo herede sin tener que acordarse.
export const metadata: Metadata = {
  title: "Panel de administración",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-tobacco-950 font-sans flex">
        {/* Boundary requerido por useSearchParams (sección/categoría en la URL) */}
        <Suspense>{children}</Suspense>
      </div>
    </AdminGuard>
  );
}
