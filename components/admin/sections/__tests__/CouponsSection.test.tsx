import { screen, waitFor, within } from "@testing-library/react";
import CouponsSection from "../CouponsSection";
import { apiError } from "./helpers/apiError";
import { makeAdminCoupon } from "./helpers/factories";
import { renderWithQueryClient } from "./helpers/render";

// `jest.mock("@/...")` no resuelve — ruta relativa a propósito (ver CLAUDE.md).
jest.mock("../../../../lib/api/adminCoupons", () => ({
  ...jest.requireActual("../../../../lib/api/adminCoupons"),
  getAdminCoupons: jest.fn(),
  createCoupon: jest.fn(),
  updateCoupon: jest.fn(),
  deleteCoupon: jest.fn(),
}));

// `CouponForm` monta su propia query del catálogo para pintar el rango de
// precios comprables. Devuelve un array plano (no una página): con la forma
// equivocada revienta en `.filter`.
jest.mock("../../../../lib/api/adminProducts", () => ({
  ...jest.requireActual("../../../../lib/api/adminProducts"),
  getAdminProducts: jest.fn().mockResolvedValue([]),
}));

import {
  createCoupon,
  deleteCoupon,
  getAdminCoupons,
  updateCoupon,
} from "@/lib/api/adminCoupons";

const mockGet = getAdminCoupons as jest.MockedFunction<typeof getAdminCoupons>;
const mockCreate = createCoupon as jest.MockedFunction<typeof createCoupon>;
const mockUpdate = updateCoupon as jest.MockedFunction<typeof updateCoupon>;
const mockDelete = deleteCoupon as jest.MockedFunction<typeof deleteCoupon>;

// `CouponForm` y `CouponsTable` ya tienen sus propias suites (Fase 8): reciben
// `onSubmit`/`onToggleActive`/`onConfirmDelete` como props y no llaman a nada.
// Esta sección es la que DECIDE qué se manda al backend, y tiene tres reglas que
// nadie más puede verificar:
//
//  1. El `code` viaja SOLO en el alta. El PUT lo ignora, y mandarlo sugeriría
//     que un cupón ya impreso en un flyer se puede renombrar.
//  2. "Cancelar" es un `PUT { active: false }`, nunca un DELETE — el histórico de
//     lo que ya se vendió con ese cupón se conserva, y se puede reactivar.
//  3. El DELETE lo decide el BACKEND: si el cupón ya tiene canjes hace un
//     soft-deactivate y responde `deactivated: true`. El aviso tiene que contar
//     lo que de verdad pasó; decir "eliminado" sobre un cupón que sigue en la
//     lista parecería un error de la app.

beforeEach(() => {
  mockGet.mockReset();
  mockCreate.mockReset();
  mockUpdate.mockReset();
  mockDelete.mockReset();
  mockGet.mockResolvedValue([makeAdminCoupon()]);
  mockCreate.mockResolvedValue(makeAdminCoupon({ code: "NUEVO10" }));
  mockUpdate.mockResolvedValue(makeAdminCoupon());
  mockDelete.mockResolvedValue({ ok: true, deactivated: false });
});

/** Fila de escritorio del cupón (jsdom pinta tabla y cards a la vez). */
function couponRow(code: string) {
  return within(
    within(screen.getByRole("table")).getByText(code).closest("tr") as HTMLElement,
  );
}

