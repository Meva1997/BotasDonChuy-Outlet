"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MonthlyReport } from "@/components/admin/data/types";
import { categorySingular } from "@/lib/domain/categories";
import { adminExpenseKeys, getExpenseHistory } from "@/lib/api/adminExpenses";
import { shippingWindowLabel } from "../expenses/expenseStatus";

function pct(value: number, total: number) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

function fmtMXN(n: number) {
  return `$${n.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Clases para el documento imprimible (tema claro), mismo patrón que
// PrintPendingOrders.tsx — duplicadas aquí a propósito, no vale un módulo
// compartido por 4 strings de una línea con solo 2 consumidores.
const printTh =
  "text-left text-[9px] tracking-[0.15em] uppercase text-gray-500 font-normal pb-1 pr-3 last:pr-0 border-b border-gray-400";
const printThR = `${printTh} text-right`;
const printTd = "py-1.5 pr-3 last:pr-0 align-top border-b border-gray-200";
const printTdR = `${printTd} text-right tabular-nums`;

function trendVsPrev(current: MonthlyReport, reports: MonthlyReport[]) {
  const idx = reports.findIndex((r) => r.key === current.key);
  if (idx <= 0) return null;
  const prev = reports[idx - 1];
  const diff = current.totalRevenue - prev.totalRevenue;
  // Sin mes previo con ingresos no hay base de comparación (evita Infinity/NaN).
  if (prev.totalRevenue === 0) return null;
  const pctChange = Math.round((diff / prev.totalRevenue) * 100);
  return { pctChange, positive: diff >= 0 };
}

interface Props {
  monthKey: string;
  reports: MonthlyReport[];
}

export default function SalesReport({ monthKey, reports }: Props) {
  const report = reports.find((r) => r.key === monthKey);

  // Mismo queryKey/queryFn/staleTime que ExpenseHistory.tsx: comparte caché con
  // la pestaña Gastos → Historial en vez de duplicar la petición. Sin el mismo
  // `staleTime` compartiría la clave pero no la petición — cada cambio de
  // pestaña remontaría este componente y dispararía un refetch igual.
  const {
    data: expenseHistory,
    isPending: expensesPending,
    isError: expensesError,
    refetch: refetchExpenses,
  } = useQuery({
    queryKey: adminExpenseKeys.history(),
    queryFn: () => getExpenseHistory(),
    staleTime: 60 * 1000,
  });

  // Contador, no booleano: si `afterprint` no llega nunca (webviews embebidos,
  // diálogos cerrados por caminos que no lo despachan), un `setShowPrintable(true)`
  // sobre un `true` sería un no-op y el botón quedaría muerto hasta remontar la
  // sección. Cada clic incrementa, así que el efecto vuelve a correr siempre.
  const [printRequest, setPrintRequest] = useState(0);
  const showPrintable = printRequest > 0;

  // Al activarse, dispara la impresión del navegador; `afterprint` (se
  // dispara al cerrar el diálogo, impreso o cancelado) desmonta el bloque
  // para no dejar un árbol DOM grande montado indefinidamente — mismo patrón
  // que PrintPendingOrders.tsx. Declarado antes del `if (!report)` de abajo
  // para no violar las reglas de hooks (el orden de hooks no puede depender
  // de si `report` existe en este render).
  useEffect(() => {
    if (printRequest === 0) return;
    const frame = requestAnimationFrame(() => window.print());
    const handleAfterPrint = () => setPrintRequest(0);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [printRequest]);

  if (!report) return null;

  const trend = trendVsPrev(report, reports);
  // Un producto sin ventas ese mes no aporta nada a "más vendidos" — ni en
  // pantalla ni en el reporte impreso, que reutiliza esta misma lista.
  const sortedProducts = report.byProduct
    .filter((p) => p.unitsSold > 0)
    .sort((a, b) => b.unitsSold - a.unitsSold);

  // Utilidad bruta del mes = ingresos − costo (unitCost llega solo por rutas admin autenticadas).
  const totalCost = report.byProduct.reduce(
    (s, p) => s + p.unitCost * p.unitsSold,
    0,
  );
  const utilidad = report.totalRevenue - totalCost;
  const margenPct = pct(utilidad, report.totalRevenue);

  // Gastos operativos reales de ESE mes calendario (no la proyección de
  // ExpenseSummary). `undefined` = aún no se sabe (cargando, error, o el mes
  // no tiene match en el historial) — nunca se confunde con "gastos en $0".
  const monthExpense = expenseHistory?.find((e) => e.isoMonth === report.key);
  const gastosOperativos = monthExpense?.total;
  // Envío pagado ese mes (guías), fuera de `gastosOperativos` — ver
  // DerivedShippingCostSchema. Se muestra aparte como su propio KPI Y se resta
  // en `utilidadNeta` (ver abajo): es un costo real del mes, igual que
  // `unitCost` de cada pieza.
  const shippingCost = monthExpense?.shippingCost;
  // La utilidad BRUTA no toca el envío: `totalRevenue` es `unidades ×
  // salePrice` (mercancía sola, sin envío cobrado), así que restar la guía ahí
  // la castigaría contra ingresos que nunca la incluyeron.
  // La utilidad NETA sí la resta, además de los gastos operativos — es la
  // cifra pensada para reflejar lo que realmente quedó ese mes. Por eso puede
  // no reconciliar con GANANCIA OPERATIVA del dashboard (esa parte de
  // `order.total`, ya neto de cupón y con el envío cobrado dentro) — la nota
  // de abajo lo dice en pantalla y en el impreso.
  const utilidadNeta =
    gastosOperativos !== undefined && shippingCost !== undefined
      ? utilidad - gastosOperativos - shippingCost.amount
      : undefined;
  const margenNetoPct =
    utilidadNeta !== undefined
      ? pct(utilidadNeta, report.totalRevenue)
      : undefined;

  // Mes en curso: los ingresos llegan hasta hoy, pero `ExpenseMonth.total` trae
  // el mes COMPLETO (el backend genera también los cargos futuros del mes). Una
  // resta entre esas dos ventanas se lee como una caída de utilidad que no
  // ocurrió — negativa los primeros días del mes. Rotularlo es obligatorio,
  // mismo criterio que `shippingWindowLabel` en Gastos.
  const ventanasDesiguales =
    utilidadNeta !== undefined &&
    (report.partial === true || monthExpense?.partial === true);

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Imprimir reporte */}
        <div className="flex items-center justify-end gap-3">
          {expensesPending && (
            <span className="text-[10px] tracking-[0.2em] uppercase text-amber-100/25">
              Cargando gastos…
            </span>
          )}
          {/* Deshabilitado mientras la query de gastos está en vuelo: imprimir
            en ese instante saca una hoja con "—" en Gastos operativos y Utilidad
            neta, indistinguible de un mes sin gastos registrados. */}
          <button
            type="button"
            disabled={expensesPending}
            onClick={() => setPrintRequest((n) => n + 1)}
            className="text-[10px] tracking-[0.2em] uppercase text-amber-100/40 border border-amber-400/20 px-3 py-2.5 rounded hover:text-amber-400 hover:border-amber-400/40 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-amber-100/40 disabled:hover:border-amber-400/20"
          >
            Imprimir reporte
          </button>
        </div>

        {/* KPIs resumen */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="rounded-lg border border-amber-400/15 bg-stone-900/60 p-4">
            <p className="text-[9px] tracking-[0.25em] uppercase text-amber-100/40 font-sans mb-1.5">
              Ingresos
            </p>
            <p className="font-serif text-2xl text-amber-50">
              {fmtMXN(report.totalRevenue)}
            </p>
            {trend && (
              <p
                className={`text-xs font-sans mt-1 ${
                  trend.positive ? "text-emerald-400/80" : "text-red-400/80"
                }`}
              >
                {trend.positive ? "+" : ""}
                {trend.pctChange}% vs mes anterior
              </p>
            )}
            {report.partial && (
              <p className="text-[10px] text-amber-100/30 font-sans mt-0.5">
                mes parcial
              </p>
            )}
          </div>

          <div className="rounded-lg border border-amber-400/15 bg-stone-900/60 p-4">
            <p className="text-[9px] tracking-[0.25em] uppercase text-amber-100/40 font-sans mb-1.5">
              Costo de mercancía vendida
            </p>
            <p className="font-serif text-2xl text-amber-50">
              {fmtMXN(totalCost)}
            </p>
          </div>

          <div className="rounded-lg border border-amber-400/15 bg-stone-900/60 p-4">
            <p className="text-[9px] tracking-[0.25em] uppercase text-amber-100/40 font-sans mb-1.5">
              Gastos operativos
            </p>
            <p className="font-serif text-2xl text-amber-50">
              {gastosOperativos !== undefined ? fmtMXN(gastosOperativos) : "—"}
            </p>
            {/* Un error de red pinta el mismo "—" que un mes sin gastos
              registrados: sin este aviso las dos situaciones son idénticas en
              pantalla y no hay forma de reintentar. */}
            {expensesError && (
              <button
                type="button"
                onClick={() => refetchExpenses()}
                className="text-xs font-sans mt-1 text-red-400/80 underline underline-offset-2 cursor-pointer hover:text-red-400"
              >
                No se pudieron cargar · Reintentar
              </button>
            )}
          </div>

          <div className="rounded-lg border border-amber-400/15 bg-stone-900/60 p-4">
            <p className="text-[9px] tracking-[0.25em] uppercase text-amber-100/40 font-sans mb-1.5">
              Gasto en paquetería
            </p>
            <p className="font-serif text-2xl text-amber-50">
              {shippingCost !== undefined ? fmtMXN(shippingCost.amount) : "—"}
            </p>
            {/* Se muestra aparte para verlo de un vistazo, y también se resta
              en "Utilidad neta del mes" más abajo. El rango de fechas evita
              leer un acumulado a media quincena como si el envío saliera
              baratísimo. */}
            {shippingCost !== undefined && (
              <p className="text-[10px] text-amber-100/30 font-sans mt-1 leading-snug tabular-nums">
                {shippingWindowLabel(
                  shippingCost.from,
                  shippingCost.to,
                  shippingCost.partial,
                )}{" "}
                · {shippingCost.orders} pedido
                {shippingCost.orders === 1 ? "" : "s"}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-amber-400/15 bg-stone-900/60 p-4">
            <p className="text-[9px] tracking-[0.25em] uppercase text-amber-100/40 font-sans mb-1.5">
              Utilidad bruta del mes
            </p>
            <p className="font-serif text-2xl text-amber-50">
              {fmtMXN(utilidad)}
            </p>
            <p className="text-xs font-sans mt-1 text-amber-100/40">
              {margenPct}% de margen
            </p>
          </div>

          <div className="rounded-lg border border-amber-400/15 bg-stone-900/60 p-4">
            <p className="text-[9px] tracking-[0.25em] uppercase text-amber-100/40 font-sans mb-1.5">
              Utilidad neta del mes
            </p>
            <p className="font-serif text-2xl text-amber-50">
              {utilidadNeta !== undefined ? fmtMXN(utilidadNeta) : "—"}
            </p>
            {margenNetoPct !== undefined && (
              <p className="text-xs font-sans mt-1 text-amber-100/40">
                {margenNetoPct}% de margen
              </p>
            )}
            {ventanasDesiguales && (
              <p className="text-[10px] text-amber-100/30 font-sans mt-1 leading-snug">
                mes en curso: ingresos a la fecha contra gastos del mes completo
              </p>
            )}
          </div>

          <div className="rounded-lg border border-amber-400/15 bg-stone-900/60 p-4">
            <p className="text-[9px] tracking-[0.25em] uppercase text-amber-100/40 font-sans mb-1.5">
              Piezas vendidas
            </p>
            <p className="font-serif text-2xl text-amber-50">
              {report.totalUnits}
            </p>
          </div>

          <div className="rounded-lg border border-amber-400/15 bg-stone-900/60 p-4">
            <p className="text-[9px] tracking-[0.25em] uppercase text-amber-100/40 font-sans mb-1.5">
              Precio promedio / pieza
            </p>
            <p className="font-serif text-2xl text-amber-50">
              {report.totalUnits > 0
                ? fmtMXN(Math.round(report.totalRevenue / report.totalUnits))
                : "—"}
            </p>
          </div>
        </div>

        {/* Qué incluye y qué no. Sin esto, "Utilidad neta del mes" invita a
          compararse con GANANCIA OPERATIVA del dashboard, que se calcula sobre
          otra base (`order.total`, ya neto de cupón y con el envío cobrado
          dentro) y nunca va a dar el mismo número. */}
        <p className="text-[10px] text-amber-100/30 font-sans leading-relaxed -mt-3">
          Calculado sobre el precio de lista vigente de cada pieza: no refleja
          descuentos por cupón ni cambios de precio posteriores a la venta. La
          utilidad bruta no incluye el envío (ni lo cobrado al cliente ni la
          guía pagada, mostrada aparte en &quot;Gasto en paquetería&quot;); la
          utilidad neta sí resta esa guía, además de los gastos operativos.
          Para la ganancia con cupones incluidos, ver el Dashboard.
        </p>

        {/* Top productos */}
        <div className="rounded-lg border border-amber-400/15 bg-stone-900/60 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-amber-400/10">
            <h3 className="font-serif text-lg text-amber-50">
              Productos más vendidos
            </h3>
          </div>

          <table className="w-full text-sm font-sans">
            <thead>
              <tr className="border-b border-amber-400/10">
                <th className="text-left px-5 py-3 text-[9px] tracking-[0.25em] uppercase text-amber-100/30 w-8">
                  #
                </th>
                <th className="text-left px-3 py-3 text-[9px] tracking-[0.25em] uppercase text-amber-100/30">
                  Producto
                </th>
                <th className="text-right px-5 py-3 text-[9px] tracking-[0.25em] uppercase text-amber-100/30">
                  Uds.
                </th>
                <th className="text-right px-5 py-3 text-[9px] tracking-[0.25em] uppercase text-amber-100/30 hidden sm:table-cell">
                  Ingresos
                </th>
                <th className="text-right px-5 py-3 text-[9px] tracking-[0.25em] uppercase text-amber-100/30 hidden md:table-cell">
                  % total
                </th>
                <th className="text-right px-5 py-3 text-[9px] tracking-[0.25em] uppercase text-amber-100/30 hidden lg:table-cell">
                  Margen
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedProducts.map((product, idx) => {
                const share = pct(product.revenue, report.totalRevenue);
                const utilidadProd =
                  product.revenue - product.unitCost * product.unitsSold;
                const margenProd = pct(utilidadProd, product.revenue);
                return (
                  <tr
                    key={product.productId}
                    className="border-b border-amber-400/5 hover:bg-stone-800/40 transition-colors"
                  >
                    <td className="px-5 py-3.5 text-amber-100/25 font-mono text-xs">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-amber-50/90 text-[13px]">
                          {product.name}
                        </span>
                        <span className="text-[9px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded bg-stone-700/60 text-amber-100/35 hidden sm:inline">
                          {categorySingular(product.type)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-amber-50/80 text-[13px]">
                      {product.unitsSold}
                    </td>
                    <td className="px-5 py-3.5 text-right text-amber-100/60 text-[13px] hidden sm:table-cell">
                      {fmtMXN(product.revenue)}
                    </td>
                    <td className="px-5 py-3.5 text-right hidden md:table-cell">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1 rounded-full bg-stone-700 overflow-hidden">
                          <div
                            className="h-full bg-amber-500/60 rounded-full"
                            style={{ width: `${share}%` }}
                          />
                        </div>
                        <span className="text-amber-100/40 text-[11px] font-mono w-7 text-right">
                          {share}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right hidden lg:table-cell">
                      <span className="text-amber-100/50 text-[13px] font-mono">
                        {fmtMXN(utilidadProd)}
                      </span>
                      <span className="text-amber-100/30 text-[11px] font-mono ml-1.5">
                        ({margenProd}%)
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Por categoría */}
        <div className="rounded-lg border border-amber-400/15 bg-stone-900/60 p-5">
          <h3 className="font-serif text-lg text-amber-50 mb-5">
            Por categoría
          </h3>
          <div className="flex flex-col gap-4">
            {report.byCategory.map((cat) => {
              const barWidth = pct(cat.revenue, report.totalRevenue);
              return (
                <div key={cat.category}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-[10px] tracking-[0.25em] uppercase text-amber-100/50 font-sans">
                      {cat.label}
                    </span>
                    <span className="text-amber-50/80 font-mono text-sm">
                      {fmtMXN(cat.revenue)}
                      <span className="text-amber-100/30 text-xs ml-2">
                        · {cat.units} pzas · {barWidth}% del mes
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-stone-700 overflow-hidden">
                    <div
                      className="h-full bg-amber-500/70 rounded-full transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Documento imprimible — solo montado mientras se imprime, ver el
        bloque @media print en globals.css que aísla #print-reporte-ventas
        del resto de la app. Paleta blanco/negro/gris a propósito: el tema
        oscuro de la app desperdiciaría tinta y sería ilegible en papel.
        Reúne lo que el CSV anterior dejaba fuera: resumen de KPIs, precio
        unitario promedio por producto y desglose por categoría. */}
      {showPrintable && (
        <div
          id="print-reporte-ventas"
          className="hidden print:block bg-white text-black"
        >
          <div className="mb-4">
            <h1 className="text-lg font-bold">
              Reporte de ventas — {report.label}
            </h1>
            <p className="text-[11px] text-gray-600">
              Generado el{" "}
              {new Date().toLocaleDateString("es-MX", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] mb-3">
            <div>
              <span className="font-semibold">Ingresos:</span>{" "}
              {fmtMXN(report.totalRevenue)}
            </div>
            <div>
              <span className="font-semibold">Costo de mercancía:</span>{" "}
              {fmtMXN(totalCost)}
            </div>
            <div>
              <span className="font-semibold">Gastos operativos:</span>{" "}
              {gastosOperativos !== undefined ? fmtMXN(gastosOperativos) : "—"}
            </div>
            <div>
              <span className="font-semibold">Gasto en paquetería:</span>{" "}
              {shippingCost !== undefined ? fmtMXN(shippingCost.amount) : "—"}
            </div>
            <div>
              <span className="font-semibold">Utilidad bruta:</span>{" "}
              {fmtMXN(utilidad)} ({margenPct}% margen)
            </div>
            <div>
              <span className="font-semibold">Utilidad neta:</span>{" "}
              {utilidadNeta !== undefined ? fmtMXN(utilidadNeta) : "—"}
              {margenNetoPct !== undefined ? ` (${margenNetoPct}% margen)` : ""}
            </div>
            <div>
              <span className="font-semibold">Piezas vendidas:</span>{" "}
              {report.totalUnits}
            </div>
            <div>
              <span className="font-semibold">Precio promedio/pieza:</span>{" "}
              {report.totalUnits > 0
                ? fmtMXN(Math.round(report.totalRevenue / report.totalUnits))
                : "—"}
            </div>
          </div>

          {/* Las mismas advertencias que la pantalla. En papel pesan más: una
            hoja impresa se archiva y se lee meses después, fuera de contexto,
            sin nadie a quien preguntarle qué mes era ni qué incluía. */}
          {report.partial && (
            <p className="text-[10px] mb-1">
              <span className="font-semibold">Mes parcial:</span> {report.label}{" "}
              todavía está en curso, las ventas del mes aún van a subir.
              {ventanasDesiguales
                ? " La utilidad neta compara ingresos a la fecha contra los gastos del mes completo."
                : ""}
            </p>
          )}
          <p className="text-[10px] text-gray-600 mb-5 leading-relaxed">
            Calculado sobre el precio de lista vigente de cada pieza: no refleja
            descuentos por cupón ni cambios de precio posteriores a la venta. La
            utilidad bruta no incluye el envío (ni lo cobrado al cliente ni la
            guía pagada, mostrada aparte en &quot;Gasto en paquetería&quot;);
            la utilidad neta sí resta esa guía, además de los gastos
            operativos.
          </p>

          <table className="w-full text-[11px] mb-6">
            <thead>
              <tr>
                <th className={printTh}>#</th>
                <th className={printTh}>Producto</th>
                <th className={printTh}>Tipo</th>
                <th className={printThR}>Uds.</th>
                <th className={printThR}>Precio unit. prom.</th>
                <th className={printThR}>Ingresos</th>
                <th className={printThR}>% del total</th>
                <th className={printThR}>Utilidad</th>
                <th className={printThR}>Margen %</th>
              </tr>
            </thead>
            <tbody>
              {sortedProducts.map((product, idx) => {
                const utilidadProd =
                  product.revenue - product.unitCost * product.unitsSold;
                return (
                  <tr key={product.productId}>
                    <td className={printTd}>{idx + 1}</td>
                    <td className={printTd}>{product.name}</td>
                    <td className={printTd}>
                      {categorySingular(product.type)}
                    </td>
                    <td className={printTdR}>{product.unitsSold}</td>
                    {/* Sin guarda de división entre cero: `sortedProducts` ya
                      filtró por `unitsSold > 0`, así que esta fila no existe
                      para un producto sin ventas. */}
                    <td className={printTdR}>
                      {fmtMXN(product.revenue / product.unitsSold)}
                    </td>
                    <td className={printTdR}>{fmtMXN(product.revenue)}</td>
                    <td className={printTdR}>
                      {pct(product.revenue, report.totalRevenue)}%
                    </td>
                    <td className={printTdR}>{fmtMXN(utilidadProd)}</td>
                    <td className={printTdR}>
                      {pct(utilidadProd, product.revenue)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <table className="w-full text-[11px]">
            <thead>
              <tr>
                <th className={printTh}>Categoría</th>
                <th className={printThR}>Ingresos</th>
                <th className={printThR}>Unidades</th>
                <th className={printThR}>% del mes</th>
              </tr>
            </thead>
            <tbody>
              {report.byCategory.map((cat) => (
                <tr key={cat.category}>
                  <td className={printTd}>{cat.label}</td>
                  <td className={printTdR}>{fmtMXN(cat.revenue)}</td>
                  <td className={printTdR}>{cat.units}</td>
                  <td className={printTdR}>
                    {pct(cat.revenue, report.totalRevenue)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
