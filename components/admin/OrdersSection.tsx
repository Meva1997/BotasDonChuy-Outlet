"use client";

import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { adminOrderKeys, getAdminOrders, type AdminOrder } from "@/lib/api/adminOrders";
import OrdersTable from "./orders/OrdersTable";
import OrdersPagination from "./orders/OrdersPagination";
import OrderDetailModal from "./orders/OrderDetailModal";

const PER_PAGE = 20;

export default function OrdersSection() {
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<AdminOrder | null>(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: adminOrderKeys.list(page, PER_PAGE),
    queryFn: () => getAdminOrders(page, PER_PAGE),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="flex items-baseline justify-between">
        <h1 className="font-serif text-3xl text-amber-50">Pedidos</h1>
        {data && (
          <span className="text-xs text-amber-100/40 font-sans">
            {data.total} pedidos
            {data.totalPages > 1 &&
              ` · página ${data.page} de ${data.totalPages}`}
          </span>
        )}
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
          <OrdersTable orders={data.orders} onSelect={setViewing} />
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
