import { screen, within } from "@testing-library/react";
import ExpenseHistory from "../ExpenseHistory";
import { renderWithQueryClient } from "./helpers/render";
import { makeExpenseMonth, makeDerivedShippingCost } from "./helpers/factories";

// ExpenseHistory tiene su propia query (mismo precedente que ReplenishmentReport:
// se monta lazy al abrir la pestaña) — se mockea para no pegarle a la red real.
// jest.mock() usa ruta relativa: el alias @/ de Next no lo resuelve dentro de
// jest.mock() (ver CLAUDE.md).
jest.mock("../../../../lib/api/adminExpenses", () => ({
  ...jest.requireActual("../../../../lib/api/adminExpenses"),
  getExpenseHistory: jest.fn(),
}));

import { getExpenseHistory } from "@/lib/api/adminExpenses";

const getExpenseHistoryMock = getExpenseHistory as jest.Mock;

beforeEach(() => {
  getExpenseHistoryMock.mockReset();
});

describe("ExpenseHistory", () => {
  it("muestra un estado de carga mientras llega el historial", () => {
    getExpenseHistoryMock.mockReturnValue(new Promise(() => {}));
    renderWithQueryClient(<ExpenseHistory />);
    expect(screen.getByText("Cargando historial…")).toBeInTheDocument();
  });

  it("muestra un error con botón de reintentar", async () => {
    getExpenseHistoryMock.mockRejectedValue(new Error("network"));
    renderWithQueryClient(<ExpenseHistory />);

    expect(
      await screen.findByText("No pudimos cargar el historial de gastos.")
    ).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Reintentar" });
    expect(button).toBeInTheDocument();
  });

  it("reintenta la consulta al hacer clic en Reintentar", async () => {
    getExpenseHistoryMock.mockRejectedValueOnce(new Error("network"));
    getExpenseHistoryMock.mockResolvedValueOnce([]);
    const { user } = renderWithQueryClient(<ExpenseHistory />);

    await screen.findByRole("button", { name: "Reintentar" });
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Todavía no hay historial")).toBeInTheDocument();
    expect(getExpenseHistoryMock).toHaveBeenCalledTimes(2);
  });

  it("muestra el estado vacío cuando no hay ningún mes", async () => {
    getExpenseHistoryMock.mockResolvedValue([]);
    renderWithQueryClient(<ExpenseHistory />);

    expect(await screen.findByText("Todavía no hay historial")).toBeInTheDocument();
  });

  describe("con historial", () => {
    function months() {
      return [
        makeExpenseMonth({
          isoMonth: "2026-07",
          label: "Julio 2026",
          partial: false,
          total: 900,
          byCategory: [{ category: "infraestructura", amount: 900 }],
          byExpense: [
            {
              expenseId: 1,
              concept: "Render — Web Service",
              vendor: "Render",
              category: "infraestructura",
              frequency: "monthly",
              occurrences: 1,
              amount: 900,
            },
          ],
          changes: [
            {
              expenseId: 1,
              concept: "Render — Web Service",
              vendor: "Render",
              category: "infraestructura",
              effectiveFrom: "2026-07-01",
              previousAmount: 700,
              amount: 900,
              note: "Subió el dólar",
            },
          ],
          shippingCost: makeDerivedShippingCost({ from: "2026-07-01", to: "2026-07-31", partial: false }),
        }),
        makeExpenseMonth({
          isoMonth: "2026-08",
          label: "Agosto 2026",
          partial: true,
          total: 1200,
          byCategory: [],
          byExpense: [
            {
              expenseId: 2,
              concept: "SMS de verificación",
              vendor: null,
              category: "servicios",
              frequency: "weekly",
              occurrences: 3,
              amount: 1200,
            },
          ],
          changes: [],
          shippingCost: makeDerivedShippingCost({ from: "2026-08-01", to: "2026-08-12", partial: true }),
        }),
      ];
    }

    it("arranca mostrando el detalle del mes más reciente", async () => {
      getExpenseHistoryMock.mockResolvedValue(months());
      renderWithQueryClient(<ExpenseHistory />);

      // "Agosto 2026" sale dos veces: como botón del selector y como encabezado
      // del detalle.
      expect(await screen.findAllByText("Agosto 2026")).toHaveLength(2);
      // El total del mes ($1,200.00) también sale dos veces (encabezado del
      // detalle + fila de "Por gasto", que aquí tiene un solo renglón con el
      // mismo monto): se acota al total del encabezado por su hermano directo.
      const heading = screen.getByRole("heading", { name: "Agosto 2026" });
      expect(heading.nextElementSibling).toHaveTextContent("$1,200.00");
    });

    it("un mes en curso (partial) avisa que el total todavía va a subir", async () => {
      getExpenseHistoryMock.mockResolvedValue(months());
      renderWithQueryClient(<ExpenseHistory />);

      expect(
        await screen.findByText("Agosto 2026 es un mes en curso — el total todavía va a subir.")
      ).toBeInTheDocument();
    });

    it("un mes cerrado no muestra el aviso de mes en curso", async () => {
      getExpenseHistoryMock.mockResolvedValue([months()[0]]);
      renderWithQueryClient(<ExpenseHistory />);

      await screen.findByRole("heading", { name: "Julio 2026" });
      expect(screen.queryByText(/es un mes en curso/)).not.toBeInTheDocument();
    });

    it("cambiar de mes con el selector actualiza el detalle", async () => {
      getExpenseHistoryMock.mockResolvedValue(months());
      const { user } = renderWithQueryClient(<ExpenseHistory />);

      await screen.findByRole("heading", { name: "Agosto 2026" });
      await user.click(screen.getByRole("button", { name: /^Julio 2026/ }));

      const heading = await screen.findByRole("heading", { name: "Julio 2026" });
      expect(heading.nextElementSibling).toHaveTextContent("$900.00");
    });

    it("muestra los cambios de precio del mes con su dirección (sube/baja)", async () => {
      getExpenseHistoryMock.mockResolvedValue(months());
      const { user } = renderWithQueryClient(<ExpenseHistory />);
      await screen.findByRole("heading", { name: "Agosto 2026" });
      await user.click(screen.getByRole("button", { name: /^Julio 2026/ }));

      await screen.findByText("Cambios de precio este mes");
      const delta = screen.getByText("+$200.00 (+28.6%)");
      expect(delta).toHaveClass("text-red-400/80");
    });

    it("una baja de precio se pinta en verde", async () => {
      getExpenseHistoryMock.mockResolvedValue([
        makeExpenseMonth({
          isoMonth: "2026-06",
          label: "Junio 2026",
          changes: [
            {
              expenseId: 4,
              concept: "Plan de hosting",
              vendor: null,
              category: "infraestructura",
              effectiveFrom: "2026-06-01",
              previousAmount: 500,
              amount: 400,
              note: null,
            },
          ],
        }),
      ]);
      renderWithQueryClient(<ExpenseHistory />);

      await screen.findByText("Cambios de precio este mes");
      const delta = screen.getByText("−$100.00 (−20.0%)");
      expect(delta).toHaveClass("text-emerald-400/80");
    });

    it("un cambio sin variación de monto no se pinta ni en rojo ni en verde", async () => {
      getExpenseHistoryMock.mockResolvedValue([
        makeExpenseMonth({
          isoMonth: "2026-06",
          label: "Junio 2026",
          changes: [
            {
              expenseId: 3,
              concept: "Plan de hosting",
              vendor: null,
              category: "infraestructura",
              effectiveFrom: "2026-06-01",
              previousAmount: 500,
              amount: 500,
              note: null,
            },
          ],
        }),
      ]);
      renderWithQueryClient(<ExpenseHistory />);

      await screen.findByText("Cambios de precio este mes");
      const delta = screen.getByText("+$0.00 (+0.0%)");
      expect(delta).toHaveClass("text-amber-100/40");
      expect(delta).not.toHaveClass("text-red-400/80");
      expect(delta).not.toHaveClass("text-emerald-400/80");
    });

    it("'Sin gastos este mes.' también sale en 'Por gasto' cuando byExpense está vacío", async () => {
      getExpenseHistoryMock.mockResolvedValue([
        makeExpenseMonth({
          isoMonth: "2026-06",
          label: "Junio 2026",
          byCategory: [{ category: "infraestructura", amount: 500 }],
          byExpense: [],
        }),
      ]);
      renderWithQueryClient(<ExpenseHistory />);

      expect(await screen.findByText("Sin gastos este mes.")).toBeInTheDocument();
      // Y NO en "Por categoría", que sí tiene datos este mes — de lo contrario el
      // caso estaría probando la rama equivocada.
      const porCategoria = screen.getByText("Por categoría").parentElement!;
      expect(within(porCategoria).queryByText("Sin gastos este mes.")).not.toBeInTheDocument();
    });

    it("no muestra el bloque de cambios cuando el mes no tuvo ninguno", async () => {
      getExpenseHistoryMock.mockResolvedValue(months());
      renderWithQueryClient(<ExpenseHistory />);

      await screen.findByRole("heading", { name: "Agosto 2026" });
      expect(screen.queryByText("Cambios de precio este mes")).not.toBeInTheDocument();
    });

    it("agosto (sin byCategory) muestra el estado vacío de esa columna", async () => {
      getExpenseHistoryMock.mockResolvedValue(months());
      renderWithQueryClient(<ExpenseHistory />);

      await screen.findByRole("heading", { name: "Agosto 2026" });
      expect(screen.getAllByText("Sin gastos este mes.")).toHaveLength(1);
    });

    it("pluraliza los cargos de un gasto que ocurrió más de una vez en el mes", async () => {
      getExpenseHistoryMock.mockResolvedValue(months());
      renderWithQueryClient(<ExpenseHistory />);

      expect(await screen.findByText(/3 cargos/)).toBeInTheDocument();
    });

    it("un gasto con una sola ocurrencia no pinta el contador de cargos", async () => {
      getExpenseHistoryMock.mockResolvedValue(months());
      const { user } = renderWithQueryClient(<ExpenseHistory />);
      await screen.findByRole("heading", { name: "Agosto 2026" });
      await user.click(screen.getByRole("button", { name: /^Julio 2026/ }));

      await screen.findByRole("heading", { name: "Julio 2026" });
      expect(screen.queryByText(/1 cargos/)).not.toBeInTheDocument();
      expect(screen.queryByText(/cargos$/)).not.toBeInTheDocument();
    });

    it("incluye la nota de envío derivado del mes activo", async () => {
      getExpenseHistoryMock.mockResolvedValue(months());
      renderWithQueryClient(<ExpenseHistory />);

      expect(await screen.findByText(/No lo captures como gasto/)).toBeInTheDocument();
    });

    it("marca con asterisco el botón de un mes parcial en el selector", async () => {
      getExpenseHistoryMock.mockResolvedValue(months());
      renderWithQueryClient(<ExpenseHistory />);

      const augustButton = await screen.findByRole("button", { name: /^Agosto 2026/ });
      expect(augustButton).toHaveTextContent("*");
      const julyButton = screen.getByRole("button", { name: /^Julio 2026/ });
      expect(julyButton).not.toHaveTextContent("*");
    });
  });
});