describe("CouponsSection", () => {
  it("muestra el estado de carga y luego la tabla", async () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    const { rerender } = renderWithQueryClient(<CouponsSection />);
    expect(screen.getByText("Cargando…")).toBeInTheDocument();
    expect(rerender).toBeDefined();
  });

  it("avisa si la lista no se pudo cargar", async () => {
    mockGet.mockRejectedValue(new Error("red caída"));
    renderWithQueryClient(<CouponsSection />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos cargar los cupones.",
    );
  });

  it("sin cupones invita a crear el primero en vez de pintar una tabla vacía", async () => {
    mockGet.mockResolvedValue([]);
    renderWithQueryClient(<CouponsSection />);

    expect(await screen.findByText("Todavía no hay cupones")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  // ── Alta y edición ──

  it("el alta manda el código junto con el resto del cupón", async () => {
    const { user } = renderWithQueryClient(<CouponsSection />);
    await screen.findByRole("table");

    await user.click(screen.getByRole("button", { name: "Nuevo cupón" }));
    await user.type(screen.getByLabelText(/Código/), "NUEVO10");
    await user.clear(screen.getByLabelText(/Porcentaje/));
    await user.type(screen.getByLabelText(/Porcentaje/), "10");
    await user.click(screen.getByRole("button", { name: /Crear cupón/i }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ code: "NUEVO10", value: 10 });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("tras crear, avisa con el código y cierra el formulario", async () => {
    const { user } = renderWithQueryClient(<CouponsSection />);
    await screen.findByRole("table");

    await user.click(screen.getByRole("button", { name: "Nuevo cupón" }));
    await user.type(screen.getByLabelText(/Código/), "NUEVO10");
    await user.clear(screen.getByLabelText(/Porcentaje/));
    await user.type(screen.getByLabelText(/Porcentaje/), "10");
    await user.click(screen.getByRole("button", { name: /Crear cupón/i }));

    expect(await screen.findByRole("status")).toHaveTextContent("Cupón NUEVO10 creado.");
    expect(screen.getByRole("button", { name: "Nuevo cupón" })).toBeInTheDocument();
  });

  // La regla del `code`: en edición no se manda, porque el backend lo ignora y
  // ofrecerlo sugeriría que un cupón ya repartido se puede renombrar.
  it("la edición NO manda el código, solo el resto", async () => {
    mockUpdate.mockResolvedValue(makeAdminCoupon({ code: "VERANO20" }));
    const { user } = renderWithQueryClient(<CouponsSection />);
    await screen.findByRole("table");

    await user.click(couponRow("VERANO20").getByRole("button", { name: "Editar cupón" }));
    await user.clear(screen.getByLabelText(/Porcentaje/));
    await user.type(screen.getByLabelText(/Porcentaje/), "25");
    await user.click(screen.getByRole("button", { name: /Guardar cambios/i }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0]).toBe(1);
    expect(mockUpdate.mock.calls[0][1]).not.toHaveProperty("code");
    expect(mockCreate).not.toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Cupón VERANO20 actualizado.",
    );
  });

  it("un error al guardar se muestra dentro del formulario, que no se cierra", async () => {
    mockCreate.mockRejectedValue(apiError(409, "Ya existe un cupón con ese código"));
    const { user } = renderWithQueryClient(<CouponsSection />);
    await screen.findByRole("table");

    await user.click(screen.getByRole("button", { name: "Nuevo cupón" }));
    await user.type(screen.getByLabelText(/Código/), "VERANO20");
    await user.clear(screen.getByLabelText(/Porcentaje/));
    await user.type(screen.getByLabelText(/Porcentaje/), "10");
    await user.click(screen.getByRole("button", { name: /Crear cupón/i }));

    expect(
      await screen.findByText("Ya existe un cupón con ese código"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Código/)).toBeInTheDocument();
  });

  // ── Cancelar / reactivar ──

  it("«Cancelar» es un PUT { active: false }, nunca un delete", async () => {
    mockUpdate.mockResolvedValue(makeAdminCoupon({ active: false }));
    const { user } = renderWithQueryClient(<CouponsSection />);
    await screen.findByRole("table");

    await user.click(couponRow("VERANO20").getByRole("button", { name: "Cancelar cupón" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][1]).toEqual({ active: false });
    expect(mockDelete).not.toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Cupón VERANO20 cancelado: deja de canjearse, y lo que ya se vendió con él se conserva.",
    );
  });

  it("«Reactivar» es el mismo PUT con active: true", async () => {
    mockGet.mockResolvedValue([makeAdminCoupon({ active: false })]);
    mockUpdate.mockResolvedValue(makeAdminCoupon({ active: true }));
    const { user } = renderWithQueryClient(<CouponsSection />);
    await screen.findByRole("table");

    await user.click(couponRow("VERANO20").getByRole("button", { name: "Reactivar cupón" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][1]).toEqual({ active: true });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Cupón VERANO20 reactivado.",
    );
  });

  // ── Borrado (y su soft-deactivate) ──

  it("un borrado real se reporta como eliminado", async () => {
    mockDelete.mockResolvedValue({ ok: true, deactivated: false });
    const { user } = renderWithQueryClient(<CouponsSection />);
    await screen.findByRole("table");

    await user.click(couponRow("VERANO20").getByRole("button", { name: "Eliminar cupón" }));
    await user.click(screen.getAllByRole("button", { name: "Confirmar" })[0]);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Cupón VERANO20 eliminado.",
    );
  });

  // La invariante que da sentido a esta sección: la UI reporta lo que el backend
  // HIZO, no lo que la UI pidió.
  it("un cupón con canjes se desactiva en vez de borrarse, y el aviso lo explica", async () => {
    mockDelete.mockResolvedValue({ ok: true, deactivated: true });
    const { user } = renderWithQueryClient(<CouponsSection />);
    await screen.findByRole("table");

    await user.click(couponRow("VERANO20").getByRole("button", { name: "Eliminar cupón" }));
    await user.click(screen.getAllByRole("button", { name: "Confirmar" })[0]);

    const notice = await screen.findByRole("status");
    expect(notice).toHaveTextContent(
      "El cupón VERANO20 no se pudo borrar porque ya hay pedidos que lo usaron: se desactivó para no romper ese histórico.",
    );
    expect(notice).not.toHaveTextContent("eliminado");
  });

  it("borrar el cupón que estaba abierto en el formulario lo cierra", async () => {
    const { user } = renderWithQueryClient(<CouponsSection />);
    await screen.findByRole("table");

    await user.click(couponRow("VERANO20").getByRole("button", { name: "Editar cupón" }));
    expect(screen.getByLabelText(/Código/)).toBeInTheDocument();

    await user.click(couponRow("VERANO20").getByRole("button", { name: "Eliminar cupón" }));
    await user.click(screen.getAllByRole("button", { name: "Confirmar" })[0]);

    await waitFor(() => expect(screen.queryByLabelText(/Código/)).not.toBeInTheDocument());
  });

  it("mientras borra, la fila queda marcada como ocupada", async () => {
    let resolve: (value: { ok: boolean; deactivated: boolean }) => void = () => {};
    mockDelete.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { user } = renderWithQueryClient(<CouponsSection />);
    await screen.findByRole("table");

    await user.click(couponRow("VERANO20").getByRole("button", { name: "Eliminar cupón" }));
    await user.click(screen.getAllByRole("button", { name: "Confirmar" })[0]);

    expect(await screen.findAllByRole("button", { name: "…" })).not.toHaveLength(0);

    resolve({ ok: true, deactivated: false });
    expect(await screen.findByRole("status")).toBeInTheDocument();
  });

  // ── Errores de fila ──

  it("un error de cancelación se muestra bajo la tabla con el mensaje del backend", async () => {
    mockUpdate.mockRejectedValue(apiError(404, "Ese cupón ya no existe"));
    const { user } = renderWithQueryClient(<CouponsSection />);
    await screen.findByRole("table");

    await user.click(couponRow("VERANO20").getByRole("button", { name: "Cancelar cupón" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Ese cupón ya no existe");
  });

  it("un error de borrado usa el mismo lugar y el mismo mapeo", async () => {
    mockDelete.mockRejectedValue(apiError(500));
    const { user } = renderWithQueryClient(<CouponsSection />);
    await screen.findByRole("table");

    await user.click(couponRow("VERANO20").getByRole("button", { name: "Eliminar cupón" }));
    await user.click(screen.getAllByRole("button", { name: "Confirmar" })[0]);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos guardar el cupón. Inténtalo de nuevo.",
    );
  });

  it("un error de red se distingue de un rechazo del backend", async () => {
    const { AxiosError } = jest.requireActual("axios");
    mockUpdate.mockRejectedValue(new AxiosError("Network Error"));
    const { user } = renderWithQueryClient(<CouponsSection />);
    await screen.findByRole("table");

    await user.click(couponRow("VERANO20").getByRole("button", { name: "Cancelar cupón" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos conectar con el servidor. Inténtalo de nuevo en unos minutos.",
    );
  });

  // ── Invalidación ──

  // Un cupón no toca stock ni pedidos: la única caché que se invalida es la suya.
  // (Contrasta con `ExpensesSection`, que sí mueve el dashboard.)
  it("cada escritura invalida solo la lista de cupones", async () => {
    const { user, queryClient } = renderWithQueryClient(<CouponsSection />);
    await screen.findByRole("table");
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");

    await user.click(couponRow("VERANO20").getByRole("button", { name: "Cancelar cupón" }));

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["adminCoupons"] }),
    );
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});
