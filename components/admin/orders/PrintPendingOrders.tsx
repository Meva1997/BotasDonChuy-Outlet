"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminOrders, type AdminOrder } from "@/lib/api/adminOrders";
import { adminProductKeys, getAdminProducts } from "@/lib/api/adminProducts";
import { formatPrice } from "@/lib/utils";
import { disputeBlocksShipping } from "./disputeStatus";

// El backend de GET /admin/orders solo clampa `page`, no `perPage` (ver
// ../backend/src/controllers/order.controller.ts) — pedir un `perPage` grande
// trae TODO en una sola llamada, sin recorrer páginas.
const PRINT_PER_PAGE = 10_000;

interface PrintData {
  /** Lo que sí se empaca. */
  orders: AdminOrder[];
  /**
   * Pedidos pendientes de enviar que quedaron FUERA de la hoja por tener una disputa viva
   * (Fase 28). No se imprimen —empacarlos sería mandar mercancía cuyo cobro ya se retiró del
   * saldo— pero sí se nombran: esconderlos en silencio dejaría la hoja y la pantalla
   * contradiciéndose sin explicación, y el dueño buscando un pedido que "desapareció".
   */
  disputed: AdminOrder[];
  codeByProductId: Map<number, string>;
}

const printTh =
  "text-left text-[9px] tracking-[0.15em] uppercase text-gray-500 font-normal pb-1 pr-3 last:pr-0 border-b border-gray-400";
const printThR = `${printTh} text-right`;
const printTd = "py-1.5 pr-3 last:pr-0 align-top border-b border-gray-200";
const printTdR = `${printTd} text-right tabular-nums`;

