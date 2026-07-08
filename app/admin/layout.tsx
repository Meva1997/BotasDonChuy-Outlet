import { Suspense } from "react";
import AdminGuard from "@/components/auth/AdminGuard";

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
