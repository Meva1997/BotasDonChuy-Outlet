"use client";

import { useState } from "react";
import { InventoryRow } from "./types";
import OrdersPagination from "../orders/OrdersPagination";

const CARDS_PER_PAGE = 5;

function formatMXN(amount: number) {
  return amount.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  });
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0)
    return <span className="text-red-400 font-semibold">Agotado</span>;
  if (stock <= 2)
    return <span className="text-amber-400 font-semibold">{stock} pz</span>;
  return <span className="text-emerald-400 font-semibold">{stock} pz</span>;
}

function TypeBadge({ type }: { type: string }) {
  const label =
    type === "bota" ? "Bota" : type === "sombrero" ? "Sombrero" : type;
  return (
    <span className="text-[10px] tracking-[0.15em] uppercase text-amber-100/40 font-sans">
      {label}
    </span>
  );
}

const th =
  "pb-3 pr-4 last:pr-0 text-[10px] tracking-[0.2em] uppercase text-amber-100/50 font-normal font-sans";
const thR = `${th} text-right`;
const td = "py-3 pr-4 last:pr-0 align-top";
const tdR = `${td} text-right`;

export default function InventoryTable({ rows }: { rows: InventoryRow[] }) {
  const totalPiezas = rows.reduce((s, r) => s + r.stock, 0);
  const totalValor = rows.reduce((s, r) => s + r.valorInventario, 0);

  // Paginación solo para la vista de cards (<1280px, xl:hidden). El date/pager
  // vive dentro del contenedor xl:hidden, así que en escritorio (tabla completa)
  // ni se monta. Guard por si el número de filas cambia y deja la página fuera de rango.
  const [cardPage, setCardPage] = useState(1);
  const totalCardPages = Math.max(1, Math.ceil(rows.length / CARDS_PER_PAGE));
  const safePage = Math.min(cardPage, totalCardPages);
  const pageRows = rows.slice(
    (safePage - 1) * CARDS_PER_PAGE,
    safePage * CARDS_PER_PAGE
  );
  // Cuando hay más de una página, rellenamos la última con cards invisibles hasta
  // completar CARDS_PER_PAGE. Así la altura del contenedor no colapsa al pasar de una
  // página llena (5) a la última corta (1) y se evita el salto/reflow de la página.
  const placeholderCount =
    totalCardPages > 1 ? CARDS_PER_PAGE - pageRows.length : 0;

  return (
    <div className="rounded-lg border border-amber-400/20 bg-stone-900/60 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-6">
        <h2 className="font-serif text-xl text-amber-50">
          Inventario disponible
        </h2>
        <span className="text-xs text-amber-100/40 font-sans">
          {totalPiezas} piezas · valor en costo {formatMXN(totalValor)}
        </span>
      </div>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 xl:hidden">
        {pageRows.map((row) => {
          const margenUnit = row.salePrice - row.unitCost;
          const margenPct = Math.round((margenUnit / row.salePrice) * 100);
          return (
            <div
              key={row.id}
              className="rounded border border-amber-400/10 p-4 flex flex-col gap-3 hover:bg-amber-400/5 transition-colors"
            >
              <div className="flex justify-between items-start gap-2">
                <span className="text-sm text-amber-50 font-medium font-sans leading-snug">
                  {row.name}
                </span>
                <StockBadge stock={row.stock} />
              </div>
              <TypeBadge type={row.type} />
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-amber-400/10">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-amber-100/40 font-sans mb-0.5">
                    Outlet
                  </p>
                  <p className="text-amber-400 text-sm font-sans">
                    {formatMXN(row.salePrice)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-amber-100/40 font-sans mb-0.5">
                    Costo
                  </p>
                  <p className="text-amber-100/60 text-sm font-sans">
                    {formatMXN(row.unitCost)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-amber-100/40 font-sans mb-0.5">
                    Margen
                  </p>
                  <p className="font-sans text-sm">
                    <span className="text-emerald-400">
                      {formatMXN(margenUnit)}
                    </span>
                    <span className="ml-1 text-[10px] text-emerald-400/60">
                      {margenPct}%
                    </span>
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        {/* Cards invisibles que reservan la altura de las filas faltantes en la última
            página (visibility:hidden ocupa espacio). Replican la estructura de una card
            de nombre en una sola línea para que la altura reservada sea representativa. */}
        {Array.from({ length: placeholderCount }).map((_, i) => (
          <div
            key={`placeholder-${i}`}
            aria-hidden
            className="invisible rounded border border-transparent p-4 flex flex-col gap-3"
          >
            <div className="flex justify-between items-start gap-2">
              <span className="text-sm font-medium leading-snug">&nbsp;</span>
            </div>
            <span className="text-[10px] tracking-[0.15em] uppercase">
              &nbsp;
            </span>
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div>
                <p className="text-[10px] mb-0.5">&nbsp;</p>
                <p className="text-sm">&nbsp;</p>
              </div>
              <div>
                <p className="text-[10px] mb-0.5">&nbsp;</p>
                <p className="text-sm">&nbsp;</p>
              </div>
              <div>
                <p className="text-[10px] mb-0.5">&nbsp;</p>
                <p className="text-sm">&nbsp;</p>
              </div>
            </div>
          </div>
        ))}
        <div className="flex justify-between items-center pt-3 border-t border-amber-400/30 px-1">
          <span className="text-xs uppercase tracking-[0.2em] text-amber-100/40 font-sans">
            Total inventario
          </span>
          <div className="text-right">
            <span className="text-amber-50 font-semibold font-sans mr-4">
              {totalPiezas} pz
            </span>
            <span className="text-amber-50 font-semibold font-sans">
              {formatMXN(totalValor)}
            </span>
          </div>
        </div>

        {totalCardPages > 1 && (
          <div className="mt-3">
            <OrdersPagination
              currentPage={safePage}
              totalPages={totalCardPages}
              onPageChange={setCardPage}
            />
          </div>
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden xl:block overflow-x-auto">
        <table className="w-full text-sm font-sans">
          <thead>
            <tr className="border-b border-amber-400/20">
              <th className={th}>Producto</th>
              <th className={th}>Tipo</th>
              <th className={thR}>Stock</th>
              <th className={thR}>Precio outlet</th>
              <th className={thR}>Costo unit.</th>
              <th className={thR}>Margen unit.</th>
              <th className={thR}>Valor restante</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const margenUnit = row.salePrice - row.unitCost;
              const margenPct = Math.round((margenUnit / row.salePrice) * 100);
              return (
                <tr
                  key={row.id}
                  className="border-b border-amber-400/10 hover:bg-amber-400/5 transition-colors"
                >
                  <td className={`${td} text-amber-50 font-medium`}>
                    {row.name}
                  </td>
                  <td className={td}>
                    <TypeBadge type={row.type} />
                  </td>
                  <td className={tdR}>
                    <StockBadge stock={row.stock} />
                  </td>
                  <td className={`${tdR} text-amber-400`}>
                    {formatMXN(row.salePrice)}
                  </td>
                  <td className={`${tdR} text-amber-100/60`}>
                    {formatMXN(row.unitCost)}
                  </td>
                  <td className={`${tdR} whitespace-nowrap`}>
                    <span className="text-emerald-400">
                      {formatMXN(margenUnit)}
                    </span>
                    <span className="ml-2 text-[10px] text-emerald-400/60">
                      {margenPct}%
                    </span>
                  </td>
                  <td className={`${tdR} text-amber-100/70`}>
                    {formatMXN(row.valorInventario)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-amber-400/30">
              <td
                colSpan={2}
                className="pt-4 text-xs uppercase tracking-[0.2em] text-amber-100/40"
              >
                Total
              </td>
              <td className="pt-4 text-right text-amber-50 font-semibold">
                {totalPiezas} pz
              </td>
              <td colSpan={3} />
              <td className="pt-4 text-right text-amber-50 font-semibold">
                {formatMXN(totalValor)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
