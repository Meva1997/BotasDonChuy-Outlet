import { act, screen, waitFor, within } from "@testing-library/react";
import SalesReport from "../SalesReport";
import { makeExpenseMonth, makeMonthlyReport } from "./helpers/factories";
import { renderWithQueryClient } from "./helpers/render";

// `jest.mock("@/...")` no resuelve — ruta relativa a propósito (ver CLAUDE.md).
jest.mock("../../../../lib/api/adminExpenses", () => ({
  ...jest.requireActual("../../../../lib/api/adminExpenses"),
  getExpenseHistory: jest.fn(),
}));

import { getExpenseHistory } from "@/lib/api/adminExpenses";

const mockGetExpenseHistory = getExpenseHistory as jest.MockedFunction<
  typeof getExpenseHistory
>;

// SalesReport recibe el arreglo completo de meses y el mes elegido desde
// `ReportsSection`, pero SÍ dueña su propia query (`getExpenseHistory`, mismo
// queryKey/queryFn que `ExpenseHistory.tsx` en Gastos → Historial) para cruzar
// los gastos operativos reales del mes. Casi todo lo demás viene derivado del
// backend, pero cuatro cosas se calculan aquí y pueden mentir sin que nada reviente:
//
//  1. La utilidad bruta del mes (ingresos − costo de mercancía) y su margen —
//     es el único lugar del panel donde `unitCost` se agrega sobre todo un mes.
//  2. La utilidad neta del mes (utilidad bruta − gastos operativos), cruzando
//     `ExpenseMonth.isoMonth` contra `MonthlyReport.key`. Mientras la query de
//     gastos está en vuelo, falla, o el mes no tiene match en el historial
//     (p. ej. ventas de antes de trackear gastos), el resultado es "no se sabe
//     todavía" — nunca $0.00, que se leería como "no hubo gastos ese mes".
//  3. La comparación contra el mes anterior, que tiene DOS formas de no existir
//     (es el primer mes / el anterior no facturó nada) y no debe inventar un
//     porcentaje en ninguna.
//  4. El documento imprimible: reúne KPIs + tabla de productos (con el precio
//     unitario promedio, `revenue/unitsSold`, que no vive en pantalla) +
//     desglose por categoría — si falta alguna sección ahí, el reporte
//     impreso queda incompleto sin que la pantalla se vea afectada.

function reportsWith(...overrides: Parameters<typeof makeMonthlyReport>[0][]) {
  return overrides.map((o) => makeMonthlyReport(o));
}

// El botón de imprimir está deshabilitado mientras la query de gastos está en
// vuelo (una hoja impresa en ese instante sale con "—" donde van los gastos),
// así que hay que esperar a que se habilite antes de clicar: un `click` sobre
// un botón deshabilitado no dispara nada y el test fallaría por la razón
// equivocada.
async function clickPrint(user: { click: (el: Element) => Promise<void> }) {
  const button = screen.getByRole("button", { name: "Imprimir reporte" });
  await waitFor(() => expect(button).toBeEnabled());
  await user.click(button);
}

beforeEach(() => {
  mockGetExpenseHistory.mockReset();
  mockGetExpenseHistory.mockResolvedValue([]);
  window.print = jest.fn();
});

