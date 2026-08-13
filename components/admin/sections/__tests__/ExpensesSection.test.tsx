import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import ExpensesSection from "../ExpensesSection";
import { apiError } from "./helpers/apiError";
import { makeExpense, makeExpenseSummary } from "./helpers/factories";
import { renderWithQueryClient } from "./helpers/render";

// `jest.mock("@/...")` no resuelve — ruta relativa a propósito (ver CLAUDE.md).
jest.mock("../../../../lib/api/adminExpenses", () => ({
  ...jest.requireActual("../../../../lib/api/adminExpenses"),
  getAdminExpenses: jest.fn(),
  getExpenseSummary: jest.fn(),
  getExpenseHistory: jest.fn(),
  createExpense: jest.fn(),
  updateExpense: jest.fn(),
  deleteExpense: jest.fn(),
}));

import {
  createExpense,
  deleteExpense,
  getAdminExpenses,
  getExpenseHistory,
  getExpenseSummary,
  updateExpense,
} from "@/lib/api/adminExpenses";

const mockList = getAdminExpenses as jest.MockedFunction<typeof getAdminExpenses>;
const mockSummary = getExpenseSummary as jest.MockedFunction<typeof getExpenseSummary>;
const mockHistory = getExpenseHistory as jest.MockedFunction<typeof getExpenseHistory>;
const mockCreate = createExpense as jest.MockedFunction<typeof createExpense>;
const mockUpdate = updateExpense as jest.MockedFunction<typeof updateExpense>;
const mockDelete = deleteExpense as jest.MockedFunction<typeof deleteExpense>;

// La gemela de `CouponsSection`, con dos diferencias que son justamente lo que
// hay que probar aquí:
//
//  1. **Un gasto sí mueve el dashboard.** El KPI `GASTOS` y la `GANANCIA
//     OPERATIVA` salen del mismo servicio que alimenta esta pantalla, así que
//     toda escritura invalida `dashboardKeys` además de la suya. Sin eso, la
//     pestaña Datos seguiría mostrando el número viejo — la incoherencia que la
//     Fase 20 vino a cerrar.
//  2. **Editar y repreciar son dos formularios distintos, y excluyentes.**
//     Editar corrige los datos del gasto; cambiar el precio agrega una VERSIÓN
//     fechada del monto. Si el formulario de edición pudiera mandar `amount`,
//     corregir una falta de ortografía en el concepto repreciaría el historial.

beforeEach(() => {
  mockList.mockReset();
  mockSummary.mockReset();
  mockHistory.mockReset();
  mockCreate.mockReset();
  mockUpdate.mockReset();
  mockDelete.mockReset();
  mockList.mockResolvedValue([makeExpense()]);
  mockSummary.mockResolvedValue(makeExpenseSummary());
  mockHistory.mockResolvedValue([]);
  mockCreate.mockResolvedValue(makeExpense({ concept: "Dominio" }));
  mockUpdate.mockResolvedValue(makeExpense());
  mockDelete.mockResolvedValue({ ok: true, deactivated: false });
});

