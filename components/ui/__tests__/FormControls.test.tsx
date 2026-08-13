import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TextField, SelectField } from "../FormControls";

// Compartidos por checkout/ y auth/ — el detalle no obvio es el borde rojo y el
// `aria-invalid` que dependen SOLO de `error` (no de si el campo fue tocado), y
// que `placeholder` en SelectField es opcional: sin él no debe existir una opción
// deshabilitada de más que un lector de pantalla anuncie como elegible.

describe("TextField", () => {
  it("asocia el label al input vía htmlFor/id", () => {
    render(<TextField label="Correo" id="email" />);

    expect(screen.getByLabelText("Correo")).toBeInTheDocument();
  });

  it("sin error no muestra mensaje y aria-invalid es false", () => {
    render(<TextField label="Correo" id="email" />);

    const input = screen.getByLabelText("Correo");
    expect(input).toHaveAttribute("aria-invalid", "false");
    expect(input.className).not.toMatch(/border-red-500/);
  });

  it("con error muestra el mensaje, aria-invalid true y borde rojo", () => {
    render(<TextField label="Correo" id="email" error="Correo inválido" />);

    const input = screen.getByLabelText("Correo");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.className).toMatch(/border-red-500/);
    expect(screen.getByText("Correo inválido")).toBeInTheDocument();
  });

  it("reenvía el ref al elemento <input>", () => {
    const ref = createRef<HTMLInputElement>();
    render(<TextField label="Correo" id="email" ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toBe(screen.getByLabelText("Correo"));
  });

  it("pasa props nativas del input (placeholder, type) y acepta texto", async () => {
    const user = userEvent.setup();
    render(<TextField label="Correo" id="email" type="email" placeholder="tu@correo.com" />);

    const input = screen.getByLabelText("Correo") as HTMLInputElement;
    expect(input).toHaveAttribute("type", "email");
    expect(input).toHaveAttribute("placeholder", "tu@correo.com");

    await user.type(input, "a@b.com");
    expect(input.value).toBe("a@b.com");
  });
});

describe("SelectField", () => {
  const OPTIONS = ["CDMX", "Jalisco", "Nuevo León"] as const;

  it("asocia el label y renderiza todas las opciones", () => {
    render(<SelectField label="Estado" id="estado" options={OPTIONS} />);

    const select = screen.getByLabelText("Estado");
    OPTIONS.forEach((opt) => {
      expect(screen.getByRole("option", { name: opt })).toBeInTheDocument();
    });
    expect(select).toHaveAttribute("aria-invalid", "false");
  });

  it("sin placeholder no agrega una opción deshabilitada extra", () => {
    render(<SelectField label="Estado" id="estado" options={OPTIONS} />);

    expect(screen.queryAllByRole("option")).toHaveLength(OPTIONS.length);
  });

  it("con placeholder agrega una opción deshabilitada como primera entrada", () => {
    render(
      <SelectField
        label="Estado"
        id="estado"
        options={OPTIONS}
        placeholder="Selecciona un estado"
      />
    );

    const placeholderOption = screen.getByRole("option", { name: "Selecciona un estado" });
    expect(placeholderOption).toBeDisabled();
    expect(screen.queryAllByRole("option")).toHaveLength(OPTIONS.length + 1);
  });

  it("con error muestra el mensaje, aria-invalid true y borde rojo", () => {
    render(
      <SelectField label="Estado" id="estado" options={OPTIONS} error="Elige un estado" />
    );

    const select = screen.getByLabelText("Estado");
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select.className).toMatch(/border-red-500/);
    expect(screen.getByText("Elige un estado")).toBeInTheDocument();
  });

  it("reenvía el ref al elemento <select>", () => {
    const ref = createRef<HTMLSelectElement>();
    render(<SelectField label="Estado" id="estado" options={OPTIONS} ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
  });

  it("permite elegir una opción", async () => {
    const user = userEvent.setup();
    render(<SelectField label="Estado" id="estado" options={OPTIONS} />);

    const select = screen.getByLabelText("Estado") as HTMLSelectElement;
    await user.selectOptions(select, "Jalisco");

    expect(select.value).toBe("Jalisco");
  });
});