describe("SalesReport", () => {
  it("no pinta nada si el mes elegido no está en los datos", () => {
    const { container } = renderWithQueryClient(
      <SalesReport monthKey="2026-01" reports={reportsWith({ key: "2026-07" })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("pinta ingresos, piezas y precio promedio del mes", () => {
    renderWithQueryClient(
      <SalesReport
        monthKey="2026-07"
        reports={reportsWith({ key: "2026-07", totalRevenue: 10000, totalUnits: 8 })}
      />,
    );

    expect(screen.getByText("$10,000.00")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    // 10000 / 8 = 1250, redondeado antes de formatear.
    expect(screen.getByText("$1,250.00")).toBeInTheDocument();
  });

  it("calcula la utilidad bruta del mes restando el costo de mercancía de cada producto vendido", () => {
    renderWithQueryClient(
      <SalesReport
        monthKey="2026-07"
        reports={reportsWith({
          key: "2026-07",
          totalRevenue: 10000,
          byProduct: [
            {
              productId: 1,
              name: "Bota",
              type: "bota",
              unitsSold: 5,
              revenue: 6000,
              unitCost: 500,
            },
            {
              productId: 2,
              name: "Sombrero",
              type: "sombrero",
              unitsSold: 3,
              revenue: 4000,
              unitCost: 400,
            },
          ],
        })}
      />,
    );

    // costo = 5×500 + 3×400 = 3,700 → utilidad bruta 6,300 (63% de margen).
    // La tarjeta dice "vendida" completo: el string corto solo existe en el
    // bloque imprimible ("Costo de mercancía:"), que aquí no está montado.
    expect(screen.getByText("Costo de mercancía vendida")).toBeInTheDocument();
    expect(screen.getByText("$3,700.00")).toBeInTheDocument();
    expect(screen.getByText("Utilidad bruta del mes")).toBeInTheDocument();
    expect(screen.getByText("$6,300.00")).toBeInTheDocument();
    expect(screen.getByText("63% de margen")).toBeInTheDocument();
    // La tarjeta ya no se llama "Utilidad del mes" a secas: el nuevo nombre
    // deja claro que es ANTES de gastos operativos.
    expect(screen.queryByText("Utilidad del mes")).not.toBeInTheDocument();
  });

  it("un mes sin piezas vendidas muestra «—» en vez de dividir entre cero", () => {
    renderWithQueryClient(
      <SalesReport
        monthKey="2026-07"
        reports={reportsWith({
          key: "2026-07",
          totalRevenue: 0,
          totalUnits: 0,
          byProduct: [],
          byCategory: [],
        })}
      />,
    );

    // Varias tarjetas pueden mostrar "—" a la vez (precio promedio, gastos
    // operativos sin match, utilidad neta sin match) — se escopea a la de
    // precio promedio para no chocar con las demás.
    const priceCard = screen.getByText("Precio promedio / pieza").closest("div");
    expect(within(priceCard!).getByText("—")).toBeInTheDocument();
    // Y el margen sobre ingresos de 0 se reporta como 0%, no como NaN.
    expect(screen.getByText("0% de margen")).toBeInTheDocument();
  });

  it("ordena los productos por unidades vendidas, de mayor a menor", () => {
    renderWithQueryClient(
      <SalesReport
        monthKey="2026-07"
        reports={reportsWith({
          key: "2026-07",
          byProduct: [
            { productId: 1, name: "Poco vendida", type: "bota", unitsSold: 2, revenue: 1000, unitCost: 300 },
            { productId: 2, name: "La más vendida", type: "sombrero", unitsSold: 9, revenue: 5000, unitCost: 300 },
            { productId: 3, name: "Intermedia", type: "ropa", unitsSold: 5, revenue: 3000, unitCost: 300 },
          ],
        })}
      />,
    );

    const names = within(screen.getByRole("table"))
      .getAllByRole("row")
      .slice(1)
      .map((row) => within(row).getAllByRole("cell")[1].textContent);

    expect(names?.[0]).toContain("La más vendida");
    expect(names?.[1]).toContain("Intermedia");
    expect(names?.[2]).toContain("Poco vendida");
  });

  it("omite de «Productos más vendidos» los productos sin unidades vendidas ese mes", () => {
    renderWithQueryClient(
      <SalesReport
        monthKey="2026-07"
        reports={reportsWith({
          key: "2026-07",
          byProduct: [
            { productId: 1, name: "Bota vaquera", type: "bota", unitsSold: 5, revenue: 6000, unitCost: 500 },
            { productId: 2, name: "Sin ventas este mes", type: "sombrero", unitsSold: 0, revenue: 0, unitCost: 0 },
          ],
        })}
      />,
    );

    const table = within(screen.getByRole("table"));
    expect(table.getByText("Bota vaquera")).toBeInTheDocument();
    expect(table.queryByText("Sin ventas este mes")).not.toBeInTheDocument();
  });

  it("muestra la utilidad de cada producto en pesos, no solo el porcentaje de margen", () => {
    renderWithQueryClient(
      <SalesReport
        monthKey="2026-07"
        reports={reportsWith({
          key: "2026-07",
          byProduct: [
            { productId: 1, name: "Bota vaquera", type: "bota", unitsSold: 5, revenue: 6000, unitCost: 500 },
          ],
        })}
      />,
    );

    // utilidad = 6000 − 5×500 = 3,500 (58% de margen sobre 6000).
    const table = within(screen.getByRole("table"));
    expect(table.getByText("$3,500.00")).toBeInTheDocument();
    expect(table.getByText("(58%)")).toBeInTheDocument();
  });

  it("traduce el tipo de cada producto a su etiqueta en singular", () => {
    renderWithQueryClient(
      <SalesReport
        monthKey="2026-07"
        reports={reportsWith({ key: "2026-07" })}
      />,
    );

    const table = within(screen.getByRole("table"));
    expect(table.getByText("Bota")).toBeInTheDocument();
    expect(table.getByText("Sombrero")).toBeInTheDocument();
  });

  it("pinta el desglose por categoría con su participación del mes", () => {
    renderWithQueryClient(
      <SalesReport
        monthKey="2026-07"
        reports={reportsWith({ key: "2026-07", totalRevenue: 10000 })}
      />,
    );

    expect(screen.getByText("Botas")).toBeInTheDocument();
    expect(screen.getByText("· 5 pzas · 60% del mes")).toBeInTheDocument();
    expect(screen.getByText("· 3 pzas · 40% del mes")).toBeInTheDocument();
  });

  // ── Gastos operativos del mes ──

  describe("gastos operativos y utilidad neta", () => {
    it("cruza el historial de gastos por isoMonth y calcula la utilidad neta", async () => {
      mockGetExpenseHistory.mockResolvedValue([
        makeExpenseMonth({ isoMonth: "2026-06", total: 9999 }),
        makeExpenseMonth({ isoMonth: "2026-07", total: 2000 }),
      ]);
      renderWithQueryClient(
        <SalesReport
          monthKey="2026-07"
          reports={reportsWith({
            key: "2026-07",
            totalRevenue: 10000,
            byProduct: [
              { productId: 1, name: "Bota", type: "bota", unitsSold: 5, revenue: 6000, unitCost: 500 },
              { productId: 2, name: "Sombrero", type: "sombrero", unitsSold: 3, revenue: 4000, unitCost: 400 },
            ],
          })}
        />,
      );

      // utilidad bruta 6,300 − gastos 2,000 = utilidad neta 4,300 (43% de margen).
      expect(await screen.findByText("$2,000.00")).toBeInTheDocument();
      expect(screen.getByText("$4,300.00")).toBeInTheDocument();
      expect(screen.getByText("43% de margen")).toBeInTheDocument();
    });

    it("mientras la query de gastos está en vuelo muestra «—», nunca $0.00", () => {
      mockGetExpenseHistory.mockReturnValue(new Promise(() => {}));
      renderWithQueryClient(
        <SalesReport
          monthKey="2026-07"
          reports={reportsWith({ key: "2026-07" })}
        />,
      );

      const gastosCard = screen.getByText("Gastos operativos").closest("div");
      expect(within(gastosCard!).getByText("—")).toBeInTheDocument();
      const netaCard = screen.getByText("Utilidad neta del mes").closest("div");
      expect(within(netaCard!).getByText("—")).toBeInTheDocument();
    });

    it("un mes sin match en el historial de gastos muestra «—», no $0.00", async () => {
      mockGetExpenseHistory.mockResolvedValue([
        makeExpenseMonth({ isoMonth: "2026-05", total: 1000 }),
      ]);
      renderWithQueryClient(
        <SalesReport
          monthKey="2026-07"
          reports={reportsWith({ key: "2026-07" })}
        />,
      );

      // Flushea la resolución de la query antes de afirmar que sigue en "—":
      // ambos estados (cargando y resuelto-sin-match) se ven igual en pantalla,
      // así que sin esperar la resolución la aserción pasaría aunque el estado
      // resuelto sí mostrara "$0.00".
      await waitFor(() => expect(mockGetExpenseHistory).toHaveBeenCalledTimes(1));

      const gastosCard = screen.getByText("Gastos operativos").closest("div");
      expect(within(gastosCard!).getByText("—")).toBeInTheDocument();
      expect(within(gastosCard!).queryByText("$0.00")).not.toBeInTheDocument();
      const netaCard = screen.getByText("Utilidad neta del mes").closest("div");
      expect(within(netaCard!).getByText("—")).toBeInTheDocument();
      // Sin margen neto conocido, el subtexto se omite entero (no "— % de margen").
      expect(within(netaCard!).queryByText(/% de margen/)).not.toBeInTheDocument();
    });

    it("un mes con gastos operativos en $0 los muestra como $0.00, no como «—»", async () => {
      mockGetExpenseHistory.mockResolvedValue([
        makeExpenseMonth({ isoMonth: "2026-07", total: 0 }),
      ]);
      renderWithQueryClient(
        <SalesReport
          monthKey="2026-07"
          reports={reportsWith({ key: "2026-07", totalRevenue: 10000 })}
        />,
      );

      // $0 es un dato real (gastos genuinamente en cero), distinto de "no se sabe".
      const gastosCard = screen.getByText("Gastos operativos").closest("div");
      expect(await within(gastosCard!).findByText("$0.00")).toBeInTheDocument();
    });

    // Sin este aviso, un 500 y "este mes no tiene gastos registrados" se ven
    // exactamente igual (el mismo "—") y no hay forma de reintentar sin
    // remontar la sección entera.
    it("si la query de gastos falla, lo dice y ofrece reintentar", async () => {
      mockGetExpenseHistory.mockRejectedValue(new Error("boom"));
      const { user } = renderWithQueryClient(
        <SalesReport monthKey="2026-07" reports={reportsWith({ key: "2026-07" })} />,
      );

      const retry = await screen.findByRole("button", {
        name: /No se pudieron cargar/,
      });
      const gastosCard = screen.getByText("Gastos operativos").closest("div");
      expect(within(gastosCard!).getByText("—")).toBeInTheDocument();

      mockGetExpenseHistory.mockResolvedValue([
        makeExpenseMonth({ isoMonth: "2026-07", total: 2000 }),
      ]);
      await user.click(retry);

      expect(await within(gastosCard!).findByText("$2,000.00")).toBeInTheDocument();
    });

    // El mes en curso mezcla dos ventanas: los ingresos llegan hasta hoy, pero
    // `ExpenseMonth.total` trae el mes completo (el backend genera también los
    // cargos futuros). La resta se sigue mostrando, pero rotulada — sin la nota
    // se lee como una caída de utilidad que no ocurrió.
    it("advierte que un mes en curso compara ingresos a la fecha contra gastos del mes completo", async () => {
      mockGetExpenseHistory.mockResolvedValue([
        makeExpenseMonth({ isoMonth: "2026-07", total: 2000, partial: true }),
      ]);
      renderWithQueryClient(
        <SalesReport
          monthKey="2026-07"
          reports={reportsWith({ key: "2026-07", partial: true })}
        />,
      );

      expect(
        await screen.findByText(
          "mes en curso: ingresos a la fecha contra gastos del mes completo",
        ),
      ).toBeInTheDocument();
    });

    it("un mes cerrado no lleva la advertencia de ventanas desiguales", async () => {
      mockGetExpenseHistory.mockResolvedValue([
        makeExpenseMonth({ isoMonth: "2026-07", total: 2000 }),
      ]);
      renderWithQueryClient(
        <SalesReport monthKey="2026-07" reports={reportsWith({ key: "2026-07" })} />,
      );

      // Espera a que la utilidad neta exista antes de afirmar la ausencia de la
      // nota: sin esto la aserción correría contra el DOM previo a la query y
      // pasaría igual estuviera bien o mal (ver OutletView.test.tsx).
      expect(await screen.findByText("$4,300.00")).toBeInTheDocument();
      expect(screen.queryByText(/ingresos a la fecha/)).not.toBeInTheDocument();
    });

    // El envío se ignora A PROPÓSITO: `totalRevenue` es mercancía a precio de
    // lista, sin el envío cobrado al cliente, así que restar la guía castigaría
    // el mismo peso dos veces (el dashboard sí la resta porque su base es
    // `order.total`, que sí lo incluye). Si alguien "arregla" esto restando
    // `shippingCost`, este test lo detiene.
    it("no resta el envío derivado del mes a la utilidad neta", async () => {
      mockGetExpenseHistory.mockResolvedValue([
        makeExpenseMonth({
          isoMonth: "2026-07",
          total: 2000,
          shippingCost: {
            ...makeExpenseMonth().shippingCost,
            amount: 1500,
            orders: 9,
          },
        }),
      ]);
      renderWithQueryClient(
        <SalesReport monthKey="2026-07" reports={reportsWith({ key: "2026-07" })} />,
      );

      // 6,300 − 2,000 = 4,300, no 2,800. Se escopea a la tarjeta: "$2,800.00"
      // también es la utilidad del sombrero en la tabla de productos (6,300 −
      // 2,000 − 1,500 daría justo ese mismo número — la coincidencia es la que
      // hace obligatorio el `within`).
      expect(await screen.findByText("$4,300.00")).toBeInTheDocument();
      const netaCard = screen.getByText("Utilidad neta del mes").closest("div");
      expect(within(netaCard!).getByText("$4,300.00")).toBeInTheDocument();
      expect(within(netaCard!).queryByText("$2,800.00")).not.toBeInTheDocument();
    });
  });

  // ── Comparación contra el mes anterior ──

  it("el primer mes del historial no compara contra nada", () => {
    renderWithQueryClient(
      <SalesReport
        monthKey="2026-06"
        reports={reportsWith(
          { key: "2026-06", label: "Junio 2026" },
          { key: "2026-07", label: "Julio 2026" },
        )}
      />,
    );

    expect(screen.queryByText(/vs mes anterior/)).not.toBeInTheDocument();
  });

  it("un mes anterior sin ingresos tampoco genera comparación (evita dividir entre cero)", () => {
    renderWithQueryClient(
      <SalesReport
        monthKey="2026-07"
        reports={reportsWith(
          { key: "2026-06", totalRevenue: 0 },
          { key: "2026-07", totalRevenue: 10000 },
        )}
      />,
    );

    expect(screen.queryByText(/vs mes anterior/)).not.toBeInTheDocument();
  });

  it("un mes al alza compara en verde y con signo +", () => {
    renderWithQueryClient(
      <SalesReport
        monthKey="2026-07"
        reports={reportsWith(
          { key: "2026-06", totalRevenue: 8000 },
          { key: "2026-07", totalRevenue: 10000 },
        )}
      />,
    );

    const trend = screen.getByText(/vs mes anterior/);
    expect(trend).toHaveTextContent("+25% vs mes anterior");
    expect(trend).toHaveClass("text-emerald-400/80");
  });

  it("un mes a la baja compara en rojo y sin signo + (el porcentaje ya es negativo)", () => {
    renderWithQueryClient(
      <SalesReport
        monthKey="2026-07"
        reports={reportsWith(
          { key: "2026-06", totalRevenue: 10000 },
          { key: "2026-07", totalRevenue: 8000 },
        )}
      />,
    );

    const trend = screen.getByText(/vs mes anterior/);
    expect(trend).toHaveTextContent("-20% vs mes anterior");
    expect(trend).toHaveClass("text-red-400/80");
  });

  // Un mes plano (diff === 0) cuenta como positivo: `diff >= 0`.
  it("un mes idéntico al anterior se considera positivo", () => {
    renderWithQueryClient(
      <SalesReport
        monthKey="2026-07"
        reports={reportsWith(
          { key: "2026-06", totalRevenue: 10000 },
          { key: "2026-07", totalRevenue: 10000 },
        )}
      />,
    );

    expect(screen.getByText(/vs mes anterior/)).toHaveTextContent("+0% vs mes anterior");
  });

  it("marca el mes en curso como parcial", () => {
    renderWithQueryClient(
      <SalesReport
        monthKey="2026-07"
        reports={reportsWith({ key: "2026-07", partial: true })}
      />,
    );
    expect(screen.getByText("mes parcial")).toBeInTheDocument();
  });

  it("un mes cerrado no lleva la nota de parcial", () => {
    renderWithQueryClient(
      <SalesReport monthKey="2026-07" reports={reportsWith({ key: "2026-07" })} />,
    );
    expect(screen.queryByText("mes parcial")).not.toBeInTheDocument();
  });

  // ── Imprimir reporte ──

  describe("imprimir reporte", () => {
    it("al hacer clic en «Imprimir reporte» llama a window.print()", async () => {
      const { user } = renderWithQueryClient(
        <SalesReport monthKey="2026-07" reports={reportsWith({ key: "2026-07" })} />,
      );

      await clickPrint(user);
      await waitFor(() => expect(window.print).toHaveBeenCalled());
    });

    it("el bloque imprimible incluye el resumen de KPIs del mes", async () => {
      mockGetExpenseHistory.mockResolvedValue([
        makeExpenseMonth({ isoMonth: "2026-07", total: 2000 }),
      ]);
      const { user, container } = renderWithQueryClient(
        <SalesReport
          monthKey="2026-07"
          reports={reportsWith({
            key: "2026-07",
            totalRevenue: 10000,
            totalUnits: 8,
            byProduct: [
              { productId: 1, name: "Bota", type: "bota", unitsSold: 5, revenue: 6000, unitCost: 500 },
              { productId: 2, name: "Sombrero", type: "sombrero", unitsSold: 3, revenue: 4000, unitCost: 400 },
            ],
          })}
        />,
      );

      await clickPrint(user);
      const printable = within(
        await waitFor(() => container.querySelector("#print-reporte-ventas") as HTMLElement),
      );
      // La etiqueta y el valor comparten un mismo <div> (`<span>Label:</span> valor`),
      // así que se ubica el <div> por la etiqueta (única, match exacto) y se
      // afirma el valor DENTRO de ese <div> — afirmar con una regex que abarque
      // ambos nodos a nivel del contenedor completo matchearía de más (el grid
      // de KPIs entero también "contiene" la subcadena).
      const field = (label: string) => printable.getByText(label).closest("div")!;

      // costo = 5×500 + 3×400 = 3,700 → utilidad bruta 6,300; neta 6,300−2,000 = 4,300.
      expect(printable.getByText(/Reporte de ventas — Julio 2026/)).toBeInTheDocument();
      expect(within(field("Ingresos:")).getByText(/\$10,000\.00/)).toBeInTheDocument();
      expect(within(field("Costo de mercancía:")).getByText(/\$3,700\.00/)).toBeInTheDocument();
      expect(
        within(field("Utilidad bruta:")).getByText(/\$6,300\.00 \(63% margen\)/),
      ).toBeInTheDocument();
      expect(within(field("Gastos operativos:")).getByText(/\$2,000\.00/)).toBeInTheDocument();
      expect(
        within(field("Utilidad neta:")).getByText(/\$4,300\.00 \(43% margen\)/),
      ).toBeInTheDocument();
      expect(within(field("Piezas vendidas:")).getByText(/8/)).toBeInTheDocument();
    });

    it("un mes sin match en el historial de gastos imprime «—» en vez de $0.00", async () => {
      const { user, container } = renderWithQueryClient(
        <SalesReport monthKey="2026-07" reports={reportsWith({ key: "2026-07" })} />,
      );

      await clickPrint(user);
      const printable = within(
        await waitFor(() => container.querySelector("#print-reporte-ventas") as HTMLElement),
      );

      const gastosField = printable.getByText("Gastos operativos:").closest("div")!;
      expect(within(gastosField).getByText(/—/)).toBeInTheDocument();
      expect(within(gastosField).queryByText(/\$0\.00/)).not.toBeInTheDocument();
    });

    it("un mes sin piezas vendidas imprime «—» de precio promedio/pieza en vez de dividir entre cero", async () => {
      const { user, container } = renderWithQueryClient(
        <SalesReport
          monthKey="2026-07"
          reports={reportsWith({
            key: "2026-07",
            totalRevenue: 0,
            totalUnits: 0,
            byProduct: [],
            byCategory: [],
          })}
        />,
      );

      await clickPrint(user);
      const printable = within(
        await waitFor(() => container.querySelector("#print-reporte-ventas") as HTMLElement),
      );

      const priceField = printable.getByText("Precio promedio/pieza:").closest("div")!;
      expect(within(priceField).getByText(/—/)).toBeInTheDocument();
    });

    it("el bloque imprimible incluye la tabla completa de productos con precio unitario promedio", async () => {
      const { user, container } = renderWithQueryClient(
        <SalesReport
          monthKey="2026-07"
          reports={reportsWith({
            key: "2026-07",
            totalRevenue: 10000,
            byProduct: [
              { productId: 1, name: "Sombrero de fieltro", type: "sombrero", unitsSold: 4, revenue: 4000, unitCost: 400 },
              { productId: 2, name: "Bota alta", type: "bota", unitsSold: 5, revenue: 6000, unitCost: 500 },
            ],
          })}
        />,
      );

      await clickPrint(user);
      const printable = within(
        await waitFor(() => container.querySelector("#print-reporte-ventas") as HTMLElement),
      );

      expect(printable.getByText("Sombrero de fieltro")).toBeInTheDocument();
      expect(printable.getByText("Bota alta")).toBeInTheDocument();
      // 6000/5 = 1,200 y 4000/4 = 1,000: precio unitario promedio por producto.
      expect(printable.getByText("$1,200.00")).toBeInTheDocument();
      expect(printable.getByText("$1,000.00")).toBeInTheDocument();
    });

    it("un producto sin unidades vendidas no aparece en la tabla impresa", async () => {
      const { user, container } = renderWithQueryClient(
        <SalesReport
          monthKey="2026-07"
          reports={reportsWith({
            key: "2026-07",
            byProduct: [
              { productId: 1, name: "Bota vaquera", type: "bota", unitsSold: 5, revenue: 6000, unitCost: 500 },
              { productId: 2, name: "Sin ventas este mes", type: "bota", unitsSold: 0, revenue: 0, unitCost: 0 },
            ],
          })}
        />,
      );

      await clickPrint(user);
      const printable = within(
        await waitFor(() => container.querySelector("#print-reporte-ventas") as HTMLElement),
      );

      expect(printable.getByText("Bota vaquera")).toBeInTheDocument();
      expect(printable.queryByText("Sin ventas este mes")).not.toBeInTheDocument();
    });

    it("el bloque imprimible incluye el desglose por categoría", async () => {
      const { user, container } = renderWithQueryClient(
        <SalesReport
          monthKey="2026-07"
          reports={reportsWith({ key: "2026-07", totalRevenue: 10000 })}
        />,
      );

      await clickPrint(user);
      const printable = within(
        await waitFor(() => container.querySelector("#print-reporte-ventas") as HTMLElement),
      );

      expect(printable.getByText("Botas")).toBeInTheDocument();
      expect(printable.getByText("Sombreros")).toBeInTheDocument();
    });

    // Imprimir con la query de gastos aún en vuelo saca una hoja con "—" en
    // Gastos operativos y Utilidad neta, indistinguible de un mes sin gastos
    // registrados — y en papel ya no hay forma de notar la diferencia.
    it("el botón queda deshabilitado mientras la query de gastos está en vuelo", async () => {
      mockGetExpenseHistory.mockReturnValue(new Promise(() => {}));
      renderWithQueryClient(
        <SalesReport monthKey="2026-07" reports={reportsWith({ key: "2026-07" })} />,
      );

      expect(
        screen.getByRole("button", { name: "Imprimir reporte" }),
      ).toBeDisabled();
      expect(screen.getByText("Cargando gastos…")).toBeInTheDocument();
    });

    it("el bloque imprimible advierte que el mes está en curso", async () => {
      mockGetExpenseHistory.mockResolvedValue([
        makeExpenseMonth({ isoMonth: "2026-07", total: 2000, partial: true }),
      ]);
      const { user, container } = renderWithQueryClient(
        <SalesReport
          monthKey="2026-07"
          reports={reportsWith({ key: "2026-07", partial: true })}
        />,
      );

      await clickPrint(user);
      const printable = within(
        await waitFor(() => container.querySelector("#print-reporte-ventas") as HTMLElement),
      );

      // La nota de "mes parcial" solo vivía en la tarjeta de Ingresos en
      // pantalla: una hoja impresa se archiva y se lee meses después, fuera de
      // contexto, así que ahí es donde más falta hace.
      expect(printable.getByText("Mes parcial:")).toBeInTheDocument();
      expect(
        printable.getByText(/ingresos a la fecha contra los gastos del mes completo/),
      ).toBeInTheDocument();
    });

    // Sin utilidad neta que rotular, la nota de mes parcial se queda en su
    // mitad de ventas: prometer una comparación de gastos que no se hizo sería
    // peor que no decir nada.
    it("un mes en curso sin gastos que cruzar imprime la nota de parcial sin la frase de la utilidad neta", async () => {
      const { user, container } = renderWithQueryClient(
        <SalesReport
          monthKey="2026-07"
          reports={reportsWith({ key: "2026-07", partial: true })}
        />,
      );

      await clickPrint(user);
      const printable = within(
        await waitFor(() => container.querySelector("#print-reporte-ventas") as HTMLElement),
      );

      expect(printable.getByText("Mes parcial:")).toBeInTheDocument();
      expect(printable.queryByText(/ingresos a la fecha/)).not.toBeInTheDocument();
    });

    // `showPrintable` era un booleano: un segundo clic con el bloque ya montado
    // era un `setState` sin cambio → sin re-render → sin `window.print()`. Con
    // un navegador que no despache `afterprint` (webviews embebidos) el botón
    // quedaba muerto hasta remontar la sección.
    it("un segundo clic vuelve a imprimir aunque «afterprint» no se haya disparado", async () => {
      const { user } = renderWithQueryClient(
        <SalesReport monthKey="2026-07" reports={reportsWith({ key: "2026-07" })} />,
      );

      await clickPrint(user);
      await waitFor(() => expect(window.print).toHaveBeenCalledTimes(1));

      // Sin `afterprint` de por medio: el bloque sigue montado.
      await clickPrint(user);
      await waitFor(() => expect(window.print).toHaveBeenCalledTimes(2));
    });

    it("al cerrar el diálogo de impresión (afterprint) el bloque imprimible se desmonta", async () => {
      const { user, container } = renderWithQueryClient(
        <SalesReport monthKey="2026-07" reports={reportsWith({ key: "2026-07" })} />,
      );

      await clickPrint(user);
      await waitFor(() => expect(container.querySelector("#print-reporte-ventas")).not.toBeNull());

      act(() => {
        window.dispatchEvent(new Event("afterprint"));
      });

      await waitFor(() =>
        expect(container.querySelector("#print-reporte-ventas")).toBeNull(),
      );
    });
  });
});
