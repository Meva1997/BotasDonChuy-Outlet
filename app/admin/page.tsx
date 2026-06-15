"use client";

import { useState } from "react";
import Sidebar from "@/components/ui/Sidebar";
import MarcaSection from "@/components/admin/MarcaSection";
import ProductSection from "@/components/admin/ProductSection";
import DataSection from "@/components/admin/DataSection";
import ConfigSection from "@/components/admin/ConfigSection";

export type AdminSection = "marca" | "productos" | "datos" | "configuracion";

export default function AdminPage() {
  const [active, setActive] = useState<AdminSection>("marca");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar
        active={active}
        onChange={setActive}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 overflow-y-auto">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex items-center gap-4 px-6 py-4 bg-stone-950/80 backdrop-blur-sm border-b border-amber-400/10 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
            className="text-amber-100/40 hover:text-amber-100/80 transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-serif text-amber-50 text-sm">Botas Don Chuy</span>
        </div>

        <div className="p-6 md:p-10">
          {active === "marca" && <MarcaSection />}
          {active === "productos" && <ProductSection />}
          {active === "datos" && <DataSection />}
          {active === "configuracion" && <ConfigSection />}
        </div>
      </main>
    </div>
  );
}
