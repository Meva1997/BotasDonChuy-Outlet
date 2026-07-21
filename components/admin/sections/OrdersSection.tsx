"use client";

import { useState, useSyncExternalStore } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { adminOrderKeys, getAdminOrders, type AdminOrder } from "@/lib/api/adminOrders";
import OrdersTable from "../orders/OrdersTable";
import OrdersPagination from "../orders/OrdersPagination";
import OrderDetailModal from "../orders/OrderDetailModal";

const PER_PAGE_DESKTOP = 20;
const PER_PAGE_MOBILE = 5;

// Mismo corte que la tabla (OrdersTable: "hidden xl:block" / "xl:hidden"): por
// debajo de xl (1280px) se pintan cards y el scroll vertical de 20 filas se
// vuelve tedioso, así que ahí se pagina de 5 en 5 en vez de 20.
const DESKTOP_QUERY = "(min-width: 1280px)";

function subscribeToViewport(callback: () => void) {
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

// useSyncExternalStore evita el desfase de hidratación (el server no conoce el
// viewport) — mismo patrón que AdminGuard. El snapshot de servidor asume
// desktop (20 por página); si el cliente resulta ser móvil, se re-renderiza
// solo con el ancho real ya conocido.
function useIsDesktopViewport() {
  return useSyncExternalStore(
    subscribeToViewport,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true
  );
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function OrdersSection() {
  const [page, setPage] = useState(1);
  const [selectedDay, setSelectedDay] = useState("");
  const [viewing, setViewing] = useState<AdminOrder | null>(null);
  const isDesktop = useIsDesktopViewport();
  const perPage = isDesktop ? PER_PAGE_DESKTOP : PER_PAGE_MOBILE;

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: adminOrderKeys.list(page, perPage, selectedDay || undefined),
    queryFn: () => getAdminOrders(page, perPage, selectedDay || undefined),
    placeholderData: keepPreviousData,
  });

  const handleDayChange = (value: string) => {
    setSelectedDay(value);
    setPage(1);
  };

  const clearDay = () => {
    setSelectedDay("");
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-amber-50">Pedidos</h1>
          {data && (
            <span className="text-xs text-amber-100/40 font-sans">
              {data.total} pedido{data.total === 1 ? "" : "s"}
              {selectedDay && " · día seleccionado"}
              {data.totalPages > 1 &&
                ` · página ${data.page} de ${data.totalPages}`}
            </span>
          )}
        </div>

        <div className="flex items-end gap-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] tracking-[0.2em] uppercase text-amber-100/40 font-sans">
              Pedidos del día
            </span>
            <input
              type="date"
              value={selectedDay}
              max={todayISO()}
              onChange={(e) => handleDayChange(e.target.value)}
              aria-label="Filtrar pedidos por día"
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

      {isPending && (
        <p className="text-amber-100/40 text-sm tracking-[0.15em] uppercase">
          Cargando pedidos…
        </p>
      )}

      {isError && !data && (
        <div className="max-w-md space-y-4">
          <p className="text-red-400/90 text-sm border border-red-500/30 bg-red-500/5 rounded-md px-4 py-3">
            No pudimos cargar los pedidos. Revisa tu conexión e inténtalo de nuevo.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="border border-amber-400/60 text-amber-400 text-[10px] tracking-[0.25em] uppercase px-6 py-2.5 hover:bg-amber-400/10 transition-colors cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {data && (
        <>
          {isError && (
            <p className="flex flex-wrap items-center gap-2 text-xs text-red-400/90 border border-red-500/30 bg-red-500/5 rounded-md px-4 py-2.5">
              No se pudo actualizar. Mostrando datos anteriores.
              <button
                type="button"
                onClick={() => refetch()}
                className="text-amber-400 tracking-[0.15em] uppercase text-[10px] underline underline-offset-2 hover:text-amber-300 transition-colors cursor-pointer"
              >
                Reintentar
              </button>
            </p>
          )}
          <OrdersTable
            orders={data.orders}
            onSelect={setViewing}
            emptyMessage={
              selectedDay ? "Sin pedidos ese día" : "Aún no hay pedidos"
            }
          />
          <OrdersPagination
            currentPage={data.page}
            totalPages={data.totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      {viewing && (
        <OrderDetailModal order={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  );
}