function formatAddress(order: AdminOrder): string {
  const base = `${order.street}, ${order.neighborhood}, ${order.city}, ${order.state} ${order.postalCode}`;
  return order.references ? `${base} — ${order.references}` : base;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Bloque de un pedido dentro de la hoja imprimible. `break-inside: avoid`
// evita cortarlo a la mitad salvo que de plano no quepa en una hoja (flujo
// continuo, no una página por pedido).
function PrintableOrder({
  order,
  codeByProductId,
}: {
  order: AdminOrder;
  codeByProductId: Map<number, string>;
}) {
  return (
    <section
      style={{ breakInside: "avoid" }}
      className="mb-6 pb-4 border-b-2 border-black last:border-b-0"
    >
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-base font-bold">Pedido #{order.id}</h2>
        <span className="text-[11px] text-gray-600">
          Pedido creado el: {formatDate(order.createdAt)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-[11px] mb-3">
        <div>
          <span className="font-semibold">Cliente:</span> {order.customerName}
        </div>
        <div>
          <span className="font-semibold">Correo:</span> {order.customerEmail}
        </div>
        <div>
          <span className="font-semibold">Teléfono:</span> {order.customerPhone}
        </div>
        <div className="col-span-2">
          <span className="font-semibold">Dirección:</span>{" "}
          {formatAddress(order)}
        </div>
      </div>

      <table className="w-full text-[11px]">
        <thead>
          <tr>
            <th className={printTh}>Producto</th>
            <th className={printThR}>Talla</th>
            <th className={printThR}>Cant.</th>
            <th className={printThR}>Precio venta</th>
            <th className={printThR}>Costo</th>
            <th className={printThR}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => {
            const code = codeByProductId.get(item.productId);
            return (
              <tr key={`${order.id}-${item.id}`}>
                <td className={printTd}>
                  {item.nameSnapshot}
                  {code && (
                    <div className="text-[9px] text-gray-500">Cód. {code}</div>
                  )}
                </td>
                <td className={printTdR}>{item.size > 0 ? item.size : "—"}</td>
                <td className={printTdR}>{item.quantity}</td>
                <td className={printTdR}>{formatPrice(item.unitSalePrice)}</td>
                <td className={printTdR}>{formatPrice(item.unitCost)}</td>
                <td className={printTdR}>
                  {formatPrice(item.unitSalePrice * item.quantity)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex justify-end gap-8 mt-2 text-[12px] font-semibold">
        <span>Costo de envío: {formatPrice(order.shipping)}</span>
        <span>Total: {formatPrice(order.total)}</span>
      </div>
    </section>
  );
}

export default function PrintPendingOrders() {
  const queryClient = useQueryClient();
  const [printData, setPrintData] = useState<PrintData | null>(null);

  const printMutation = useMutation({
    mutationFn: async (): Promise<PrintData> => {
      const [ordersRes, products] = await Promise.all([
        // Llamada directa (no pasa por adminOrderKeys.list) para no mezclar
        // esta foto "todo, sin paginar" con la caché normal de la tabla/polling.
        getAdminOrders(1, PRINT_PER_PAGE, undefined, "pendientes_envio"),
        queryClient.ensureQueryData({
          queryKey: adminProductKeys.all,
          queryFn: getAdminProducts,
        }),
      ]);
      const codeByProductId = new Map<number, string>();
      for (const product of products) {
        if (product.code) codeByProductId.set(product.id, product.code);
      }
      // El filtro es del cliente y no del backend a propósito: la pestaña sigue mostrando
      // los pedidos disputados (con su badge) para que el dueño los vea y decida; lo que
      // no puede pasar es que se cuelen en el papel que tiene en la mano al empacar.
      const orders: AdminOrder[] = [];
      const disputed: AdminOrder[] = [];
      for (const order of ordersRes.orders) {
        (disputeBlocksShipping(order) ? disputed : orders).push(order);
      }
      return { orders, disputed, codeByProductId };
    },
    onSuccess: setPrintData,
  });

  // Al llegar los datos, imprime; `afterprint` (dispara al cerrar el diálogo,
  // se haya impreso o cancelado) limpia el estado para no dejar montado un
  // árbol DOM grande de forma indefinida.
  useEffect(() => {
    if (!printData) return;
    const frame = requestAnimationFrame(() => window.print());
    const handleAfterPrint = () => setPrintData(null);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [printData]);

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => printMutation.mutate()}
          disabled={printMutation.isPending}
          className="text-[10px] tracking-[0.2em] uppercase text-amber-100/40 border border-amber-400/20 px-3 py-2.5 rounded hover:text-amber-400 hover:border-amber-400/40 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          {printMutation.isPending ? "Preparando…" : "Imprimir pendientes"}
        </button>
        {printMutation.isError && (
          <p role="alert" className="text-[10px] text-red-400/90">
            No pudimos preparar el listado. Inténtalo de nuevo.
          </p>
        )}
      </div>

      {/* Solo visible al imprimir — ver el bloque @media print en globals.css
          que aísla #print-pedidos-pendientes del resto de la app. Paleta en
          blanco/negro/gris a propósito: el tema oscuro de la app desperdiciaría
          tinta y sería ilegible en papel. */}
      {printData && (
        <div
          id="print-pedidos-pendientes"
          className="hidden print:block bg-white text-black"
        >
          {/* Encabezado de exclusión: va ARRIBA, antes de los pedidos, porque
              es lo único de la hoja que pide una acción distinta a empacar. */}
          {printData.disputed.length > 0 && (
            <p className="mb-4 pb-2 border-b-2 border-black text-[12px] font-semibold">
              {printData.disputed.length === 1
                ? "1 pedido no se incluyó por tener una disputa abierta: "
                : `${printData.disputed.length} pedidos no se incluyeron por tener una disputa abierta: `}
              {printData.disputed.map((order) => `#${order.id}`).join(", ")}. No
              los empaques sin revisar el caso en Stripe.
            </p>
          )}

          {printData.orders.length === 0 ? (
            // Con todos los pendientes disputados la hoja no puede salir en blanco:
            // el aviso de arriba se queda solo y este texto explica que no es un error.
            <p>
              {printData.disputed.length > 0
                ? "No queda ningún pedido por empacar: todos los pendientes están en disputa."
                : "No hay pedidos pendientes de enviar."}
            </p>
          ) : (
            printData.orders.map((order) => (
              <PrintableOrder
                key={order.id}
                order={order}
                codeByProductId={printData.codeByProductId}
              />
            ))
          )}
        </div>
      )}
    </>
  );
}