/** Un `<input type="date">` no se puede teclear como texto plano. */
function setDate(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

/** Fila de escritorio del gasto (jsdom pinta tabla y cards a la vez). */
function expenseRow(concept: string) {
  return within(
    within(screen.getByRole("table")).getByText(concept).closest("tr") as HTMLElement,
  );
}

describe("ExpensesSection", () => {
  it("muestra el estado de carga de la lista", () => {
    mockList.mockReturnValue(new Promise(() => {}));
    renderWithQueryClient(<ExpensesSection />);
    expect(screen.getByText("Cargando…")).toBeInTheDocument();
  });

  it("avisa si la lista no se pudo cargar", async () => {
    mockList.mockRejectedValue(new Error("red caída"));
    renderWithQueryClient(<ExpensesSection />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos cargar los gastos.",
    );
  });

  it("sin gastos invita a dar de alta el primero", async () => {
    mockList.mockResolvedValue([]);
    renderWithQueryClient(<ExpensesSection />);

    expect(await screen.findByText("Todavía no hay gastos")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("la pestaña Historial monta su propia consulta, distinta de la lista", async () => {
    const { user } = renderWithQueryClient(<ExpensesSection />);
    await screen.findByRole("table");

    expect(mockHistory).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Historial" }));

    await waitFor(() => expect(mockHistory).toHaveBeenCalled());
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  // ── Alta y edición ──

  it("el alta manda el gasto completo y avisa con el concepto", async () => {
    const { user } = renderWithQueryClient(<ExpensesSection />);
    await screen.findByRole("table");

    await user.click(screen.getByRole("button", { name: "Nuevo gasto" }));
    await user.type(screen.getByLabelText("Concepto"), "Dominio");
    setDate("Primer cargo", "2026-08-01");
    await user.type(screen.getByLabelText("Monto"), "250");
    await user.click(screen.getByRole("button", { name: /Crear gasto/i }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ concept: "Dominio", amount: 250 });
    expect(await screen.findByRole("status")).toHaveTextContent(
      'Gasto "Dominio" dado de alta.',
    );
  });

  // La invariante que separa los dos formularios: editar NUNCA reprecia.
  it("la edición no manda ni el monto ni su fecha de vigencia", async () => {
    mockUpdate.mockResolvedValue(makeExpense({ concept: "Render — Web Service" }));
    const { user } = renderWithQueryClient(<ExpensesSection />);
    await screen.findByRole("table");

    await user.click(expenseRow("Render — Web Service").getByRole("button", { name: "Editar gasto" }));
    // El formulario de edición ni siquiera ofrece el campo de monto.
    expect(screen.queryByLabelText("Monto")).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText("Proveedor"));
    await user.type(screen.getByLabelText("Proveedor"), "Railway");
    await user.click(screen.getByRole("button", { name: /Guardar cambios/i }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    const payload = mockUpdate.mock.calls[0][1];
    expect(payload).not.toHaveProperty("amount");
    expect(payload).not.toHaveProperty("amountEffectiveFrom");
    expect(payload).toMatchObject({ vendor: "Railway" });
  });

  it("«Cambiar precio» abre su propio formulario y manda una versión fechada", async () => {
    mockUpdate.mockResolvedValue(makeExpense({ currentAmount: 350 }));
    const { user } = renderWithQueryClient(<ExpensesSection />);
    await screen.findByRole("table");

    await user.click(
      expenseRow("Render — Web Service").getByRole("button", {
        name: "Cambiar el precio del gasto",
      }),
    );

    await user.clear(screen.getByLabelText("Monto nuevo"));
    await user.type(screen.getByLabelText("Monto nuevo"), "350");
    await user.click(screen.getByRole("button", { name: /Guardar precio nuevo/i }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    const payload = mockUpdate.mock.calls[0][1];
    expect(payload).toMatchObject({ amount: 350 });
    expect(payload).toHaveProperty("amountEffectiveFrom");
  });

  // El backend no escribe nada si el monto vigente en esa fecha ya era el mismo,
  // así que el aviso se redacta sobre lo que QUEDÓ, no sobre lo que se intentó.
  it("el aviso de repricing reporta el monto vigente que devolvió el backend", async () => {
    mockUpdate.mockResolvedValue(makeExpense({ concept: "Render", currentAmount: 290 }));
    const { user } = renderWithQueryClient(<ExpensesSection />);
    await screen.findByRole("table");

    await user.click(
      expenseRow("Render — Web Service").getByRole("button", {
        name: "Cambiar el precio del gasto",
      }),
    );
    await user.clear(screen.getByLabelText("Monto nuevo"));
    await user.type(screen.getByLabelText("Monto nuevo"), "350");
    await user.click(screen.getByRole("button", { name: /Guardar precio nuevo/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      '"Render" quedó en $290.00 vigente hoy. Los meses anteriores conservan lo que costaba entonces.',
    );
  });

  it("abrir «Cambiar precio» cierra el formulario de edición y viceversa", async () => {
    const { user } = renderWithQueryClient(<ExpensesSection />);
    await screen.findByRole("table");

    await user.click(expenseRow("Render — Web Service").getByRole("button", { name: "Editar gasto" }));
    expect(screen.getByLabelText("Concepto")).toBeInTheDocument();

    await user.click(
      expenseRow("Render — Web Service").getByRole("button", {
        name: "Cambiar el precio del gasto",
      }),
    );
    expect(screen.queryByLabelText("Concepto")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Monto nuevo")).toBeInTheDocument();

    await user.click(expenseRow("Render — Web Service").getByRole("button", { name: "Editar gasto" }));
    expect(screen.queryByLabelText("Monto nuevo")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Concepto")).toBeInTheDocument();
  });

  // ── Baja / reactivación ──

  it("«Dar de baja» es un PUT { active: false }, nunca un delete", async () => {
    mockUpdate.mockResolvedValue(makeExpense({ active: false }));
    const { user } = renderWithQueryClient(<ExpensesSection />);
    await screen.findByRole("table");

    await user.click(
      expenseRow("Render — Web Service").getByRole("button", {
        name: "Dar de baja el gasto",
      }),
    );

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][1]).toEqual({ active: false });
    expect(mockDelete).not.toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent(
      'Gasto "Render — Web Service" dado de baja: deja de generar cargos desde hoy.',
    );
  });

  it("«Reactivar» es el mismo PUT con active: true", async () => {
    mockList.mockResolvedValue([makeExpense({ active: false })]);
    mockUpdate.mockResolvedValue(makeExpense({ active: true }));
    const { user } = renderWithQueryClient(<ExpensesSection />);
    await screen.findByRole("table");

    await user.click(
      expenseRow("Render — Web Service").getByRole("button", {
        name: "Reactivar el gasto",
      }),
    );

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][1]).toEqual({ active: true });
    expect(await screen.findByRole("status")).toHaveTextContent(
      'Gasto "Render — Web Service" reactivado.',
    );
  });

  // ── Borrado y su soft-deactivate ──

  it("un borrado real se reporta como eliminado", async () => {
    const { user } = renderWithQueryClient(<ExpensesSection />);
    await screen.findByRole("table");

    await user.click(
      expenseRow("Render — Web Service").getByRole("button", { name: "Eliminar gasto" }),
    );
    await user.click(screen.getAllByRole("button", { name: "Confirmar" })[0]);

    expect(await screen.findByRole("status")).toHaveTextContent(
      'Gasto "Render — Web Service" eliminado.',
    );
  });

  it("un gasto que ya generó cargos se da de baja, y el aviso lo explica", async () => {
    mockDelete.mockResolvedValue({ ok: true, deactivated: true });
    const { user } = renderWithQueryClient(<ExpensesSection />);
    await screen.findByRole("table");

    await user.click(
      expenseRow("Render — Web Service").getByRole("button", { name: "Eliminar gasto" }),
    );
    await user.click(screen.getAllByRole("button", { name: "Confirmar" })[0]);

    const notice = await screen.findByRole("status");
    expect(notice).toHaveTextContent(
      '"Render — Web Service" no se pudo borrar porque ya generó cargos: se dio de baja para no romper el historial de los meses cerrados.',
    );
    expect(notice).not.toHaveTextContent("eliminado");
  });

  it("borrar el gasto abierto en edición lo cierra", async () => {
    const { user } = renderWithQueryClient(<ExpensesSection />);
    await screen.findByRole("table");

    await user.click(
      expenseRow("Render — Web Service").getByRole("button", { name: "Editar gasto" }),
    );
    expect(screen.getByLabelText("Concepto")).toBeInTheDocument();

    await user.click(
      expenseRow("Render — Web Service").getByRole("button", { name: "Eliminar gasto" }),
    );
    await user.click(screen.getAllByRole("button", { name: "Confirmar" })[0]);

    await waitFor(() =>
      expect(screen.queryByLabelText("Concepto")).not.toBeInTheDocument(),
    );
  });

  it("borrar el gasto abierto en el formulario de precio lo cierra", async () => {
    const { user } = renderWithQueryClient(<ExpensesSection />);
    await screen.findByRole("table");

    await user.click(
      expenseRow("Render — Web Service").getByRole("button", {
        name: "Cambiar el precio del gasto",
      }),
    );
    expect(screen.getByLabelText("Monto nuevo")).toBeInTheDocument();

    await user.click(
      expenseRow("Render — Web Service").getByRole("button", { name: "Eliminar gasto" }),
    );
    await user.click(screen.getAllByRole("button", { name: "Confirmar" })[0]);

    await waitFor(() =>
      expect(screen.queryByLabelText("Monto nuevo")).not.toBeInTheDocument(),
    );
  });

  it("mientras borra, la fila queda marcada como ocupada", async () => {
    let resolve: (value: { ok: boolean; deactivated: boolean }) => void = () => {};
    mockDelete.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { user } = renderWithQueryClient(<ExpensesSection />);
    await screen.findByRole("table");

    await user.click(
      expenseRow("Render — Web Service").getByRole("button", { name: "Eliminar gasto" }),
    );
    await user.click(screen.getAllByRole("button", { name: "Confirmar" })[0]);

    expect(await screen.findAllByRole("button", { name: "…" })).not.toHaveLength(0);

    resolve({ ok: true, deactivated: false });
    expect(await screen.findByRole("status")).toBeInTheDocument();
  });

  // ── Errores ──

  it("un error de baja se muestra bajo la tabla con el mensaje del backend", async () => {
    mockUpdate.mockRejectedValue(apiError(404, "Ese gasto ya no existe"));
    const { user } = renderWithQueryClient(<ExpensesSection />);
    await screen.findByRole("table");

    await user.click(
      expenseRow("Render — Web Service").getByRole("button", {
        name: "Dar de baja el gasto",
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Ese gasto ya no existe");
  });

  it("un error de borrado usa el mismo lugar y el mismo mapeo", async () => {
    mockDelete.mockRejectedValue(apiError(500));
    const { user } = renderWithQueryClient(<ExpensesSection />);
    await screen.findByRole("table");

    await user.click(
      expenseRow("Render — Web Service").getByRole("button", { name: "Eliminar gasto" }),
    );
    await user.click(screen.getAllByRole("button", { name: "Confirmar" })[0]);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos guardar el gasto. Inténtalo de nuevo.",
    );
  });

  it("un error al guardar se muestra dentro del formulario, que no se cierra", async () => {
    mockCreate.mockRejectedValue(apiError(400, "La categoría no existe"));
    const { user } = renderWithQueryClient(<ExpensesSection />);
    await screen.findByRole("table");

    await user.click(screen.getByRole("button", { name: "Nuevo gasto" }));
    await user.type(screen.getByLabelText("Concepto"), "Dominio");
    setDate("Primer cargo", "2026-08-01");
    await user.type(screen.getByLabelText("Monto"), "250");
    await user.click(screen.getByRole("button", { name: /Crear gasto/i }));

    expect(await screen.findByText("La categoría no existe")).toBeInTheDocument();
    expect(screen.getByLabelText("Concepto")).toBeInTheDocument();
  });

  it("un error al repreciar se muestra dentro del formulario de precio", async () => {
    mockUpdate.mockRejectedValue(apiError(400, "El monto debe ser mayor a 0"));
    const { user } = renderWithQueryClient(<ExpensesSection />);
    await screen.findByRole("table");

    await user.click(
      expenseRow("Render — Web Service").getByRole("button", {
        name: "Cambiar el precio del gasto",
      }),
    );
    await user.clear(screen.getByLabelText("Monto nuevo"));
    await user.type(screen.getByLabelText("Monto nuevo"), "350");
    await user.click(screen.getByRole("button", { name: /Guardar precio nuevo/i }));

    expect(await screen.findByText("El monto debe ser mayor a 0")).toBeInTheDocument();
    // El formulario sigue abierto: el monto tecleado no se pierde.
    expect(screen.getByLabelText("Monto nuevo")).toBeInTheDocument();
  });

  // ── Invalidación (la diferencia real contra CouponsSection) ──

  it("cada escritura invalida los gastos Y el dashboard", async () => {
    const { user, queryClient } = renderWithQueryClient(<ExpensesSection />);
    await screen.findByRole("table");
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");

    await user.click(
      expenseRow("Render — Web Service").getByRole("button", {
        name: "Dar de baja el gasto",
      }),
    );

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["adminExpenses"] }),
    );
    // Sin esto, el KPI GASTOS de la pestaña Datos seguiría mostrando el viejo.
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["adminDashboard"] });
  });

  it("el alta también refresca el dashboard", async () => {
    const { user, queryClient } = renderWithQueryClient(<ExpensesSection />);
    await screen.findByRole("table");
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");

    await user.click(screen.getByRole("button", { name: "Nuevo gasto" }));
    await user.type(screen.getByLabelText("Concepto"), "Dominio");
    setDate("Primer cargo", "2026-08-01");
    await user.type(screen.getByLabelText("Monto"), "250");
    await user.click(screen.getByRole("button", { name: /Crear gasto/i }));

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["adminDashboard"] }),
    );
  });
});
