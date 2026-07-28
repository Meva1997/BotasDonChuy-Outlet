"use client";

import type { SizeChange } from "@/lib/api/adminProductImport";
import { pieceCount } from "./labels";

// La aritmética del stock por talla — el bloque más importante de la pantalla.
//
// `added` se SUMA a `before`, no lo reemplaza, y eso es lo que no se puede deshacer desde el
// panel. Por eso se pinta como una ecuación explícita (12 + 20 = 32) y con más peso visual que
// los precios: si el dueño tecleó "26x200" en vez de "26x20", este número es donde lo ve.

export default function ImportSizeDiff({ sizeChanges }: { sizeChanges: SizeChange[] }) {
  if (sizeChanges.length === 0) return null;

  const totalAdded = sizeChanges.reduce((sum, change) => sum + change.added, 0);
  const totalAfter = sizeChanges.reduce((sum, change) => sum + change.after, 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-[10px] tracking-[0.25em] uppercase text-amber-100/40">
          Stock por talla
        </p>
        <p className="text-[11px] text-amber-100/40 tabular-nums">
          {totalAdded !== 0 && (
            <span className={totalAdded > 0 ? "text-emerald-400" : "text-red-400"}>
              {totalAdded > 0 ? "+" : "−"}
              {pieceCount(Math.abs(totalAdded))}
            </span>
          )}
          {totalAdded !== 0 && " · "}
          <span>quedan {pieceCount(totalAfter)}</span>
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm font-sans">
          <caption className="sr-only">
            Piezas que se suman al stock guardado, por talla
          </caption>
          <thead>
            <tr className="border-b border-amber-400/20">
              <th
                scope="col"
                className="pb-2 pr-4 text-left text-[10px] tracking-[0.2em] uppercase text-amber-100/50 font-normal"
              >
                Talla
              </th>
              <th
                scope="col"
                className="pb-2 pr-3 text-right text-[10px] tracking-[0.2em] uppercase text-amber-100/50 font-normal"
              >
                Tiene
              </th>
              <th
                scope="col"
                className="pb-2 pr-3 text-right text-[10px] tracking-[0.2em] uppercase text-amber-100/50 font-normal"
              >
                Se suma
              </th>
              <th scope="col" className="pb-2 pr-3 w-4">
                <span className="sr-only">igual a</span>
              </th>
              <th
                scope="col"
                className="pb-2 text-right text-[10px] tracking-[0.2em] uppercase text-amber-100/50 font-normal"
              >
                Queda
              </th>
            </tr>
          </thead>
          <tbody>
            {sizeChanges.map((change) => {
              const untouched = change.added === 0;
              return (
                <tr
                  key={change.size}
                  className={`border-b border-amber-400/10 last:border-0 ${untouched ? "opacity-40" : ""}`}
                >
                  <th
                    scope="row"
                    className="py-2.5 pr-4 text-left font-mono text-amber-50 tabular-nums font-normal"
                  >
                    {change.size}
                  </th>
                  <td className="py-2.5 pr-3 text-right text-amber-100/35 tabular-nums font-mono">
                    {change.before}
                  </td>
                  <td
                    className={`py-2.5 pr-3 text-right tabular-nums font-mono ${
                      change.added > 0
                        ? "text-emerald-400"
                        : change.added < 0
                          ? "text-red-400"
                          : "text-amber-100/25"
                    }`}
                  >
                    {/* Un `added` negativo con "+" literal imprimiría "+-3". */}
                    {change.added === 0
                      ? "—"
                      : `${change.added > 0 ? "+" : "−"}${Math.abs(change.added)}`}
                  </td>
                  <td
                    aria-hidden="true"
                    className="py-2.5 pr-3 text-center text-amber-400/40 select-none font-mono"
                  >
                    =
                  </td>
                  <td className="py-2.5 text-right text-amber-50 tabular-nums font-mono text-base">
                    {change.after}
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
