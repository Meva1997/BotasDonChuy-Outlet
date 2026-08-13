import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CouponsTable from "../CouponsTable";
import { makeAdminCoupon } from "./helpers/factories";

// CouponsTable pinta DOS estructuras a la vez (tabla `hidden lg:block` + lista
// `lg:hidden`, mismo patrón que OrdersTable) — jsdom no aplica media queries, así
// que ambas coexisten en el DOM y el mismo texto aparece dos veces. Las
// aserciones que necesitan unicidad se acotan con `within`.
function baseProps() {
  return {
    confirmingId: null,
    busyId: null,
    onEdit: jest.fn(),
    onToggleActive: jest.fn(),
    onAskDelete: jest.fn(),
    onConfirmDelete: jest.fn(),
  };
}

describe("CouponsTable", () => {
  it("pinta código, descuento, vigencia, usos y estado en la fila de escritorio", () => {
    const coupon = makeAdminCoupon({
      code: "VERANO20",
      value: 20,
      type: "percent",
      minSubtotal: 500,
      description: "Promo de agosto",
      startsAt: "2026-08-01T06:00:00.000Z",
      expiresAt: "2026-08-31T05:59:59.999Z",
      redeemedCount: 4,
      maxRedemptions: 10,
      activeRedemptions: 4,
    });
    render(<CouponsTable coupons={[coupon]} {...baseProps()} />);

    const table = within(screen.getByRole("table"));
    expect(table.getByText("VERANO20")).toBeInTheDocument();
    expect(table.getByText("Promo de agosto")).toBeInTheDocument();
    expect(table.getByText("20%")).toBeInTheDocument();
    expect(table.getByText("Desde $500 de compra")).toBeInTheDocument();
    expect(table.getByText("4 / 10")).toBeInTheDocument();
    expect(table.getByText("Activo")).toBeInTheDocument();
  });

  it("también pinta la tarjeta móvil de cada cupón", () => {
    const coupon = makeAdminCoupon({ code: "MOVIL10" });
    render(<CouponsTable coupons={[coupon]} {...baseProps()} />);

    const list = within(screen.getByRole("list"));
    expect(list.getByText("MOVIL10")).toBeInTheDocument();
  });

  it("no muestra la nota de un solo uso cuando oncePerCustomer es false", () => {
    const coupon = makeAdminCoupon({ oncePerCustomer: false });
    render(<CouponsTable coupons={[coupon]} {...baseProps()} />);
    expect(screen.queryByText("Un uso por cliente")).not.toBeInTheDocument();
  });

  it("muestra la nota de un solo uso cuando oncePerCustomer es true", () => {
    const coupon = makeAdminCoupon({ oncePerCustomer: true });
    render(<CouponsTable coupons={[coupon]} {...baseProps()} />);
    expect(screen.getAllByText("Un uso por cliente").length).toBeGreaterThan(0);
  });

  it("no muestra la nota de divergencia cuando el contador coincide con los canjes vigentes", () => {
    const coupon = makeAdminCoupon({ redeemedCount: 3, activeRedemptions: 3 });
    render(<CouponsTable coupons={[coupon]} {...baseProps()} />);
    expect(screen.queryByText(/revisa la base de datos/)).not.toBeInTheDocument();
  });

  it("avisa cuando el contador guardado diverge de los canjes vigentes (plural)", () => {
    const coupon = makeAdminCoupon({ redeemedCount: 5, activeRedemptions: 3 });
    render(<CouponsTable coupons={[coupon]} {...baseProps()} />);
    expect(screen.getAllByText(/3 canjes vigentes: revisa la base de datos/).length).toBeGreaterThan(0);
  });

  it("el aviso de divergencia pluraliza en singular con un solo canje vigente", () => {
    const coupon = makeAdminCoupon({ redeemedCount: 5, activeRedemptions: 1 });
    render(<CouponsTable coupons={[coupon]} {...baseProps()} />);
    expect(screen.getAllByText("1 canje vigente: revisa la base de datos.").length).toBeGreaterThan(0);
  });

  it("llama a onEdit con el cupón al hacer clic en editar", async () => {
    const user = userEvent.setup();
    const coupon = makeAdminCoupon();
    const onEdit = jest.fn();
    render(<CouponsTable coupons={[coupon]} {...baseProps()} onEdit={onEdit} />);

    const table = within(screen.getByRole("table"));
    await user.click(table.getByRole("button", { name: "Editar cupón" }));
    expect(onEdit).toHaveBeenCalledWith(coupon);
  });

  it("un cupón activo ofrece 'Cancelar' y llama a onToggleActive (no un delete)", async () => {
    const user = userEvent.setup();
    const coupon = makeAdminCoupon({ active: true });
    const onToggleActive = jest.fn();
    render(<CouponsTable coupons={[coupon]} {...baseProps()} onToggleActive={onToggleActive} />);

    const table = within(screen.getByRole("table"));
    const button = table.getByRole("button", { name: "Cancelar cupón" });
    await user.click(button);
    expect(onToggleActive).toHaveBeenCalledWith(coupon);
  });

  it("un cupón cancelado ofrece 'Reactivar' en su lugar", () => {
    const coupon = makeAdminCoupon({ active: false });
    render(<CouponsTable coupons={[coupon]} {...baseProps()} />);

    const table = within(screen.getByRole("table"));
    expect(table.getByRole("button", { name: "Reactivar cupón" })).toBeInTheDocument();
    expect(table.queryByRole("button", { name: "Cancelar cupón" })).not.toBeInTheDocument();
  });

  it("pide confirmación antes de borrar", async () => {
    const user = userEvent.setup();
    const coupon = makeAdminCoupon({ id: 7 });
    const onAskDelete = jest.fn();
    render(<CouponsTable coupons={[coupon]} {...baseProps()} onAskDelete={onAskDelete} />);

    const table = within(screen.getByRole("table"));
    await user.click(table.getByRole("button", { name: "Eliminar cupón" }));
    expect(onAskDelete).toHaveBeenCalledWith(7);
  });

  it("con confirmingId activo muestra Confirmar/Cancelar en vez de los íconos", () => {
    const coupon = makeAdminCoupon({ id: 7 });
    render(<CouponsTable coupons={[coupon]} {...baseProps()} confirmingId={7} />);

    const table = within(screen.getByRole("table"));
    expect(table.getByRole("button", { name: "Confirmar" })).toBeInTheDocument();
    expect(table.queryByRole("button", { name: "Eliminar cupón" })).not.toBeInTheDocument();
  });

  it("Confirmar llama a onConfirmDelete con el cupón completo", async () => {
    const user = userEvent.setup();
    const coupon = makeAdminCoupon({ id: 7 });
    const onConfirmDelete = jest.fn();
    render(
      <CouponsTable coupons={[coupon]} {...baseProps()} confirmingId={7} onConfirmDelete={onConfirmDelete} />
    );
    const table = within(screen.getByRole("table"));
    await user.click(table.getByRole("button", { name: "Confirmar" }));
    expect(onConfirmDelete).toHaveBeenCalledWith(coupon);
  });

  it("Cancelar en el modo de confirmación limpia la confirmación (onAskDelete(null))", async () => {
    const user = userEvent.setup();
    const coupon = makeAdminCoupon({ id: 7 });
    const onAskDelete = jest.fn();
    render(<CouponsTable coupons={[coupon]} {...baseProps()} confirmingId={7} onAskDelete={onAskDelete} />);

    const table = within(screen.getByRole("table"));
    await user.click(table.getByRole("button", { name: "Cancelar" }));
    expect(onAskDelete).toHaveBeenCalledWith(null);
  });

  it("busyId deshabilita Confirmar y lo cambia por '…'", () => {
    const coupon = makeAdminCoupon({ id: 7 });
    render(<CouponsTable coupons={[coupon]} {...baseProps()} confirmingId={7} busyId={7} />);

    const table = within(screen.getByRole("table"));
    const button = table.getByRole("button", { name: "…" });
    expect(button).toBeDisabled();
  });

  it("busyId de otro renglón no deshabilita este", () => {
    const coupon = makeAdminCoupon({ id: 7 });
    render(<CouponsTable coupons={[coupon]} {...baseProps()} confirmingId={7} busyId={99} />);

    const table = within(screen.getByRole("table"));
    expect(table.getByRole("button", { name: "Confirmar" })).not.toBeDisabled();
  });
});
