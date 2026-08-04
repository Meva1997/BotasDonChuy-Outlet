"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/admin/Sidebar";
import MarcaSection from "@/components/admin/sections/MarcaSection";
import ProductSection from "@/components/admin/sections/ProductSection";
import DataSection from "@/components/admin/sections/DataSection";
import ConfigSection from "@/components/admin/sections/ConfigSection";
import ReportesSection from "@/components/admin/sections/ReportesSection";
import OrdersSection from "@/components/admin/sections/OrdersSection";
import ImportSection from "@/components/admin/sections/ImportSection";
import CouponsSection from "@/components/admin/sections/CouponsSection";
import ExpensesSection from "@/components/admin/sections/ExpensesSection";
import type { AdminSection } from "@/components/admin/types";

const VALID_SECTIONS: AdminSection[] = [
  "marca",
  "productos",
  "importar",
  "cupones",
  "datos",
  "pedidos",
  "reportes",
  "gastos",
  "configuracion",
];

export default function AdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // La sección activa vive en la URL (?seccion=...) para sobrevivir al refresh.
  // Param inválido o ausente → "datos".
  const param = searchParams.get("seccion");
  const active: AdminSection = VALID_SECTIONS.includes(param as AdminSection)
    ? (param as AdminSection)
    : "datos";

  const handleChange = (section: AdminSection) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("seccion", section);
    // Al salir de una sección se descarta su sub-vista (categoría de Productos).
    params.delete("categoria");
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar
        active={active}
        onChange={handleChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 overflow-y-auto">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex items-center gap-4 px-6 py-4 bg-tobacco-950/80 backdrop-blur-sm border-b border-amber-400/10 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
            className="text-amber-100/40 hover:text-amber-100/80 transition-colors cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-serif text-amber-50 text-sm">
            Botas Don Chuy
          </span>
        </div>

        <div className="p-6 md:p-10">
          {active === "marca" && <MarcaSection />}
          {active === "productos" && <ProductSection />}
          {active === "importar" && <ImportSection />}
          {active === "cupones" && <CouponsSection />}
          {active === "datos" && <DataSection />}
          {active === "pedidos" && <OrdersSection />}
          {active === "reportes" && <ReportesSection />}
          {active === "gastos" && <ExpensesSection />}
          {active === "configuracion" && <ConfigSection />}
        </div>
      </main>
    </div>
  );
}
