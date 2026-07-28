import { screen } from "@testing-library/react";
import ImportConfirmBar from "../../ImportConfirmBar";
import { COPY } from "../../labels";
import { renderWithUser } from "../helpers/render";

// La decisión de seguridad más importante de la pantalla: cuántas filas se aplican y que el
// stock SUMA. Lo que se prueba aquí es que confirmar nunca se salte el segundo clic cuando hay
// motivo de alarma, y que el compromiso (la advertencia del restock) siempre esté a la vista.

function setup(props: Partial<React.ComponentProps<typeof ImportConfirmBar>> = {}) {
  const onConfirm = jest.fn();
  const utils = renderWithUser(
    <ImportConfirmBar
      selectedCount={3}
      hasBrokenDependencies={false}
      isSameBatch={false}
      cooldownSeconds={0}
      isPending={false}
      error={null}
      onConfirm={onConfirm}
      {...props}
    />
  );
  return { onConfirm, ...utils };
}

const applyButton = () => screen.getByRole("button", { name: /aplicar|selecciona filas/i });

describe("estado normal", () => {
  it("dice cuántas filas se van a aplicar y aplica al primer clic", async () => {
    const { user, onConfirm } = setup({ selectedCount: 3 });
    expect(screen.getByRole("button", { name: "Aplicar 3 filas" })).toBeInTheDocument();

    await user.click(applyButton());
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("mantiene a la vista que el restock suma, aunque el archivo tenga 500 filas", () => {
    setup();
    expect(screen.getByText(COPY.restockWarning)).toBeInTheDocument();
  });

  it("no deja aplicar sin nada seleccionado", async () => {
    const { user, onConfirm } = setup({ selectedCount: 0 });
    const button = screen.getByRole("button", { name: "Selecciona filas para aplicar" });
    expect(button).toBeDisabled();

    await user.click(button);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText("No hay ninguna fila seleccionada")).toBeInTheDocument();
  });

  it("bloquea el botón mientras se aplica y lo anuncia como ocupado", () => {
    setup({ isPending: true });
    const button = screen.getByRole("button", { name: "Aplicando…" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});

describe("confirmación extra por dependencias rotas", () => {
  it("exige un segundo clic antes de aplicar", async () => {
    const { user, onConfirm } = setup({ hasBrokenDependencies: true });

    await user.click(applyButton());
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Aplicar de todos modos" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Aplicar de todos modos" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("«Revisar de nuevo» desarma sin aplicar", async () => {
    const { user, onConfirm } = setup({ hasBrokenDependencies: true });
    await user.click(applyButton());
    await user.click(screen.getByRole("button", { name: "Revisar de nuevo" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Aplicar 3 filas" })).toBeInTheDocument();
  });

  it("se desarma sola si el motivo de alarma desaparece", async () => {
    // Derivado, no sincronizado con un efecto: al reseleccionar la fila que faltaba, el botón
    // vuelve a su estado normal sin quedarse pidiendo una confirmación que ya no aplica.
    const { user, rerender, onConfirm } = setup({ hasBrokenDependencies: true });
    await user.click(applyButton());

    rerender(
      <ImportConfirmBar
        selectedCount={3}
        hasBrokenDependencies={false}
        isSameBatch={false}
        cooldownSeconds={0}
        isPending={false}
        error={null}
        onConfirm={onConfirm}
      />
    );
    expect(screen.getByRole("button", { name: "Aplicar 3 filas" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revisar de nuevo" })).not.toBeInTheDocument();
  });
});

describe("mismo lote que el último enviado", () => {
  it("explica el 409 antes de gastar la petición y pide confirmación", async () => {
    const { user, onConfirm } = setup({ isSameBatch: true });
    expect(screen.getByRole("status")).toHaveTextContent(COPY.sameBatchWarning);

    await user.click(applyButton());
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Aplicar de todos modos" })).toBeInTheDocument();
  });

  it("cede el espacio al error real cuando ya lo hubo", () => {
    setup({ isSameBatch: true, error: "Esta misma importación se acaba de aplicar." });
    expect(screen.queryByText(COPY.sameBatchWarning)).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Esta misma importación se acaba de aplicar.");
  });
});

describe("errores", () => {
  it("muestra el mensaje del backend como alert", () => {
    setup({ error: "El servidor rechazó las filas enviadas." });
    expect(screen.getByRole("alert")).toHaveTextContent("El servidor rechazó las filas enviadas.");
  });

  it("agrega la cuenta regresiva de la ventana anti-duplicado", () => {
    setup({ error: "Esta misma importación se acaba de aplicar.", cooldownSeconds: 42 });
    expect(screen.getByRole("alert")).toHaveTextContent("Podrás reintentarlo en unos 42 s.");
  });

  it("no anuncia una cuenta regresiva agotada", () => {
    setup({ error: "Falló.", cooldownSeconds: 0 });
    expect(screen.getByRole("alert")).not.toHaveTextContent(/Podrás reintentarlo/);
  });
});
