"use client";

import { useState } from "react";
import Sidebar from "@/components/ui/Sidebar";
import MarcaSection from "@/components/admin/MarcaSection";

export type AdminSection = "marca" | "productos" | "datos" | "configuracion";

export default function AdminPage() {
  const [active, setActive] = useState<AdminSection>("marca");

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar active={active} onChange={setActive} />
      <main className="flex-1 overflow-y-auto p-10">
        {active === "marca" && <MarcaSection />}
        {active === "productos" && <Placeholder title="Productos" desc="Gestión del catálogo de productos." />}
        {active === "datos" && <Placeholder title="Datos" desc="Estadísticas y métricas de la tienda." />}
        {active === "configuracion" && <Placeholder title="Configuración" desc="Ajustes generales del panel." />}
      </main>
    </div>
  );
}

function Placeholder({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="max-w-2xl">
      <h2 className="font-serif text-amber-50 text-3xl mb-2">{title}</h2>
      <p className="text-amber-100/40 text-sm">{desc} — próximamente.</p>
    </div>
  );
}
