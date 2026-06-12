"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/store/cartStore";

const NAV_LINKS = [
  { href: "/botas", label: "Botas" },
  { href: "/sombreros", label: "Sombreros" },
  { href: "/ropa", label: "Ropa" },
];

export default function NavHeader() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const { toggleCart, totalItems } = useCartStore();
  const itemCount = mounted ? totalItems() : 0;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <header ref={headerRef} className="border-b border-amber-900/40 relative z-50">
      <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="font-serif text-xl shrink-0">
          <span className="text-amber-50 font-normal">Botas Don Chuy </span>
          <span className="italic text-amber-400">Outlet</span>
        </Link>

        {/* Desktop — nav links (centro) */}
        <nav
          aria-label="Navegación principal"
          className="hidden md:flex items-center gap-10"
        >
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-xs tracking-[0.2em] uppercase text-amber-100/60 hover:text-amber-100 transition-colors duration-200"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Desktop — acciones (derecha) */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/admin"
            className="text-xs tracking-[0.15em] uppercase border border-amber-100/20 text-amber-100/50 px-4 py-2 hover:border-amber-100/40 hover:text-amber-100/80 transition-colors duration-200"
          >
            Admin
          </Link>
          <button
            type="button"
            onClick={toggleCart}
            className="text-xs tracking-[0.15em] uppercase border border-amber-400/60 text-amber-400 px-4 py-2 hover:bg-amber-400/10 transition-colors duration-200 cursor-pointer"
          >
            Carrito ({itemCount})
          </button>
        </div>

        {/* Mobile — solo hamburguesa */}
        <div className="md:hidden">
          <button
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((prev) => !prev)}
            className="text-amber-100/70 hover:text-amber-100 transition-colors p-1 cursor-pointer"
          >
            {open ? (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                <line x1="3" y1="3" x2="19" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="19" y1="3" x2="3" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                <line x1="2" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="2" y1="11" x2="20" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="2" y1="16" x2="20" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile — menú desplegable (solo links + admin, carrito está en el header) */}
      {open && (
        <div
          id="mobile-nav"
          className="md:hidden absolute top-full left-0 right-0 bg-stone-950 border-b border-amber-900/40"
        >
          <nav aria-label="Menú móvil" className="px-8 pt-4 pb-2">
            <ul className="flex flex-col list-none">
              {NAV_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    className="block py-4 text-sm tracking-[0.2em] uppercase text-amber-100/60 hover:text-amber-100 transition-colors duration-200 border-b border-amber-900/30 last:border-0"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="px-8 pb-6 flex flex-col gap-3">
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="block text-center text-xs tracking-[0.15em] uppercase border border-amber-100/20 text-amber-100/50 py-3 hover:border-amber-100/40 hover:text-amber-100/80 transition-colors duration-200"
            >
              Admin
            </Link>
            <button
              type="button"
              onClick={() => { setOpen(false); toggleCart(); }}
              className="block w-full text-center text-xs tracking-[0.15em] uppercase border border-amber-400/60 text-amber-400 py-3 hover:bg-amber-400/10 transition-colors duration-200 cursor-pointer"
            >
              Carrito ({itemCount})
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
