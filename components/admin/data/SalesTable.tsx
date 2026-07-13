"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/ui/motion";
import OrdersPagination from "../orders/OrdersPagination";
import { SaleRow } from "./types";

const PER_PAGE = 5;

function formatMXN(amount: number) {
  return amount.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  });
}

// "2026-07-13" → "13 de julio". Se fija a UTC igual que el backend (isoDay),
// para que la etiqueta no ruede un día en hosts al oeste de UTC.
function formatDayLabel(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

const th =
  "pb-3 pr-4 last:pr-0 text-[10px] tracking-[0.2em] uppercase text-amber-100/50 font-normal font-sans";
const thR = `${th} text-right`;
const td = "py-3 pr-4 last:pr-0 align-top";
const tdR = `${td} text-right`;

export default function SalesTable({ sales }: { sales: SaleRow[] }) {
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [page, setPage] = useState(1);

  // Acota el date picker a la ventana realmente cargada (las "últimas 20"): así
  // cualquier día elegido dentro del rango que no tenga ventas es honestamente vacío.
  const { minDay, maxDay } = useMemo(() => {
    const days = sales.map((s) => s.day);
    return {
      minDay: days.length ? days.reduce((a, b) => (a < b ? a : b)) : undefined,
      maxDay: days.length ? days.reduce((a, b) => (a > b ? a : b)) : undefined,
    };
  }, [sales]);

  const filtered = useMemo(
    () => (selectedDay ? sales.filter((s) => s.day === selectedDay) : sales),
    [sales, selectedDay],
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  // currentPage se acota siempre; los handlers de filtro ya resetean a la página 1,
  // así que `page` nunca queda por encima de totalPages.
  const currentPage = Math.min(page, Math.max(1, totalPages));

  const pageItems = filtered.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE,
  );

  const handleDayChange = (value: string) => {
    setSelectedDay(value);
    setPage(1);
  };

  const clearDay = () => {
    setSelectedDay("");
    setPage(1);
  };

  const rangeStart = filtered.length ? (currentPage - 1) * PER_PAGE + 1 : 0;
  const rangeEnd = Math.min(currentPage * PER_PAGE, filtered.length);
  const isEmpty = selectedDay !== "" && filtered.length === 0;

  return (
    <div className="rounded-lg border border-amber-400/20 bg-stone-900/60 p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-xl text-amber-50">
            Últimas ventas del carrito
          </h2>
          <p className="mt-1 text-xs text-amber-100/40 font-sans">
            {filtered.length === 0
              ? selectedDay
                ? "Sin ventas este día"
                : "Sin ventas registradas"
              : `Mostrando ${rangeStart}–${rangeEnd} de ${filtered.length}${
                  selectedDay ? " · día seleccionado" : ""
                }`}
          </p>
        </div>

        <div className="flex items-end gap-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] tracking-[0.2em] uppercase text-amber-100/40 font-sans">
              Ventas del día
            </span>
            <input
              type="date"
              value={selectedDay}
              min={minDay}
              max={maxDay}
              onChange={(e) => handleDayChange(e.target.value)}
              aria-label="Filtrar ventas por día"
              className="bg-stone-900 border border-amber-400/20 text-amber-50 text-sm font-sans px-3 py-2 rounded scheme-dark hover:border-amber-400/40 focus-visible:border-amber-400/60 transition-colors cursor-pointer"
            />
          </label>
          {selectedDay && (
            <button
              type="button"
              onClick={clearDay}
              className="text-[10px] tracking-[0.2em] uppercase text-amber-100/40 border border-amber-400/20 px-3 py-2.5 rounded hover:text-amber-400 hover:border-amber-400/40 transition-colors cursor-pointer"
            >
              ✕ Limpiar
            </button>
          )}
        </div>
      </div>

      {isEmpty ? (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center justify-center gap-3 py-16 text-center"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-400/20 text-2xl">
            🗓
          </div>
          <h3 className="font-serif text-lg text-amber-50/70">
            Sin ventas el {formatDayLabel(selectedDay)}
          </h3>
          <p className="max-w-xs font-sans text-sm text-amber-100/40">
            No se registraron compras del carrito ese día dentro de las ventas
            recientes.
          </p>
          <button
            type="button"
            onClick={clearDay}
            className="mt-2 border border-amber-400/60 text-amber-400 text-[10px] tracking-[0.25em] uppercase px-6 py-2.5 hover:bg-amber-400/10 transition-colors cursor-pointer"
          >
            Ver todas las ventas
          </button>
        </motion.div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="flex flex-col gap-3 xl:hidden">
            {pageItems.map((row) => {
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
                {pageItems.map((row) => {
                  const ganancia = row.total - row.costoTotal;
                  const margen = Math.round((ganancia / row.total) * 100);
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-amber-400/10 hover:bg-amber-400/5 transition-colors"
                    >
                      <td
                        className={`${td} text-amber-100/60 whitespace-nowrap`}
                      >
                        {row.date}
                      </td>
                      <td className={`${tdR} text-amber-50`}>{row.pieces}</td>
                      <td
                        className={`${td} text-amber-100/80 max-w-xs truncate`}
                      >
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

          {totalPages > 1 && (
            <div className="mt-6">
              <OrdersPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
