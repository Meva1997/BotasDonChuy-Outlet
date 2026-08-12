import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExpenseAmountForm from "../ExpenseAmountForm";
import { makeExpense, makeExpenseAmountVersion } from "./helpers/factories";
import { todayISO } from "../expenseStatus";

// Historial: v1 (más viejo) → v2 (sube) → v3 (baja), para ejercitar las dos
// direcciones del delta y el caso sin "anterior" (el más viejo del historial).
function expenseWithHistory() {
  return makeExpense({
    concept: "Render — Web Service",
    currentAmount: 300,
    amounts: [
      makeExpenseAmountVersion({ id: 1, amount: 290, effectiveFrom: "2026-03-01", note: null }),
      makeExpenseAmountVersion({
        id: 2,
        amount: 340,
        effectiveFrom: "2026-07-01",
        note: "Subió el dólar",
      }),
      makeExpenseAmountVersion({ id: 3, amount: 300, effectiveFrom: "2026-08-01", note: null }),
    ],
  });
}

describe("ExpenseAmountForm", () => {
  it("muestra el concepto y el monto vigente en el encabezado", () => {
    render(
      <ExpenseAmountForm
        expense={expenseWithHistory()}
        isSaving={false}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(screen.getByText("Cambiar precio · Render — Web Service")).toBeInTheDocument();
    expect(screen.getByText("Hoy cuesta $300.00")).toBeInTheDocument();
  });

  it("siembra 'Aplica desde' con la fecha de hoy", () => {
    render(
      <ExpenseAmountForm
        expense={expenseWithHistory()}
        isSaving={false}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(screen.getByLabelText("Aplica desde")).toHaveValue(todayISO());
  });

  it("lista el historial del más nuevo al más viejo", () => {
    render(
      <ExpenseAmountForm
        expense={expenseWithHistory()}
        isSaving={false}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    const items = screen.getAllByText(/^Desde /);
    expect(items[0]).toHaveTextContent("Desde 1 de agosto de 2026");
    expect(items[1]).toHaveTextContent("Desde 1 de julio de 2026 · Subió el dólar");
    expect(items[2]).toHaveTextContent("Desde 1 de marzo de 2026");
  });

  it("pinta en rojo un aumento de precio contra la versión anterior", () => {
    render(
      <ExpenseAmountForm
        expense={expenseWithHistory()}
        isSaving={false}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    const increase = screen.getByText("+$50.00 (+17.2%)");
    expect(increase).toHaveClass("text-red-400/70");
  });

  it("pinta en verde una baja de precio contra la versión anterior", () => {
    render(
      <ExpenseAmountForm
        expense={expenseWithHistory()}
        isSaving={false}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    const decrease = screen.getByText("−$40.00 (−11.8%)");
    expect(decrease).toHaveClass("text-emerald-400/70");
  });

  it("la versión más vieja del historial no muestra delta (no hay anterior)", () => {
    render(
      <ExpenseAmountForm
        expense={expenseWithHistory()}
        isSaving={false}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    const oldestRow = screen.getByText(/^Desde 1 de marzo de 2026/).closest("li")!;
    expect(within(oldestRow).queryByText(/\$/, { selector: "span span" })).not.toBeInTheDocument();
  });

  it("envía el payload validado", async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    render(
      <ExpenseAmountForm
        expense={expenseWithHistory()}
        isSaving={false}
        onSubmit={onSubmit}
        onCancel={jest.fn()}
      />
    );
    await user.type(screen.getByLabelText("Monto nuevo"), "350");
    await user.clear(screen.getByLabelText("Aplica desde"));
    await user.type(screen.getByLabelText("Aplica desde"), "2026-09-01");
    await user.type(screen.getByLabelText("Motivo"), "Subió otra vez");
    await user.click(screen.getByRole("button", { name: "Guardar precio nuevo" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        amount: "350",
        effectiveFrom: "2026-09-01",
        note: "Subió otra vez",
      })
    );
  });

  describe("validación", () => {
    it("exige el monto nuevo", async () => {
      const onSubmit = jest.fn();
      const user = userEvent.setup();
      render(
        <ExpenseAmountForm
          expense={expenseWithHistory()}
          isSaving={false}
          onSubmit={onSubmit}
          onCancel={jest.fn()}
        />
      );
      await user.click(screen.getByRole("button", { name: "Guardar precio nuevo" }));

      expect(await screen.findByText("Escribe el monto nuevo")).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("rechaza un monto <= 0", async () => {
      const onSubmit = jest.fn();
      const user = userEvent.setup();
      render(
        <ExpenseAmountForm
          expense={expenseWithHistory()}
          isSaving={false}
          onSubmit={onSubmit}
          onCancel={jest.fn()}
        />
      );
      await user.type(screen.getByLabelText("Monto nuevo"), "0");
      await user.click(screen.getByRole("button", { name: "Guardar precio nuevo" }));

      expect(await screen.findByText("El monto debe ser mayor a 0")).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("exige la fecha de vigencia", async () => {
      const onSubmit = jest.fn();
      const user = userEvent.setup();
      render(
        <ExpenseAmountForm
          expense={expenseWithHistory()}
          isSaving={false}
          onSubmit={onSubmit}
          onCancel={jest.fn()}
        />
      );
      await user.type(screen.getByLabelText("Monto nuevo"), "350");
      await user.clear(screen.getByLabelText("Aplica desde"));
      await user.click(screen.getByRole("button", { name: "Guardar precio nuevo" }));

      expect(await screen.findByText("Elige una fecha")).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("rechaza un motivo de más de 200 caracteres", async () => {
      const onSubmit = jest.fn();
      const user = userEvent.setup();
      render(
        <ExpenseAmountForm
          expense={expenseWithHistory()}
          isSaving={false}
          onSubmit={onSubmit}
          onCancel={jest.fn()}
        />
      );
      await user.type(screen.getByLabelText("Monto nuevo"), "350");
      await user.type(screen.getByLabelText("Motivo"), "x".repeat(201));
      await user.click(screen.getByRole("button", { name: "Guardar precio nuevo" }));

      expect(await screen.findByText("Máximo 200 caracteres")).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it("deshabilita el botón y cambia su texto mientras guarda", () => {
    render(
      <ExpenseAmountForm expense={expenseWithHistory()} isSaving onSubmit={jest.fn()} onCancel={jest.fn()} />
    );
    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
  });

  it("muestra el mensaje de error del backend", () => {
    render(
      <ExpenseAmountForm
        expense={expenseWithHistory()}
        isSaving={false}
        errorMessage="Para fechar una vigencia hay que mandar también el monto nuevo."
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Para fechar una vigencia hay que mandar también el monto nuevo."
    );
  });

  it("llama a onCancel al hacer clic en Cancelar", async () => {
    const onCancel = jest.fn();
    const user = userEvent.setup();
    render(
      <ExpenseAmountForm
        expense={expenseWithHistory()}
        isSaving={false}
        onSubmit={jest.fn()}
        onCancel={onCancel}
      />
    );
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
