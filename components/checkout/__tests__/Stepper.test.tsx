import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Stepper from "../Stepper";

// Solo se puede saltar a un paso YA VISITADO (index <= maxVisited), nunca a uno sin
// visitar ni al paso actual, y nunca una vez confirmado el pedido (paso final,
// index 3): esas tres condiciones son `canNavigate` en el componente. Un paso
// "visitado pero no actual" (se retrocedió) es un tercer estado visual, ni
// "completado" ni "intacto" — sin él, volver atrás hacía ver un paso lleno como si
// nunca se hubiera tocado.

describe("Stepper", () => {
  it("en el paso 0 sin visitar nada más, ningún paso es navegable", () => {
    render(<Stepper current={0} maxVisited={0} onNavigate={jest.fn()} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("los pasos ya completados (index < current) son navegables hacia atrás", async () => {
    const onNavigate = jest.fn();
    const user = userEvent.setup();
    render(<Stepper current={2} maxVisited={2} onNavigate={onNavigate} />);

    const back = screen.getByRole("button", { name: "Ir a Resumen" });
    await user.click(back);
    expect(onNavigate).toHaveBeenCalledWith(0);

    // El paso actual (index === current) nunca es un botón, aunque esté "visitado".
    expect(screen.queryByRole("button", { name: "Ir a Envío" })).not.toBeInTheDocument();
  });

  it("un paso visitado pero adelante del actual (se retrocedió) sigue siendo navegable", async () => {
    const onNavigate = jest.fn();
    const user = userEvent.setup();
    // Se llegó hasta 'Envío' (maxVisited=2) y se volvió a 'Resumen' (current=0).
    render(<Stepper current={0} maxVisited={2} onNavigate={onNavigate} />);

    const shipping = screen.getByRole("button", { name: "Ir a Envío" });
    await user.click(shipping);
    expect(onNavigate).toHaveBeenCalledWith(2);
  });

  it("un paso nunca visitado (index > maxVisited) no es navegable", () => {
    render(<Stepper current={0} maxVisited={1} onNavigate={jest.fn()} />);
    expect(screen.queryByRole("button", { name: "Ir a Envío" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ir a Confirmación" })).not.toBeInTheDocument();
  });

  it("en el paso final (Confirmación) ningún paso es navegable, aunque todos se hayan visitado", () => {
    render(<Stepper current={3} maxVisited={3} onNavigate={jest.fn()} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("un paso completado cambia su número por la palomita; uno sin visitar lo conserva", () => {
    // Los tres estados visuales solo se distinguen entre sí por clases de Tailwind
    // (que no se afirman: cambiarían con cualquier retoque de estilo), salvo este
    // — el único con una diferencia observable en el DOM.
    render(<Stepper current={2} maxVisited={2} onNavigate={jest.fn()} />);

    const done = screen.getByRole("button", { name: "Ir a Resumen" });
    expect(done.querySelector("svg")).not.toBeNull();
    expect(done).not.toHaveTextContent("1");
    // 'Confirmación' (index 3) nunca se visitó: sigue mostrando su número.
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("marca 'aria-current=step' solo en el círculo del paso activo", () => {
    render(<Stepper current={1} maxVisited={2} onNavigate={jest.fn()} />);
    const active = document.querySelector('[aria-current="step"]');
    expect(active).not.toBeNull();
    expect(active?.textContent).toBe("2"); // index 1 + 1, sin check (no está done)
  });
});
