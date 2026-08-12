import { screen, waitFor } from "@testing-library/react";
import CouponForm from "../CouponForm";
import { renderWithQueryClient } from "./helpers/render";
import { makeAdminCoupon, makeAdminProductForRange } from "./helpers/factories";

// El formulario mira el catálogo (rango de precios) vía TanStack Query — se mockea
// para no pegarle a la red real y para controlar qué "compra" se ofrece de
// referencia. jest.mock() usa ruta relativa: el alias @/ de Next no lo resuelve
// dentro de jest.mock() (ver CLAUDE.md).
jest.mock("../../../../lib/api/adminProducts", () => ({
  ...jest.requireActual("../../../../lib/api/adminProducts"),
  getAdminProducts: jest.fn(),
}));

import { getAdminProducts } from "@/lib/api/adminProducts";

const getAdminProductsMock = getAdminProducts as jest.Mock;

beforeEach(() => {
  getAdminProductsMock.mockReset();
  getAdminProductsMock.mockResolvedValue([]);
});

describe("CouponForm", () => {
  describe("alta de un cupón nuevo", () => {
    it("arranca con los defaults del backend: porcentaje, un uso por cliente, activo", () => {
      renderWithQueryClient(<CouponForm editing={null} isSaving={false} onSubmit={jest.fn()} onCancel={jest.fn()} />);

      expect(screen.getByLabelText("Código")).not.toBeDisabled();
      expect(screen.getByLabelText("Código")).toHaveValue("");
      expect(screen.getByLabelText("Tipo")).toHaveValue("percent");
      expect(screen.getByLabelText(/Un solo uso por cliente/)).toBeChecked();
      expect(screen.getByLabelText(/^Activo/)).toBeChecked();
      expect(screen.getByRole("button", { name: "Crear cupón" })).toBeInTheDocument();
    });

    it("envía el payload validado al guardar un cupón nuevo válido", async () => {
      const onSubmit = jest.fn();
      const { user } = renderWithQueryClient(
        <CouponForm editing={null} isSaving={false} onSubmit={onSubmit} onCancel={jest.fn()} />
      );

      await user.type(screen.getByLabelText("Código"), "verano20");
      await user.type(screen.getByLabelText("Porcentaje (1–100)"), "20");
      await user.type(screen.getByLabelText("Empieza"), "2026-08-01");
      await user.type(screen.getByLabelText("Vence"), "2026-08-31");
      await user.click(screen.getByRole("button", { name: "Crear cupón" }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      // handleSubmit de react-hook-form llama a onSubmit(data, event) — se lee el
      // primer argumento directo en vez de toHaveBeenCalledWith, que compararía
      // también el evento sintético.
      expect(onSubmit.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          code: "verano20",
          type: "percent",
          value: "20",
          startsAt: "2026-08-01",
          expiresAt: "2026-08-31",
        })
      );
    });

    it("no envía nada si el valor del descuento queda vacío", async () => {
      const onSubmit = jest.fn();
      const { user } = renderWithQueryClient(
        <CouponForm editing={null} isSaving={false} onSubmit={onSubmit} onCancel={jest.fn()} />
      );
      await user.type(screen.getByLabelText("Código"), "ABC123");
      await user.click(screen.getByRole("button", { name: "Crear cupón" }));

      expect(await screen.findByText("Escribe el valor del descuento")).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("rechaza un código con caracteres fuera de letras/números", async () => {
      const onSubmit = jest.fn();
      const { user } = renderWithQueryClient(
        <CouponForm editing={null} isSaving={false} onSubmit={onSubmit} onCancel={jest.fn()} />
      );
      await user.type(screen.getByLabelText("Código"), "AB!");
      await user.type(screen.getByLabelText("Porcentaje (1–100)"), "20");
      await user.click(screen.getByRole("button", { name: "Crear cupón" }));

      expect(
        await screen.findByText("Solo letras y números, entre 3 y 32 caracteres")
      ).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("edición", () => {
    it("deshabilita el código y explica por qué", () => {
      const coupon = makeAdminCoupon({ code: "FIJO50", redeemedCount: 3 });
      renderWithQueryClient(
        <CouponForm editing={coupon} isSaving={false} onSubmit={jest.fn()} onCancel={jest.fn()} />
      );

      expect(screen.getByLabelText("Código")).toBeDisabled();
      expect(screen.getByLabelText("Código")).toHaveValue("FIJO50");
      expect(screen.getByText("3 usos registrados")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
    });

    it("pluraliza el conteo de usos en singular", () => {
      const coupon = makeAdminCoupon({ redeemedCount: 1 });
      renderWithQueryClient(
        <CouponForm editing={coupon} isSaving={false} onSubmit={jest.fn()} onCancel={jest.fn()} />
      );
      expect(screen.getByText("1 uso registrado")).toBeInTheDocument();
    });
  });

  describe("reglas cruzadas (espejo del backend)", () => {
    async function fillMinimalValid(user: ReturnType<typeof renderWithQueryClient>["user"]) {
      await user.type(screen.getByLabelText("Código"), "CODE1");
    }

    it("rechaza un valor de descuento <= 0", async () => {
      const onSubmit = jest.fn();
      const { user } = renderWithQueryClient(
        <CouponForm editing={null} isSaving={false} onSubmit={onSubmit} onCancel={jest.fn()} />
      );
      await fillMinimalValid(user);
      await user.type(screen.getByLabelText("Porcentaje (1–100)"), "0");
      await user.click(screen.getByRole("button", { name: "Crear cupón" }));

      expect(
        await screen.findByText("El valor del descuento debe ser mayor a 0")
      ).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("rechaza un porcentaje mayor a 100", async () => {
      const onSubmit = jest.fn();
      const { user } = renderWithQueryClient(
        <CouponForm editing={null} isSaving={false} onSubmit={onSubmit} onCancel={jest.fn()} />
      );
      await fillMinimalValid(user);
      await user.type(screen.getByLabelText("Porcentaje (1–100)"), "150");
      await user.click(screen.getByRole("button", { name: "Crear cupón" }));

      expect(
        await screen.findByText("Un cupón de porcentaje no puede pasar de 100")
      ).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("no limita un cupón de monto fijo a 100", async () => {
      const onSubmit = jest.fn();
      const { user } = renderWithQueryClient(
        <CouponForm editing={null} isSaving={false} onSubmit={onSubmit} onCancel={jest.fn()} />
      );
      await fillMinimalValid(user);
      await user.selectOptions(screen.getByLabelText("Tipo"), "fixed");
      await user.type(screen.getByLabelText("Monto en pesos"), "500");
      await user.click(screen.getByRole("button", { name: "Crear cupón" }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(
        screen.queryByText("Un cupón de porcentaje no puede pasar de 100")
      ).not.toBeInTheDocument();
    });

    it("el tope del descuento se deshabilita y se rechaza en un cupón de monto fijo", async () => {
      const onSubmit = jest.fn();
      const { user } = renderWithQueryClient(
        <CouponForm editing={null} isSaving={false} onSubmit={onSubmit} onCancel={jest.fn()} />
      );
      await fillMinimalValid(user);
      // Se escribe el tope ESTANDO en porcentaje (el campo aún habilitado)...
      await user.type(screen.getByLabelText("Porcentaje (1–100)"), "20");
      await user.type(screen.getByLabelText("Tope del descuento"), "300");
      // ...y luego se cambia a monto fijo: el campo queda deshabilitado pero el
      // valor tecleado sigue en el estado del formulario.
      await user.selectOptions(screen.getByLabelText("Tipo"), "fixed");
      expect(screen.getByLabelText("Tope del descuento")).toBeDisabled();

      await user.click(screen.getByRole("button", { name: "Crear cupón" }));

      expect(
        await screen.findByText("El tope en pesos solo aplica a los cupones de porcentaje")
      ).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("rechaza un tope de descuento <= 0", async () => {
      const onSubmit = jest.fn();
      const { user } = renderWithQueryClient(
        <CouponForm editing={null} isSaving={false} onSubmit={onSubmit} onCancel={jest.fn()} />
      );
      await fillMinimalValid(user);
      await user.type(screen.getByLabelText("Porcentaje (1–100)"), "20");
      await user.type(screen.getByLabelText("Tope del descuento"), "0");
      await user.click(screen.getByRole("button", { name: "Crear cupón" }));

      expect(await screen.findByText("El tope debe ser mayor a 0")).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("rechaza un mínimo de compra negativo", async () => {
      const onSubmit = jest.fn();
      const { user } = renderWithQueryClient(
        <CouponForm editing={null} isSaving={false} onSubmit={onSubmit} onCancel={jest.fn()} />
      );
      await fillMinimalValid(user);
      await user.type(screen.getByLabelText("Porcentaje (1–100)"), "20");
      await user.type(screen.getByLabelText("Mínimo de compra"), "-50");
      await user.click(screen.getByRole("button", { name: "Crear cupón" }));

      expect(
        await screen.findByText("El mínimo de compra no puede ser negativo")
      ).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("rechaza un límite de usos que no sea entero", async () => {
      const onSubmit = jest.fn();
      const { user } = renderWithQueryClient(
        <CouponForm editing={null} isSaving={false} onSubmit={onSubmit} onCancel={jest.fn()} />
      );
      await fillMinimalValid(user);
      await user.type(screen.getByLabelText("Porcentaje (1–100)"), "20");
      await user.type(screen.getByLabelText("Límite de usos"), "2.5");
      await user.click(screen.getByRole("button", { name: "Crear cupón" }));

      expect(
        await screen.findByText("El límite de usos debe ser un entero de al menos 1")
      ).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("rechaza un límite de usos menor a 1", async () => {
      const onSubmit = jest.fn();
      const { user } = renderWithQueryClient(
        <CouponForm editing={null} isSaving={false} onSubmit={onSubmit} onCancel={jest.fn()} />
      );
      await fillMinimalValid(user);
      await user.type(screen.getByLabelText("Porcentaje (1–100)"), "20");
      await user.type(screen.getByLabelText("Límite de usos"), "0");
      await user.click(screen.getByRole("button", { name: "Crear cupón" }));

      expect(
        await screen.findByText("El límite de usos debe ser un entero de al menos 1")
      ).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("exige que el vencimiento sea posterior al inicio", async () => {
      const onSubmit = jest.fn();
      const { user } = renderWithQueryClient(
        <CouponForm editing={null} isSaving={false} onSubmit={onSubmit} onCancel={jest.fn()} />
      );
      await fillMinimalValid(user);
      await user.type(screen.getByLabelText("Porcentaje (1–100)"), "20");
      await user.type(screen.getByLabelText("Empieza"), "2026-08-31");
      await user.type(screen.getByLabelText("Vence"), "2026-08-01");
      await user.click(screen.getByRole("button", { name: "Crear cupón" }));

      expect(
        await screen.findByText("La fecha de fin debe ser posterior a la de inicio")
      ).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("aviso de campos que no se pueden vaciar (edición)", () => {
    it("no aparece en un cupón nuevo", () => {
      renderWithQueryClient(<CouponForm editing={null} isSaving={false} onSubmit={jest.fn()} onCancel={jest.fn()} />);
      expect(screen.queryByText(/Vaciar un campo no lo borra/)).not.toBeInTheDocument();
    });

    it("no aparece mientras no se vacíe ningún campo con valor guardado", () => {
      const coupon = makeAdminCoupon({ maxDiscount: 300, maxRedemptions: 10 });
      renderWithQueryClient(
        <CouponForm editing={coupon} isSaving={false} onSubmit={jest.fn()} onCancel={jest.fn()} />
      );
      expect(screen.queryByText(/Vaciar un campo no lo borra/)).not.toBeInTheDocument();
    });

    it("aparece y nombra el campo al vaciar un tope guardado", async () => {
      // minSubtotal también viene con valor guardado aquí para ejercitar la rama
      // "no nula" de su mapeo en toFormData (el resto de este describe ya cubre
      // la rama nula con el default de makeAdminCoupon).
      const coupon = makeAdminCoupon({ maxDiscount: 300, minSubtotal: 750 });
      const { user } = renderWithQueryClient(
        <CouponForm editing={coupon} isSaving={false} onSubmit={jest.fn()} onCancel={jest.fn()} />
      );
      await user.clear(screen.getByLabelText("Tope del descuento"));

      expect(
        await screen.findByText(/Vaciar un campo no lo borra: tope del descuento conservará/)
      ).toBeInTheDocument();
    });

    it("pluraliza 'conservarán' al vaciar más de un campo guardado", async () => {
      const coupon = makeAdminCoupon({ maxDiscount: 300, maxRedemptions: 10 });
      const { user } = renderWithQueryClient(
        <CouponForm editing={coupon} isSaving={false} onSubmit={jest.fn()} onCancel={jest.fn()} />
      );
      await user.clear(screen.getByLabelText("Tope del descuento"));
      await user.clear(screen.getByLabelText("Límite de usos"));

      expect(
        await screen.findByText(
          "Vaciar un campo no lo borra: tope del descuento, límite de usos conservarán el valor guardado. Para quitarlo, desactiva este cupón y crea otro."
        )
      ).toBeInTheDocument();
    });
  });

  describe("rango de precios del catálogo", () => {
    it("solo cuenta productos visibles y con stock", async () => {
      getAdminProductsMock.mockResolvedValue([
        makeAdminProductForRange({ id: 1, salePrice: 900, visible: true, stock: 3 }),
        makeAdminProductForRange({ id: 2, salePrice: 5000, visible: false, stock: 3 }),
        makeAdminProductForRange({ id: 3, salePrice: 1, visible: true, stock: 0 }),
      ]);
      renderWithQueryClient(<CouponForm editing={null} isSaving={false} onSubmit={jest.fn()} onCancel={jest.fn()} />);

      expect(
        await screen.findByText("Catálogo hoy: de $900.00 a $900.00 (promedio $900.00).")
      ).toBeInTheDocument();
    });

    it("no se muestra si no hay nada comprable", async () => {
      getAdminProductsMock.mockResolvedValue([
        makeAdminProductForRange({ visible: false }),
      ]);
      renderWithQueryClient(<CouponForm editing={null} isSaving={false} onSubmit={jest.fn()} onCancel={jest.fn()} />);

      await waitFor(() => expect(getAdminProductsMock).toHaveBeenCalled());
      expect(screen.queryByText(/Catálogo hoy/)).not.toBeInTheDocument();
    });
  });

  it("deshabilita el botón y cambia su texto mientras guarda", () => {
    renderWithQueryClient(<CouponForm editing={null} isSaving onSubmit={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
  });

  it("muestra el mensaje de error del backend", () => {
    renderWithQueryClient(
      <CouponForm
        editing={null}
        isSaving={false}
        errorMessage="Ya existe un cupón con el código VERANO20"
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Ya existe un cupón con el código VERANO20");
  });

  it("llama a onCancel al hacer clic en Cancelar", async () => {
    const onCancel = jest.fn();
    const { user } = renderWithQueryClient(
      <CouponForm editing={null} isSaving={false} onSubmit={jest.fn()} onCancel={onCancel} />
    );
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
