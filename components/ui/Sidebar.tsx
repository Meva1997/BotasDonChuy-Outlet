"use client";

import type { AdminSection } from "@/app/admin/page";

const NAV_ITEMS: { id: AdminSection; label: string; badge?: number }[] = [
  { id: "datos", label: "Datos" },
  { id: "reportes", label: "Reportes" },
  { id: "productos", label: "Productos" },
  { id: "marca", label: "Marca" },
  { id: "configuracion", label: "Configuración" },
];

interface SidebarProps {
  active: AdminSection;
  onChange: (section: AdminSection) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({
  active,
  onChange,
  isOpen,
  onClose,
}: SidebarProps) {
  const handleSelect = (section: AdminSection) => {
    onChange(section);
    onClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        className={[
          "fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 md:hidden",
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        ].join(" ")}
      />

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 w-72 shrink-0 bg-stone-900 border-r border-amber-400/10 flex flex-col",
          "transition-transform duration-300 ease-in-out",
          "md:static md:translate-x-0 md:h-full",
          isOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Brand header */}
        <div className="px-7 py-6 border-b border-amber-400/10 flex items-center justify-between">
          <div>
            <p className="text-[9px] tracking-[0.35em] uppercase text-amber-400/40 mb-1.5">
              Panel de control
            </p>
            <h1 className="font-serif text-amber-50 text-lg leading-tight">
              Botas Don Chuy
            </h1>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="md:hidden p-1.5 text-amber-100/30 hover:text-amber-100/70 transition-colors cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 pt-5 pb-4">
          <p className="px-7 text-[9px] tracking-[0.35em] uppercase text-amber-400/30 mb-3">
            Secciones
          </p>
          {NAV_ITEMS.map(({ id, label, badge }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => handleSelect(id)}
                className={[
                  "w-full text-left px-7 py-3.5 flex items-center justify-between",
                  "transition-all duration-150 group border-l-2 cursor-pointer",
                  isActive
                    ? "bg-stone-800 border-amber-400 text-amber-400"
                    : "border-transparent text-amber-100/35 hover:text-amber-100/65 hover:bg-stone-800/40",
                ].join(" ")}
              >
                <span className="text-[11px] tracking-[0.25em] uppercase font-medium">
                  {label}
                </span>
                {badge !== undefined && (
                  <span
                    className={[
                      "text-[10px] font-mono px-1.5 py-0.5 rounded-sm",
                      isActive
                        ? "bg-amber-400/15 text-amber-400"
                        : "bg-stone-700/80 text-amber-100/25 group-hover:text-amber-100/40",
                    ].join(" ")}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-7 py-5 border-t border-amber-400/10">
          <p className="text-[9px] tracking-[0.2em] uppercase text-amber-100/15">
            Outlet · Liquidación final
          </p>
        </div>
      </aside>
    </>
  );
}
