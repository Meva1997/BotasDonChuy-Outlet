import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExpenseForm from "../ExpenseForm";
import { makeExpense } from "./helpers/factories";

describe("ExpenseForm", () => {
  describe("alta de un gasto nuevo", () => {
    it("muestra los campos de monto (solo existen en el alta)", () => {
      render(<ExpenseForm editing={null} isSaving={false} onSubmit={jest.fn()} onCancel={jest.fn()} />);
      expect(screen.getByLabelText("Monto")).toBeInTheDocument();
      expect(screen.getByLabelText("Ese monto rige desde")).toBeInTheDocument();
      expect(screen.queryByText(/El monto no se edita aquí/)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Crear gasto" })).toBeInTheDocument();
    });

    it("arranca en frecuencia mensual con 'Primer cargo' y fecha de término visibles", () => {
      render(<ExpenseForm editing={null} isSaving={false} onSubmit={jest.fn()} onCancel={jest.fn()} />);
      expect(screen.getByLabelText("Primer cargo")).toBeInTheDocument();
      expect(screen.getByLabelText("Fecha de término")).toBeInTheDocument();
    });

    it("al elegir 'única vez' esconde la fecha de término y renombra la fecha del primer cargo", async () => {
      const user = userEvent.setup();
      render(<ExpenseForm editing={null} isSaving={false} onSubmit={jest.fn()} onCancel={jest.fn()} />);

      await user.selectOptions(screen.getByLabelText("Frecuencia"), "once");

      expect(screen.getByLabelText("Fecha del cargo")).toBeInTheDocument();
      expect(screen.queryByLabelText("Fecha de término")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Primer cargo")).not.toBeInTheDocument();
    });

    it("envía el payload validado con un alta completa", async () => {
      const onSubmit = jest.fn();
      const user = userEvent.setup();
      render(<ExpenseForm editing={null} isSaving={false} onSubmit={onSubmit} onCancel={jest.fn()} />);

      await user.type(screen.getByLabelText("Concepto"), "Render — Web Service");
      await user.type(screen.getByLabelText("Proveedor"), "Render");
      await user.type(screen.getByLabelText("Primer cargo"), "2026-03-01");
      await user.type(screen.getByLabelText("Monto"), "290");
      await user.click(screen.getByRole("button", { name: "Crear gasto" }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          concept: "Render — Web Service",
          vendor: "Render",
          category: "software",
          frequency: "monthly",
          startsAt: "2026-03-01",
          amount: "290",
        })
      );
    });
  });

  describe("validación (espejo del backend)", () => {
    async function fillConceptAndDate(user: ReturnType<typeof userEvent.setup>) {
      await user.type(screen.getByLabelText("Concepto"), "Gasto de prueba");
      await user.type(screen.getByLabelText("Primer cargo"), "2026-03-01");
    }

    it("exige un concepto", async () => {
      const onSubmit = jest.fn();
      const user = userEvent.setup();
      render(<ExpenseForm editing={null} isSaving={false} onSubmit={onSubmit} onCancel={jest.fn()} />);
      await user.type(screen.getByLabelText("Primer cargo"), "2026-03-01");
      await user.type(screen.getByLabelText("Monto"), "290");
      await user.click(screen.getByRole("button", { name: "Crear gasto" }));

      expect(
        await screen.findByText("Escribe un concepto (por ejemplo: Render — Web Service)")
      ).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("exige la fecha del primer cargo", async () => {
      const onSubmit = jest.fn();
      const user = userEvent.setup();
      render(<ExpenseForm editing={null} isSaving={false} onSubmit={onSubmit} onCancel={jest.fn()} />);
      await user.type(screen.getByLabelText("Concepto"), "Gasto de prueba");
      await user.type(screen.getByLabelText("Monto"), "290");
      await user.click(screen.getByRole("button", { name: "Crear gasto" }));

      expect(await screen.findByText("Elige una fecha")).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("rechaza un proveedor de más de 60 caracteres", async () => {
      const onSubmit = jest.fn();
      const user = userEvent.setup();
      render(<ExpenseForm editing={null} isSaving={false} onSubmit={onSubmit} onCancel={jest.fn()} />);
      await user.type(screen.getByLabelText("Concepto"), "Gasto de prueba");
      await user.type(screen.getByLabelText("Primer cargo"), "2026-03-01");
      await user.type(screen.getByLabelText("Monto"), "290");
      fireEvent.change(screen.getByLabelText("Proveedor"), { target: { value: "x".repeat(61) } });
      await user.click(screen.getByRole("button", { name: "Crear gasto" }));

      expect(await screen.findByText("Máximo 60 caracteres")).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("rechaza notas de más de 300 caracteres", async () => {
      const onSubmit = jest.fn();
      const user = userEvent.setup();
      render(<ExpenseForm editing={null} isSaving={false} onSubmit={onSubmit} onCancel={jest.fn()} />);
      await user.type(screen.getByLabelText("Concepto"), "Gasto de prueba");
      await user.type(screen.getByLabelText("Primer cargo"), "2026-03-01");
      await user.type(screen.getByLabelText("Monto"), "290");
      fireEvent.change(screen.getByLabelText("Notas"), { target: { value: "x".repeat(301) } });
      await user.click(screen.getByRole("button", { name: "Crear gasto" }));

      expect(await screen.findByText("Máximo 300 caracteres")).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("exige el monto en el alta", async () => {
      const onSubmit = jest.fn();
      const user = userEvent.setup();
      render(<ExpenseForm editing={null} isSaving={false} onSubmit={onSubmit} onCancel={jest.fn()} />);
      await fillConceptAndDate(user);
      await user.click(screen.getByRole("button", { name: "Crear gasto" }));

      expect(await screen.findByText("Escribe cuánto cuesta")).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("rechaza un monto no numérico", async () => {
      const onSubmit = jest.fn();
      const user = userEvent.setup();
      render(<ExpenseForm editing={null} isSaving={false} onSubmit={onSubmit} onCancel={jest.fn()} />);
      await fillConceptAndDate(user);
      await user.type(screen.getByLabelText("Monto"), "abc");
      await user.click(screen.getByRole("button", { name: "Crear gasto" }));

      expect(await screen.findByText("Escribe un monto válido")).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("rechaza un monto <= 0", async () => {
      const onSubmit = jest.fn();
      const user = userEvent.setup();
      render(<ExpenseForm editing={null} isSaving={false} onSubmit={onSubmit} onCancel={jest.fn()} />);
      await fillConceptAndDate(user);
      await user.type(screen.getByLabelText("Monto"), "0");
      await user.click(screen.getByRole("button", { name: "Crear gasto" }));

      expect(await screen.findByText("El monto debe ser mayor a 0")).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("rechaza una fecha de término anterior al primer cargo", async () => {
      const onSubmit = jest.fn();
      const user = userEvent.setup();
      render(<ExpenseForm editing={null} isSaving={false} onSubmit={onSubmit} onCancel={jest.fn()} />);
      await fillConceptAndDate(user);
      await user.type(screen.getByLabelText("Monto"), "290");
      await user.type(screen.getByLabelText("Fecha de término"), "2026-01-01");
      await user.click(screen.getByRole("button", { name: "Crear gasto" }));

      expect(
        await screen.findByText("La fecha de término no puede ser anterior a la del primer cargo")
      ).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("cambiar a única vez limpia una fecha de término ya tecleada", async () => {
      // Bug real encontrado escribiendo esta suite: react-hook-form no
      // desregistra un input al desmontarlo (default `shouldUnregister: false`),
      // así que un `endsAt` tecleado en mensual sobrevivía el cambio a "única
      // vez" aunque el campo —y su `FieldError`— ya no estuvieran en el DOM.
      // `superRefine` seguía rechazando ese valor fantasma y el guardado fallaba
      // en silencio: sin mensaje visible que lo explicara, porque vivía dentro
      // del mismo `{!isOnce && …}` que el input. Se arregló limpiando `endsAt`
      // al entrar a "única vez" (ver el `useEffect` en ExpenseForm.tsx).
      const onSubmit = jest.fn();
      const user = userEvent.setup();
      render(<ExpenseForm editing={null} isSaving={false} onSubmit={onSubmit} onCancel={jest.fn()} />);
      await fillConceptAndDate(user);
      await user.type(screen.getByLabelText("Monto"), "290");
      // Se escribe la fecha de término ESTANDO en mensual (el campo aún visible)...
      await user.type(screen.getByLabelText("Fecha de término"), "2026-06-01");
      // ...y luego se cambia a única vez: el campo desaparece Y su valor se limpia.
      await user.selectOptions(screen.getByLabelText("Frecuencia"), "once");
      expect(screen.queryByLabelText("Fecha de término")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Crear gasto" }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(
        screen.queryByText(/no lleva fecha de término/)
      ).not.toBeInTheDocument();
      expect(onSubmit.mock.calls[0][0]).toEqual(
        expect.objectContaining({ frequency: "once", endsAt: "" })
      );
    });

    it("volver a mensual después de 'única vez' no resucita una fecha de término limpiada", async () => {
      const user = userEvent.setup();
      render(<ExpenseForm editing={null} isSaving={false} onSubmit={jest.fn()} onCancel={jest.fn()} />);
      await user.type(screen.getByLabelText("Fecha de término"), "2026-06-01");
      await user.selectOptions(screen.getByLabelText("Frecuencia"), "once");
      await user.selectOptions(screen.getByLabelText("Frecuencia"), "monthly");
      expect(screen.getByLabelText("Fecha de término")).toHaveValue("");
    });
  });

  describe("edición", () => {
    it("no ofrece los campos de monto y explica dónde cambiarlo", () => {
      const expense = makeExpense({ currentAmount: 340 });
      render(<ExpenseForm editing={expense} isSaving={false} onSubmit={jest.fn()} onCancel={jest.fn()} />);

      expect(screen.queryByLabelText("Monto")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Ese monto rige desde")).not.toBeInTheDocument();
      expect(screen.getByText(/El monto no se edita aquí/)).toBeInTheDocument();
      expect(screen.getByText("$340.00 vigente")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
    });

    it("un proveedor ausente siembra el campo vacío, no 'null'", () => {
      const expense = makeExpense({ vendor: null });
      render(<ExpenseForm editing={expense} isSaving={false} onSubmit={jest.fn()} onCancel={jest.fn()} />);
      expect(screen.getByLabelText("Proveedor")).toHaveValue("");
    });

    it("siembra los campos existentes tal cual, sin corrección de zona horaria", () => {
      const expense = makeExpense({
        concept: "Hosting",
        vendor: "Vercel",
        startsAt: "2026-05-01",
        endsAt: "2026-12-31",
      });
      render(<ExpenseForm editing={expense} isSaving={false} onSubmit={jest.fn()} onCancel={jest.fn()} />);

      expect(screen.getByLabelText("Concepto")).toHaveValue("Hosting");
      expect(screen.getByLabelText("Proveedor")).toHaveValue("Vercel");
      expect(screen.getByLabelText("Primer cargo")).toHaveValue("2026-05-01");
      expect(screen.getByLabelText("Fecha de término")).toHaveValue("2026-12-31");
    });

    it("la nota de fecha de término cambia de copia en edición vs. alta", () => {
      const expense = makeExpense();
      render(<ExpenseForm editing={expense} isSaving={false} onSubmit={jest.fn()} onCancel={jest.fn()} />);
      expect(screen.getByText(/Vaciarla no la borra: el guardado conservaría la fecha actual/)).toBeInTheDocument();
    });

    it("envía el payload de edición sin claves de monto", async () => {
      const onSubmit = jest.fn();
      const user = userEvent.setup();
      const expense = makeExpense({ concept: "Hosting" });
      render(<ExpenseForm editing={expense} isSaving={false} onSubmit={onSubmit} onCancel={jest.fn()} />);

      await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      const sent = onSubmit.mock.calls[0][0];
      expect(sent.concept).toBe("Hosting");
      expect(sent.amount).toBe("");
      expect(sent.amountEffectiveFrom).toBe("");
    });
  });

  it("desactivar 'Gasto activo' se puede alternar (arranca activo)", async () => {
    const user = userEvent.setup();
    render(<ExpenseForm editing={null} isSaving={false} onSubmit={jest.fn()} onCancel={jest.fn()} />);
    const checkbox = screen.getByLabelText(/^Gasto activo/);
    expect(checkbox).toBeChecked();
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("deshabilita el botón y cambia su texto mientras guarda", () => {
    render(<ExpenseForm editing={null} isSaving onSubmit={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
  });

  it("muestra el mensaje de error del backend", () => {
    render(
      <ExpenseForm
        editing={null}
        isSaving={false}
        errorMessage="El monto debe ser mayor a 0."
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent("El monto debe ser mayor a 0.");
  });

  it("llama a onCancel al hacer clic en Cancelar", async () => {
    const onCancel = jest.fn();
    const user = userEvent.setup();
    render(<ExpenseForm editing={null} isSaving={false} onSubmit={jest.fn()} onCancel={onCancel} />);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
