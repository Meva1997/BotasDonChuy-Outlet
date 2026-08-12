import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExpensesTable from "../ExpensesTable";
import { makeExpense, makeExpenseAmountVersion } from "./helpers/factories";

// ExpensesTable pinta DOS estructuras a la vez (tabla `hidden lg:block` + lista
// `lg:hidden`, mismo patrón que CouponsTable/OrdersTable) — jsdom no aplica media
// queries, así que ambas coexisten en el DOM y el mismo texto aparece dos veces.
// Las aserciones que necesitan unicidad se acotan con `within`.
//
// A diferencia de OrdersTable, aquí las dos vistas comparten el MISMO `RowActions`,
// así que sus handlers no son código distinto — aun así hay un caso que hace clic
// desde la lista móvil, porque "comparten componente" es justo lo que dejaría de
// ser cierto en una refactorización silenciosa.
function baseProps() {
  return {
    confirmingId: null,
    busyId: null,
    onEdit: jest.fn(),
    onChangeAmount: jest.fn(),
    onToggleActive: jest.fn(),
    onAskDelete: jest.fn(),
    onConfirmDelete: jest.fn(),
  };
}

describe("ExpensesTable", () => {
  it("pinta concepto, proveedor, categoría, frecuencia, monto y próximo cargo", () => {
    // Gasto SEMANAL a propósito: es el caso donde "Monto vigente" ($290, lo que
    // cobra el proveedor cada semana) y "Carga mensual" ($1,256.67 normalizado)
    // son números distintos. Con un mensual los dos coinciden y la aserción no
    // distinguiría una columna de la otra.
    const expense = makeExpense({
      concept: "Render — Web Service",
      vendor: "Render",
      category: "infraestructura",
      frequency: "weekly",
      currentAmount: 290,
      monthlyRunRate: 1256.67,
      nextChargeDate: "2026-09-01",
    });
    render(<ExpensesTable expenses={[expense]} {...baseProps()} />);

    const table = within(screen.getByRole("table"));
    expect(table.getByText("Render — Web Service")).toBeInTheDocument();
    expect(table.getByText("Render")).toBeInTheDocument();
    expect(table.getByText("Infraestructura")).toBeInTheDocument();
    expect(table.getByText("Semanal")).toBeInTheDocument();
    expect(table.getByText("$290.00")).toBeInTheDocument();
    expect(table.getByText("$1,256.67")).toBeInTheDocument();
    expect(table.getByText("1 sep")).toBeInTheDocument();
    expect(table.getByText("Activo")).toBeInTheDocument();
  });

  it("también pinta la tarjeta móvil de cada gasto", () => {
    const expense = makeExpense({ concept: "SMS de verificación" });
    render(<ExpensesTable expenses={[expense]} {...baseProps()} />);

    const list = within(screen.getByRole("list"));
    expect(list.getByText("SMS de verificación")).toBeInTheDocument();
  });

  it("no pinta líneas de proveedor ni notas cuando vienen nulas", () => {
    const expense = makeExpense({ vendor: null, notes: null });
    render(<ExpensesTable expenses={[expense]} {...baseProps()} />);

    const table = within(screen.getByRole("table"));
    expect(table.queryByText("Render")).not.toBeInTheDocument();
    // La tarjeta móvil concatena el proveedor en la misma línea que categoría y
    // frecuencia: sin proveedor no debe quedar el " · " colgando.
    const list = within(screen.getByRole("list"));
    expect(list.getByText(/Infraestructura · Mensual$/)).toBeInTheDocument();
  });

  it("pinta las notas del gasto cuando existen", () => {
    const expense = makeExpense({ notes: "Plan Starter · se renueva solo" });
    render(<ExpensesTable expenses={[expense]} {...baseProps()} />);

    const table = within(screen.getByRole("table"));
    expect(table.getByText("Plan Starter · se renueva solo")).toBeInTheDocument();
  });

  it("no pinta ninguna fila con la lista vacía", () => {
    render(<ExpensesTable expenses={[]} {...baseProps()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  describe("columna 'Carga mensual'", () => {
    it("muestra el run-rate de un gasto recurrente", () => {
      const expense = makeExpense({
        frequency: "weekly",
        currentAmount: 100,
        monthlyRunRate: 433.33,
      });
      render(<ExpensesTable expenses={[expense]} {...baseProps()} />);

      const table = within(screen.getByRole("table"));
      expect(table.getByText("$433.33")).toBeInTheDocument();
      expect(table.queryByText("no es carga mensual")).not.toBeInTheDocument();
    });

    it("un gasto que no suma al run-rate se pinta como '—', nunca como $0.00", () => {
      // La razón de existir de RunRateCell: un `once` de $8,000 con "$0.00" en esta
      // columna se lee como un gasto gratuito, no como uno que no es recurrente.
      const expense = makeExpense({
        frequency: "once",
        currentAmount: 8000,
        monthlyRunRate: 0,
      });
      render(<ExpensesTable expenses={[expense]} {...baseProps()} />);

      const table = within(screen.getByRole("table"));
      expect(table.getByText("no es carga mensual")).toBeInTheDocument();
      expect(table.queryByText("$0.00")).not.toBeInTheDocument();
      // Y el monto vigente sí se sigue viendo completo: no es un gasto de cero.
      expect(table.getByText("$8,000.00")).toBeInTheDocument();
    });
  });

  describe("conteo de cambios de precio", () => {
    it("no aparece con una sola versión de monto (nunca cambió)", () => {
      const expense = makeExpense({ amounts: [makeExpenseAmountVersion()] });
      render(<ExpensesTable expenses={[expense]} {...baseProps()} />);
      expect(screen.queryByText(/cambios? de precio/)).not.toBeInTheDocument();
    });

    it("pluraliza en singular con dos versiones (un cambio)", () => {
      const expense = makeExpense({
        amounts: [
          makeExpenseAmountVersion({ id: 1 }),
          makeExpenseAmountVersion({ id: 2, amount: 340, effectiveFrom: "2026-07-01" }),
        ],
      });
      render(<ExpensesTable expenses={[expense]} {...baseProps()} />);

      const table = within(screen.getByRole("table"));
      expect(table.getByText("1 cambio de precio")).toBeInTheDocument();
    });

    it("pluraliza en plural con tres versiones (dos cambios)", () => {
      const expense = makeExpense({
        amounts: [
          makeExpenseAmountVersion({ id: 1 }),
          makeExpenseAmountVersion({ id: 2, amount: 340, effectiveFrom: "2026-07-01" }),
          makeExpenseAmountVersion({ id: 3, amount: 300, effectiveFrom: "2026-08-01" }),
        ],
      });
      render(<ExpensesTable expenses={[expense]} {...baseProps()} />);

      const table = within(screen.getByRole("table"));
      expect(table.getByText("2 cambios de precio")).toBeInTheDocument();
    });
  });

  describe("acciones de la fila", () => {
    it("llama a onEdit con el gasto completo", async () => {
      const user = userEvent.setup();
      const expense = makeExpense();
      const onEdit = jest.fn();
      render(<ExpensesTable expenses={[expense]} {...baseProps()} onEdit={onEdit} />);

      const table = within(screen.getByRole("table"));
      await user.click(table.getByRole("button", { name: "Editar gasto" }));
      expect(onEdit).toHaveBeenCalledWith(expense);
    });

    it("'Cambiar precio' es su propia acción, separada de editar", async () => {
      // En el backend cambiar el monto AGREGA una versión fechada en vez de
      // sobrescribir, así que repreciar no es lo mismo que corregir un typo en el
      // concepto: son dos botones y dos formularios distintos a propósito.
      const user = userEvent.setup();
      const expense = makeExpense();
      const onChangeAmount = jest.fn();
      const onEdit = jest.fn();
      render(
        <ExpensesTable
          expenses={[expense]}
          {...baseProps()}
          onEdit={onEdit}
          onChangeAmount={onChangeAmount}
        />
      );

      const table = within(screen.getByRole("table"));
      await user.click(table.getByRole("button", { name: "Cambiar el precio del gasto" }));
      expect(onChangeAmount).toHaveBeenCalledWith(expense);
      expect(onEdit).not.toHaveBeenCalled();
    });

    it("un gasto activo ofrece 'Dar de baja' y llama a onToggleActive (no un delete)", async () => {
      // Dar de baja = PUT { active: false }: el histórico de los meses en que sí se
      // pagó se conserva. Mismo contrato que "Cancelar" en CouponsTable.
      const user = userEvent.setup();
      const expense = makeExpense({ active: true });
      const onToggleActive = jest.fn();
      const onAskDelete = jest.fn();
      const onConfirmDelete = jest.fn();
      render(
        <ExpensesTable
          expenses={[expense]}
          {...baseProps()}
          onToggleActive={onToggleActive}
          onAskDelete={onAskDelete}
          onConfirmDelete={onConfirmDelete}
        />
      );

      const table = within(screen.getByRole("table"));
      await user.click(table.getByRole("button", { name: "Dar de baja el gasto" }));
      expect(onToggleActive).toHaveBeenCalledWith(expense);
      expect(onAskDelete).not.toHaveBeenCalled();
      expect(onConfirmDelete).not.toHaveBeenCalled();
    });

    it("un gasto dado de baja ofrece 'Reactivar' en su lugar", async () => {
      const user = userEvent.setup();
      const expense = makeExpense({ active: false });
      const onToggleActive = jest.fn();
      render(
        <ExpensesTable expenses={[expense]} {...baseProps()} onToggleActive={onToggleActive} />
      );

      const table = within(screen.getByRole("table"));
      expect(table.queryByRole("button", { name: "Dar de baja el gasto" })).not.toBeInTheDocument();
      await user.click(table.getByRole("button", { name: "Reactivar el gasto" }));
      expect(onToggleActive).toHaveBeenCalledWith(expense);
      // Y el badge de estado lo refleja: inactivo, no "activo con otro botón".
      expect(table.getByText("Inactivo")).toBeInTheDocument();
    });

    it("la tarjeta móvil dispara los mismos handlers que la tabla", async () => {
      const user = userEvent.setup();
      const expense = makeExpense();
      const onToggleActive = jest.fn();
      render(
        <ExpensesTable expenses={[expense]} {...baseProps()} onToggleActive={onToggleActive} />
      );

      const list = within(screen.getByRole("list"));
      await user.click(list.getByRole("button", { name: "Dar de baja el gasto" }));
      expect(onToggleActive).toHaveBeenCalledWith(expense);
    });

    it("busyId deshabilita el toggle del renglón ocupado", () => {
      const expense = makeExpense({ id: 7 });
      render(<ExpensesTable expenses={[expense]} {...baseProps()} busyId={7} />);

      const table = within(screen.getByRole("table"));
      expect(table.getByRole("button", { name: "Dar de baja el gasto" })).toBeDisabled();
    });

    it("busyId de otro renglón no deshabilita este", () => {
      const expense = makeExpense({ id: 7 });
      render(<ExpensesTable expenses={[expense]} {...baseProps()} busyId={99} />);

      const table = within(screen.getByRole("table"));
      expect(table.getByRole("button", { name: "Dar de baja el gasto" })).not.toBeDisabled();
    });
  });

  describe("confirmación de borrado", () => {
    it("el bote de basura solo pide confirmación, no borra", async () => {
      const user = userEvent.setup();
      const expense = makeExpense({ id: 7 });
      const onAskDelete = jest.fn();
      const onConfirmDelete = jest.fn();
      render(
        <ExpensesTable
          expenses={[expense]}
          {...baseProps()}
          onAskDelete={onAskDelete}
          onConfirmDelete={onConfirmDelete}
        />
      );

      const table = within(screen.getByRole("table"));
      await user.click(table.getByRole("button", { name: "Eliminar gasto" }));
      expect(onAskDelete).toHaveBeenCalledWith(7);
      expect(onConfirmDelete).not.toHaveBeenCalled();
    });

    it("con confirmingId activo reemplaza los íconos por Confirmar/Cancelar", () => {
      const expense = makeExpense({ id: 7 });
      render(<ExpensesTable expenses={[expense]} {...baseProps()} confirmingId={7} />);

      const table = within(screen.getByRole("table"));
      expect(table.getByRole("button", { name: "Confirmar" })).toBeInTheDocument();
      expect(table.queryByRole("button", { name: "Eliminar gasto" })).not.toBeInTheDocument();
      expect(table.queryByRole("button", { name: "Editar gasto" })).not.toBeInTheDocument();
    });

    it("el confirmingId de otro renglón no abre la confirmación de este", () => {
      const expense = makeExpense({ id: 7 });
      render(<ExpensesTable expenses={[expense]} {...baseProps()} confirmingId={99} />);

      const table = within(screen.getByRole("table"));
      expect(table.getByRole("button", { name: "Eliminar gasto" })).toBeInTheDocument();
      expect(table.queryByRole("button", { name: "Confirmar" })).not.toBeInTheDocument();
    });

    it("Confirmar llama a onConfirmDelete con el gasto completo", async () => {
      const user = userEvent.setup();
      const expense = makeExpense({ id: 7 });
      const onConfirmDelete = jest.fn();
      render(
        <ExpensesTable
          expenses={[expense]}
          {...baseProps()}
          confirmingId={7}
          onConfirmDelete={onConfirmDelete}
        />
      );

      const table = within(screen.getByRole("table"));
      await user.click(table.getByRole("button", { name: "Confirmar" }));
      expect(onConfirmDelete).toHaveBeenCalledWith(expense);
    });

    it("Cancelar limpia la confirmación con onAskDelete(null)", async () => {
      const user = userEvent.setup();
      const expense = makeExpense({ id: 7 });
      const onAskDelete = jest.fn();
      render(
        <ExpensesTable
          expenses={[expense]}
          {...baseProps()}
          confirmingId={7}
          onAskDelete={onAskDelete}
        />
      );

      const table = within(screen.getByRole("table"));
      await user.click(table.getByRole("button", { name: "Cancelar" }));
      expect(onAskDelete).toHaveBeenCalledWith(null);
    });

    it("busyId deshabilita Confirmar y lo cambia por '…'", () => {
      const expense = makeExpense({ id: 7 });
      render(<ExpensesTable expenses={[expense]} {...baseProps()} confirmingId={7} busyId={7} />);

      const table = within(screen.getByRole("table"));
      expect(table.getByRole("button", { name: "…" })).toBeDisabled();
    });

    it("busyId de otro renglón no deshabilita Confirmar", () => {
      const expense = makeExpense({ id: 7 });
      render(<ExpensesTable expenses={[expense]} {...baseProps()} confirmingId={7} busyId={99} />);

      const table = within(screen.getByRole("table"));
      expect(table.getByRole("button", { name: "Confirmar" })).not.toBeDisabled();
    });
  });
});
