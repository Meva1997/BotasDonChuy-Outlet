import { act, screen } from "@testing-library/react";
import { useCartStore } from "@/store/cartStore";
import { useCheckout } from "../CheckoutContext";
import UserDetails from "../UserDetails";
import { makeCartItem } from "./helpers/factories";
import { renderWithCheckout } from "./helpers/render";

// Paso 1 del checkout: captura y valida la dirección (RHF + zod contra
// MEXICAN_STATES). `confirmShipping` es lo único que avanza de paso — y a
// propósito invalida SIN CONDICIÓN cualquier tarifa elegida antes: una dirección
// nueva (o reenviada) puede cotizar distinto, así que no basta con "si cambió".

type Ctx = ReturnType<typeof useCheckout>;

function Harness({
  onContext,
  draft,
}: {
  onContext: (ctx: Ctx) => void;
  draft?: Record<string, string>;
}) {
  const ctx = useCheckout();
  // `setShippingDraft` solo muta un ref interno del provider (no dispara un
  // re-render), así que llamarlo en cada pasada de render es idempotente: sirve
  // para sembrar el borrador ANTES de que `UserDetails` monte y lea
  // `getShippingDraft()` en sus `defaultValues` (que solo se leen una vez).
  if (draft) ctx.setShippingDraft(draft);
  onContext(ctx);
  return <UserDetails />;
}

function renderForm(draft?: Record<string, string>) {
  let ctx!: Ctx;
  const utils = renderWithCheckout(
    <Harness draft={draft} onContext={(c) => (ctx = c)} />
  );
  return { ...utils, getCtx: () => ctx };
}

async function fillValidForm(user: ReturnType<typeof renderForm>["user"]) {
  await user.type(screen.getByLabelText("Nombre completo"), "Ana López");
  await user.type(screen.getByLabelText("Correo electrónico"), "ana@ejemplo.com");
  await user.type(screen.getByLabelText("Teléfono (10 dígitos)"), "5512345678");
  await user.type(screen.getByLabelText("Calle y número"), "Av. Hidalgo 123");
  await user.type(screen.getByLabelText("Colonia"), "Centro");
  await user.type(screen.getByLabelText("Ciudad / Municipio"), "Celaya");
  await user.selectOptions(screen.getByLabelText("Estado"), "Guanajuato");
  await user.type(screen.getByLabelText("Código postal"), "38000");
}

beforeEach(() => {
  useCartStore.setState({ items: [makeCartItem()] });
});

describe("validación", () => {
  it("con el formulario vacío, no avanza y muestra los errores de cada campo requerido", async () => {
    const { user, getCtx } = renderForm();
    await user.click(screen.getByRole("button", { name: "Continuar a método de envío" }));

    expect(await screen.findByText("Ingresa tu nombre completo")).toBeInTheDocument();
    expect(screen.getByText("Selecciona un estado de la República")).toBeInTheDocument();
    expect(getCtx().confirmedCustomer).toBeNull();
    expect(getCtx().step).toBe(0);
  });

  it("un teléfono que no tiene exactamente 10 dígitos se rechaza", async () => {
    const { user } = renderForm();
    await user.type(screen.getByLabelText("Teléfono (10 dígitos)"), "12345");
    await user.click(screen.getByRole("button", { name: "Continuar a método de envío" }));

    expect(await screen.findByText("El teléfono debe tener 10 dígitos")).toBeInTheDocument();
  });

  it("references (opcional) igual se valida: más de 200 caracteres se rechaza", async () => {
    const { user } = renderForm();
    await user.type(screen.getByLabelText("Referencias (opcional)"), "x".repeat(201));
    await user.click(screen.getByRole("button", { name: "Continuar a método de envío" }));

    expect(await screen.findByText("Máximo 200 caracteres")).toBeInTheDocument();
  });

  it("un correo mal formado se rechaza", async () => {
    const { user } = renderForm();
    await user.type(screen.getByLabelText("Correo electrónico"), "no-es-un-correo");
    await user.click(screen.getByRole("button", { name: "Continuar a método de envío" }));

    expect(
      await screen.findByText("Ingresa un correo electrónico válido")
    ).toBeInTheDocument();
  });

  it("references es opcional: el formulario no falla por dejarlo vacío", async () => {
    const { user, getCtx } = renderForm();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Continuar a método de envío" }));

    expect(getCtx().confirmedCustomer).not.toBeNull();
  });
});

describe("confirmShipping en un envío válido", () => {
  it("guarda la dirección confirmada y avanza al paso 2 (Envío)", async () => {
    const { user, getCtx } = renderForm();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Continuar a método de envío" }));

    expect(getCtx().confirmedCustomer).toMatchObject({
      fullName: "Ana López",
      email: "ana@ejemplo.com",
      state: "Guanajuato",
    });
    expect(getCtx().step).toBe(2);
  });

  it("invalida sin condición cualquier tarifa elegida antes, sin importar la firma", async () => {
    const { user, getCtx } = renderForm();
    act(() => {
      getCtx().setSelectedRate("cualquier-firma", {
        rateId: "r1",
        carrier: "Estafeta",
        service: "Terrestre",
        amount: 150,
        total: 150,
        days: 3,
        packageCount: 1,
        quotationId: "q1",
      });
    });
    expect(getCtx().getSelectedRate("cualquier-firma")).not.toBeNull();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Continuar a método de envío" }));

    expect(getCtx().getSelectedRate("cualquier-firma")).toBeNull();
  });
});

describe("botón deshabilitado con el carrito vacío", () => {
  it("no se puede continuar sin artículos en el carrito", () => {
    useCartStore.setState({ items: [] });
    renderForm();
    expect(screen.getByRole("button", { name: "Continuar a método de envío" })).toBeDisabled();
  });
});

describe("borrador de envío (sobrevive al desmontar)", () => {
  it("guarda lo tecleado (sin validar) al desmontar, para resembrarlo al volver", async () => {
    const { user, unmount, getCtx } = renderForm();
    await user.type(screen.getByLabelText("Nombre completo"), "Borrador sin terminar");

    unmount();

    expect(getCtx().getShippingDraft()).toMatchObject({ fullName: "Borrador sin terminar" });
  });

  it("resiembra el formulario con el borrador guardado antes de montar", () => {
    renderForm({ fullName: "Ya escrito antes" });
    expect(screen.getByLabelText("Nombre completo")).toHaveValue("Ya escrito antes");
  });
});

describe("volver al resumen", () => {
  it("el botón 'Volver al resumen' llama a goToReview sin validar el formulario", async () => {
    const { user, getCtx } = renderForm();
    await user.click(screen.getByRole("button", { name: "← Volver al resumen" }));

    expect(getCtx().step).toBe(0);
    // No se muestran errores de validación: goToReview no pasa por handleSubmit.
    expect(screen.queryByText("Ingresa tu nombre completo")).not.toBeInTheDocument();
  });
});
