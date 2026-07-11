"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EASE_LUXE } from "@/lib/ui/motion";
import type { AdminSection } from "@/components/admin/types";

const NAV_ITEMS: { id: AdminSection; label: string; badge?: number }[] = [
  { id: "datos", label: "Datos" },
  { id: "pedidos", label: "Pedidos" },
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

/** Contenido interno del sidebar — compartido por la versión desktop (estática)
 *  y el drawer móvil (animado), para no duplicar la navegación. */
function SidebarBody({
  active,
  onSelect,
  onClose,
  showClose,
}: {
  active: AdminSection;
  onSelect: (section: AdminSection) => void;
  onClose: () => void;
  showClose: boolean;
}) {
  return (
    <>
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
        {showClose && (
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="p-1.5 text-amber-100/30 hover:text-amber-100/70 transition-colors cursor-pointer"
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
        )}
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
              onClick={() => onSelect(id)}
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
        <Link
          href="/"
          onClick={onClose}
          className="group flex items-center gap-2.5 text-amber-100/40 hover:text-amber-400 transition-colors mb-4"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform group-hover:-translate-x-0.5"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span className="text-[11px] tracking-[0.25em] uppercase font-medium">
            Volver a la tienda
          </span>
        </Link>
        <p className="text-[9px] tracking-[0.2em] uppercase text-amber-100/25">
          Outlet · Liquidación final
        </p>
      </div>
    </>
  );
}

export default function Sidebar({
  active,
  onChange,
  isOpen,
  onClose,
}: SidebarProps) {
  const reduceMotion = useReducedMotion();

  const handleSelect = (section: AdminSection) => {
    onChange(section);
    onClose();
  };

  return (
    <>
      {/* Desktop — estático, siempre visible */}
      <aside className="hidden md:flex w-72 shrink-0 h-full bg-stone-900 border-r border-amber-400/10 flex-col">
        <SidebarBody
          active={active}
          onSelect={handleSelect}
          onClose={onClose}
          showClose={false}
        />
      </aside>

      {/* Mobile — drawer animado */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              aria-hidden="true"
            />
            <motion.aside
              key="drawer"
              initial={{ x: reduceMotion ? 0 : "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: reduceMotion ? 0 : "-100%" }}
              transition={{ duration: 0.3, ease: EASE_LUXE }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-stone-900 border-r border-amber-400/10 flex flex-col md:hidden"
            >
              <SidebarBody
                active={active}
                onSelect={handleSelect}
                onClose={onClose}
                showClose
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
