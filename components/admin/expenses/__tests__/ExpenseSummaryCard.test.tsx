import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExpenseSummaryCard from "../ExpenseSummaryCard";
import {
  makeDerivedShippingCost,
  makeExpenseSummary,
  makeUpcomingCharge,
} from "./helpers/factories";
import { upcomingWindowRangeLabel } from "../expenseStatus";

// La tarjeta recibe la query ya resuelta por ExpensesSection (summary/isPending/
// isError como props), así que no necesita QueryClientProvider — a diferencia de
// ExpenseHistory, que monta su propia query lazy.
//
// Los dos números grandes NO son el mismo y la tarjeta existe para separarlos:
// `monthlyRunRate` es la carga mensual normalizada (sin los `once`), `upcomingTotal`
// es lo que de verdad va a salir de la tarjeta en la ventana (donde los `once` sí
// entran). Sumarlos sería contar dos veces — de ahí que cada caso los verifique
// como cifras independientes.
describe("ExpenseSummaryCard", () => {
  describe("estados de la query", () => {
    it("muestra 'Calculando…' mientras carga", () => {
      render(<ExpenseSummaryCard summary={undefined} isPending isError={false} />);
      expect(screen.getByText("Calculando…")).toBeInTheDocument();
    });

    it("muestra un error cuando la query falla", () => {
      render(<ExpenseSummaryCard summary={undefined} isPending={false} isError />);
      expect(screen.getByRole("alert")).toHaveTextContent(
        "No pudimos calcular el resumen de gastos."
      );
    });

    it("también muestra el error si la query dice OK pero no trajo resumen", () => {
      // `isError: false` con `summary: undefined` no debe caer al render feliz y
      // reventar al leer `summary.monthlyRunRate`.
      render(<ExpenseSummaryCard summary={undefined} isPending={false} isError={false} />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("isPending gana sobre un resumen ya presente", () => {
      render(<ExpenseSummaryCard summary={makeExpenseSummary()} isPending isError={false} />);
      expect(screen.getByText("Calculando…")).toBeInTheDocument();
      expect(screen.queryByText("Hay que apartar al mes")).not.toBeInTheDocument();
    });
  });

  describe("cuánto apartar", () => {
    it("pinta la carga mensual, la anual y el conteo de gastos activos", () => {
      const summary = makeExpenseSummary({
        monthlyRunRate: 1200,
        annualRunRate: 14400,
        activeCount: 3,
      });
      render(<ExpenseSummaryCard summary={summary} isPending={false} isError={false} />);

      expect(screen.getByText("$1,200.00")).toBeInTheDocument();
      expect(screen.getByText(/\$14,400\.00 al año · 3 gastos activos/)).toBeInTheDocument();
    });

    it("pluraliza en singular con un solo gasto activo", () => {
      const summary = makeExpenseSummary({ activeCount: 1 });
      render(<ExpenseSummaryCard summary={summary} isPending={false} isError={false} />);
      expect(screen.getByText(/· 1 gasto activo$/)).toBeInTheDocument();
    });

    it("explica los gastos de única vez que NO entran en la carga mensual", () => {
      // Sin esta línea, un gasto de única vez de $8,000 que no movió el número de
      // arriba parece un error de suma.
      const summary = makeExpenseSummary({
        byFrequency: [
          { frequency: "monthly", count: 3, monthlyRunRate: 1200 },
          { frequency: "once", count: 2, monthlyRunRate: 0 },
        ],
      });
      render(<ExpenseSummaryCard summary={summary} isPending={false} isError={false} />);

      expect(screen.getByText(/No incluye 2 gastos de única vez/)).toBeInTheDocument();
    });

    it("pluraliza en singular con un solo gasto de única vez", () => {
      const summary = makeExpenseSummary({
        byFrequency: [
          { frequency: "monthly", count: 3, monthlyRunRate: 1200 },
          { frequency: "once", count: 1, monthlyRunRate: 0 },
        ],
      });
      render(<ExpenseSummaryCard summary={summary} isPending={false} isError={false} />);

      expect(screen.getByText(/No incluye 1 gasto de única vez/)).toBeInTheDocument();
    });

    it("no menciona los gastos de única vez cuando no hay ninguno", () => {
      render(
        <ExpenseSummaryCard
          summary={makeExpenseSummary()}
          isPending={false}
          isError={false}
        />
      );
      expect(screen.queryByText(/de única vez/)).not.toBeInTheDocument();
    });

    it("no menciona los de única vez cuando el renglón existe pero cuenta cero", () => {
      const summary = makeExpenseSummary({
        byFrequency: [
          { frequency: "monthly", count: 3, monthlyRunRate: 1200 },
          { frequency: "once", count: 0, monthlyRunRate: 0 },
        ],
      });
      render(<ExpenseSummaryCard summary={summary} isPending={false} isError={false} />);
      expect(screen.queryByText(/de única vez/)).not.toBeInTheDocument();
    });
  });

  describe("desglose por categoría", () => {
    it("omite las categorías cuyo run-rate es cero", () => {
      const summary = makeExpenseSummary({
        byCategory: [
          { category: "infraestructura", count: 2, monthlyRunRate: 900 },
          { category: "publicidad", count: 1, monthlyRunRate: 0 },
        ],
      });
      render(<ExpenseSummaryCard summary={summary} isPending={false} isError={false} />);

      expect(screen.getByText("Infraestructura")).toBeInTheDocument();
      expect(screen.queryByText("Publicidad")).not.toBeInTheDocument();
    });

    it("muestra como máximo cuatro categorías", () => {
      const summary = makeExpenseSummary({
        byCategory: [
          { category: "infraestructura", count: 1, monthlyRunRate: 500 },
          { category: "software", count: 1, monthlyRunRate: 400 },
          { category: "renta", count: 1, monthlyRunRate: 300 },
          { category: "servicios", count: 1, monthlyRunRate: 200 },
          { category: "publicidad", count: 1, monthlyRunRate: 100 },
        ],
      });
      render(<ExpenseSummaryCard summary={summary} isPending={false} isError={false} />);

      expect(screen.getByText("Servicios")).toBeInTheDocument();
      expect(screen.queryByText("Publicidad")).not.toBeInTheDocument();
    });

    it("no pinta la lista cuando ninguna categoría tiene carga mensual", () => {
      const summary = makeExpenseSummary({
        byCategory: [{ category: "publicidad", count: 1, monthlyRunRate: 0 }],
      });
      render(<ExpenseSummaryCard summary={summary} isPending={false} isError={false} />);
      expect(screen.queryByText("Publicidad")).not.toBeInTheDocument();
    });
  });

  describe("línea derivada de envío", () => {
    it("la incluye con su advertencia de no capturarla como gasto", () => {
      // ShippingCostNote se pinta en DOS pantallas (esta tarjeta y el detalle de
      // mes del historial) y por eso vive en un componente compartido: las dos
      // tienen que decir exactamente lo mismo.
      const summary = makeExpenseSummary({
        shippingCost: makeDerivedShippingCost({ amount: 640 }),
      });
      render(<ExpenseSummaryCard summary={summary} isPending={false} isError={false} />);

      expect(screen.getByText(/Envíos \(guías\):/)).toHaveTextContent("$640.00");
      expect(
        screen.getByText("No lo captures como gasto: se contaría dos veces.")
      ).toBeInTheDocument();
    });

    it("su monto NO se suma a la carga mensual ni al total de próximos cargos", () => {
      // La invariante que ordena toda la Fase 22: el envío ya está restado en
      // GANANCIA BRUTA, así que sumarlo aquí lo restaría dos veces. Los números de
      // la tarjeta tienen que seguir siendo los del backend, tal cual.
      // Dos cargos en días distintos para que `upcomingTotal` ($490) no coincida
      // con el total de ningún día suelto ($290 / $200): así la aserción del
      // encabezado no puede pasar leyendo por accidente el número de un bloque
      // del timeline.
      const summary = makeExpenseSummary({
        monthlyRunRate: 1200,
        annualRunRate: 14400,
        upcomingTotal: 490,
        upcomingCharges: [
          makeUpcomingCharge({ expenseId: 1, date: "2026-09-01", amount: 290 }),
          makeUpcomingCharge({ expenseId: 2, date: "2026-09-02", amount: 200 }),
        ],
        shippingCost: makeDerivedShippingCost({ amount: 640 }),
      });
      render(<ExpenseSummaryCard summary={summary} isPending={false} isError={false} />);

      expect(screen.getByText("$1,200.00")).toBeInTheDocument();
      expect(screen.getByText("$490.00")).toBeInTheDocument();
      // 1200 + 640 y 490 + 640: las sumas que no deben aparecer en ningún lado.
      expect(screen.queryByText("$1,840.00")).not.toBeInTheDocument();
      expect(screen.queryByText("$1,130.00")).not.toBeInTheDocument();
    });
  });

  describe("próximos cargos", () => {
    it("rotula la ventana con su rango de fechas, no solo con los días", () => {
      // "Próximos 60 días" por sí solo no dice qué fechas cubre — y sin eso, un
      // gasto mensual con dos fechas de cobro dentro de la ventana se lee como el
      // mismo cargo repetido en vez de dos cargos reales distintos.
      const summary = makeExpenseSummary({ upcomingDays: 60 });
      render(<ExpenseSummaryCard summary={summary} isPending={false} isError={false} />);

      expect(
        screen.getByText(`${upcomingWindowRangeLabel(60)} · próximos 60 días`)
      ).toBeInTheDocument();
    });

    it("muestra el estado vacío cuando no hay cargos en la ventana", () => {
      const summary = makeExpenseSummary({ upcomingCharges: [], upcomingTotal: 0 });
      render(<ExpenseSummaryCard summary={summary} isPending={false} isError={false} />);

      expect(screen.getByText("No hay cargos programados en la ventana.")).toBeInTheDocument();
    });

    it("agrupa por fecha: un día con dos cargos es un solo bloque con su total", () => {
      const summary = makeExpenseSummary({
        upcomingTotal: 490,
        upcomingCharges: [
          makeUpcomingCharge({ expenseId: 1, concept: "Render", date: "2026-09-01", amount: 290 }),
          makeUpcomingCharge({ expenseId: 2, concept: "Dominio", date: "2026-09-01", amount: 200 }),
        ],
      });
      render(<ExpenseSummaryCard summary={summary} isPending={false} isError={false} />);

      // Una sola fecha en el timeline pese a haber dos cargos.
      const dates = screen.getAllByText("1 sep");
      expect(dates).toHaveLength(1);
      // El total del día vive junto a su fecha. Se acota al hermano dentro del
      // mismo bloque: $490.00 también es el `upcomingTotal` del encabezado (mismo
      // número, dos elementos — la trampa recurrente de esta pantalla).
      expect(within(dates[0].parentElement!).getByText("$490.00")).toBeInTheDocument();
      expect(screen.getByText(/^Render/)).toBeInTheDocument();
      expect(screen.getByText(/^Dominio/)).toBeInTheDocument();
    });

    it("con dos cargos el mismo día sí desglosa el monto de cada uno", () => {
      const summary = makeExpenseSummary({
        upcomingTotal: 490,
        upcomingCharges: [
          makeUpcomingCharge({ expenseId: 1, concept: "Render", date: "2026-09-01", amount: 290 }),
          makeUpcomingCharge({ expenseId: 2, concept: "Dominio", date: "2026-09-01", amount: 200 }),
        ],
      });
      render(<ExpenseSummaryCard summary={summary} isPending={false} isError={false} />);

      expect(screen.getByText("$290.00")).toBeInTheDocument();
      expect(screen.getByText("$200.00")).toBeInTheDocument();
    });

    it("con un solo cargo en el día NO repite el monto (el total del día ya es ése)", () => {
      const summary = makeExpenseSummary({
        upcomingCharges: [
          makeUpcomingCharge({ expenseId: 1, concept: "Render", date: "2026-09-01", amount: 290 }),
        ],
      });
      render(<ExpenseSummaryCard summary={summary} isPending={false} isError={false} />);

      // $290.00 aparece como total del día y como `upcomingTotal` del encabezado,
      // pero no una tercera vez como monto suelto del cargo.
      expect(screen.getAllByText("$290.00")).toHaveLength(2);
    });

    it("pinta frecuencia y proveedor de cada cargo", () => {
      const summary = makeExpenseSummary({
        upcomingCharges: [
          makeUpcomingCharge({ concept: "Render", frequency: "monthly", vendor: "Render Inc" }),
        ],
      });
      render(<ExpenseSummaryCard summary={summary} isPending={false} isError={false} />);

      expect(screen.getByText(/· Mensual · Render Inc$/)).toBeInTheDocument();
    });

    it("un cargo sin proveedor no deja el ' · ' colgando", () => {
      const summary = makeExpenseSummary({
        upcomingCharges: [
          makeUpcomingCharge({ concept: "Render", frequency: "monthly", vendor: null }),
        ],
      });
      render(<ExpenseSummaryCard summary={summary} isPending={false} isError={false} />);

      expect(screen.getByText(/· Mensual$/)).toBeInTheDocument();
    });
  });

  describe("recorte de la lista ('ver más')", () => {
    function summaryWithGroups(count: number) {
      return makeExpenseSummary({
        upcomingCharges: Array.from({ length: count }, (_, index) =>
          makeUpcomingCharge({
            expenseId: index + 1,
            concept: `Gasto ${index + 1}`,
            // Un día distinto por cargo → un grupo por cargo.
            date: `2026-09-${String(index + 1).padStart(2, "0")}`,
          })
        ),
      });
    }

    it("no ofrece el botón con cinco fechas o menos", () => {
      render(
        <ExpenseSummaryCard
          summary={summaryWithGroups(5)}
          isPending={false}
          isError={false}
        />
      );
      expect(screen.getByText("Gasto 5")).toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("recorta a cinco fechas y ofrece ver el resto", () => {
      render(
        <ExpenseSummaryCard
          summary={summaryWithGroups(7)}
          isPending={false}
          isError={false}
        />
      );

      expect(screen.getByText("Gasto 5")).toBeInTheDocument();
      expect(screen.queryByText("Gasto 6")).not.toBeInTheDocument();
      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Ver 2 cargos más");
      expect(button).toHaveAttribute("aria-expanded", "false");
    });

    it("pluraliza en singular cuando queda un solo cargo escondido", () => {
      render(
        <ExpenseSummaryCard
          summary={summaryWithGroups(6)}
          isPending={false}
          isError={false}
        />
      );
      expect(screen.getByRole("button")).toHaveTextContent("Ver 1 cargo más");
    });

    it("expandir muestra el resto y permite volver a colapsar", async () => {
      const user = userEvent.setup();
      render(
        <ExpenseSummaryCard
          summary={summaryWithGroups(7)}
          isPending={false}
          isError={false}
        />
      );

      await user.click(screen.getByRole("button"));
      expect(screen.getByText("Gasto 7")).toBeInTheDocument();
      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Mostrar menos");
      expect(button).toHaveAttribute("aria-expanded", "true");

      await user.click(button);
      expect(screen.queryByText("Gasto 6")).not.toBeInTheDocument();
      expect(screen.getByRole("button")).toHaveTextContent("Ver 2 cargos más");
    });

    it("cuenta cargos escondidos, no fechas escondidas", () => {
      // Seis grupos, pero el sexto trae DOS cargos: el botón debe decir 2, no 1.
      const summary = makeExpenseSummary({
        upcomingCharges: [
          ...Array.from({ length: 5 }, (_, index) =>
            makeUpcomingCharge({
              expenseId: index + 1,
              concept: `Gasto ${index + 1}`,
              date: `2026-09-0${index + 1}`,
            })
          ),
          makeUpcomingCharge({ expenseId: 6, concept: "Gasto 6", date: "2026-09-10" }),
          makeUpcomingCharge({ expenseId: 7, concept: "Gasto 7", date: "2026-09-10" }),
        ],
      });
      render(<ExpenseSummaryCard summary={summary} isPending={false} isError={false} />);

      expect(screen.getByRole("button")).toHaveTextContent("Ver 2 cargos más");
    });
  });
});
