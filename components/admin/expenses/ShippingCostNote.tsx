import type { DerivedShippingCost } from "@/lib/api/adminExpenses";
import { formatPrice } from "@/lib/utils";
import { shippingWindowLabel } from "./expenseStatus";

/**
 * La línea derivada de envío (Fase 22), tal como la ven las DOS pantallas de gastos:
 * la tarjeta de resumen y el detalle de mes del historial.
 *
 * Vive en un componente compartido por el mismo motivo que `notices.ts` en
 * `admin/products/`: la advertencia se pinta en dos lugares y las dos tienen que
 * decir exactamente lo mismo. Es justo la copia que evita que el dueño capture las
 * guías como gasto y se las reste dos veces.
 *
 * **No es editable y no lleva controles a propósito**: no hay fila `Expense` detrás,
 * es un agregado de los pedidos pagados. Y su monto NUNCA se suma al total de gastos
 * que muestra la pantalla que lo pinta — ver `DerivedShippingCostSchema`.
 */
export default function ShippingCostNote({
  shippingCost,
}: {
  shippingCost: DerivedShippingCost;
}) {
  const { amount, orders, from, to, partial } = shippingCost;

  return (
    <div className="mt-6 pt-4 border-t border-amber-400/10">
      <p className="text-sm text-amber-100/70">
        Envíos (guías):{" "}
        <span className="text-amber-100/90 tabular-nums">
          {formatPrice(amount)}
        </span>{" "}
        — ya restado en la ganancia bruta del panel.
      </p>
      <p className="text-xs text-amber-100/40 mt-1 leading-relaxed max-w-xs">
        No lo captures como gasto: se contaría dos veces.
      </p>
      {/* La ventana y el número de pedidos van juntos: sin el rango, un acumulado a
          media quincena se lee contra un run-rate de mes completo y el envío parece
          baratísimo; sin los pedidos, un monto raro no se puede sanity-checkear. */}
      <p className="text-xs text-amber-100/35 mt-2 tabular-nums">
        {shippingWindowLabel(from, to, partial)} · {orders} pedido
        {orders === 1 ? "" : "s"}
      </p>
    </div>
  );
}
