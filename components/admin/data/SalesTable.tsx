"use client";

import { SaleRow } from "./types";

function formatMXN(amount: number) {
  return amount.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  });
}

const th =
  "pb-3 pr-4 last:pr-0 text-[10px] tracking-[0.2em] uppercase text-amber-100/50 font-normal font-sans";
const thR = `${th} text-right`;
const td = "py-3 pr-4 last:pr-0 align-top";
const tdR = `${td} text-right`;

export default function SalesTable({ sales }: { sales: SaleRow[] }) {
  return (
    <div className="rounded-lg border border-amber-400/20 bg-stone-900/60 p-4 sm:p-6">
      <h2 className="font-serif text-xl text-amber-50 mb-6">
        Últimas ventas del carrito
      </h2>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 xl:hidden">
        {sales.map((row) => {
          const ganancia = row.total - row.costoTotal;
          const margen = Math.round((ganancia / row.total) * 100);
          return (
            <div
              key={row.id}
              className="rounded border border-amber-400/10 p-4 flex flex-col gap-2 hover:bg-amber-400/5 transition-colors"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs text-amber-100/60 font-sans">
                  {row.date}
                </span>
                <span className="text-xs text-amber-100/50 font-sans">
                  {row.pieces} pz
                </span>
              </div>
              <p className="text-sm text-amber-100/80 font-sans leading-snug">
                {row.items}
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-amber-400/10">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-amber-100/40 font-sans mb-0.5">
                    Total
                  </p>
                  <p className="text-amber-400 font-semibold font-sans">
                    {formatMXN(row.total)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-amber-100/40 font-sans mb-0.5">
                    Ganancia
                  </p>
                  <p className="font-sans">
                    <span className="text-emerald-400 font-semibold">
                      {formatMXN(ganancia)}
                    </span>
                    <span className="ml-1.5 text-[10px] text-emerald-400/60">
                      {margen}%
                    </span>
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden xl:block overflow-x-auto">
        <table className="w-full text-sm font-sans">
          <thead>
            <tr className="border-b border-amber-400/20">
              <th className={th}>Fecha</th>
              <th className={thR}>Piezas</th>
              <th className={th}>Artículos</th>
              <th className={thR}>Ahorro otorgado</th>
              <th className={thR}>Total</th>
              <th className={thR}>Ganancia</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((row) => {
              const ganancia = row.total - row.costoTotal;
              const margen = Math.round((ganancia / row.total) * 100);
              return (
                <tr
                  key={row.id}
                  className="border-b border-amber-400/10 hover:bg-amber-400/5 transition-colors"
                >
                  <td className={`${td} text-amber-100/60 whitespace-nowrap`}>
                    {row.date}
                  </td>
                  <td className={`${tdR} text-amber-50`}>{row.pieces}</td>
                  <td className={`${td} text-amber-100/80 max-w-xs truncate`}>
                    {row.items}
                  </td>
                  <td className={`${tdR} text-amber-100/60`}>
                    {formatMXN(row.savings)}
                  </td>
                  <td className={`${tdR} font-semibold text-amber-400`}>
                    {formatMXN(row.total)}
                  </td>
                  <td className={`${tdR} whitespace-nowrap`}>
                    <span className="text-emerald-400 font-semibold">
                      {formatMXN(ganancia)}
                    </span>
                    <span className="ml-2 text-[10px] text-emerald-400/60">
                      {margen}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
