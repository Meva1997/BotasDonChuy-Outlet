import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NavHeader from "../NavHeader";
import { useCartStore } from "@/store/cartStore";
import { makeCartItem } from "./helpers/factories";

// jsdom no aplica media queries: los bloques `hidden md:flex` (desktop) y
// `md:hidden` (móvil) coexisten en el DOM a la vez, así que "Carrito (0)"
// aparece dos veces (mismo patrón documentado en OrdersTable, Fase 6) — las
// aserciones que necesitan un botón concreto se acotan por contenedor.

beforeEach(() => {
  useCartStore.setState({ items: [], isOpen: false });
});

describe("NavHeader", () => {
  it("renderiza los links de categoría desde CATEGORIES", () => {
    render(<NavHeader />);

    expect(screen.getAllByRole("link", { name: "Botas" })[0]).toHaveAttribute(
      "href",
      "/botas"
    );
    expect(
      screen.getAllByRole("link", { name: "Sombreros" })[0]
    ).toHaveAttribute("href", "/sombreros");
    expect(screen.getAllByRole("link", { name: "Ropa" })[0]).toHaveAttribute(
      "href",
      "/ropa"
    );
  });

  it("muestra el conteo real de artículos del carrito", () => {
    useCartStore.setState({
      items: [makeCartItem(), makeCartItem({ id: "2-27", size: 27 })],
    });
    render(<NavHeader />);

    expect(screen.getAllByRole("button", { name: "Carrito (2)" }).length).toBeGreaterThan(0);
  });

  it("el botón de carrito de escritorio abre el carrito", async () => {
    const user = userEvent.setup();
    render(<NavHeader />);

    await user.click(screen.getAllByRole("button", { name: "Carrito (0)" })[0]);
    expect(useCartStore.getState().isOpen).toBe(true);
  });

  it("el menú móvil inicia cerrado y la hamburguesa lo abre", async () => {
    const user = userEvent.setup();
    render(<NavHeader />);

    const toggle = screen.getByRole("button", { name: "Abrir menú" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: "Menú móvil" })).not.toBeInTheDocument();

    await user.click(toggle);

    expect(screen.getByRole("button", { name: "Cerrar menú" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByRole("navigation", { name: "Menú móvil" })).toBeInTheDocument();
  });

  it("hacer clic en un link del menú móvil lo cierra", async () => {
    const user = userEvent.setup();
    render(<NavHeader />);

    await user.click(screen.getByRole("button", { name: "Abrir menú" }));
    const mobileNav = screen.getByRole("navigation", { name: "Menú móvil" });
    await user.click(within(mobileNav).getByRole("link", { name: "Botas" }));

    await waitFor(() =>
      expect(screen.queryByRole("navigation", { name: "Menú móvil" })).not.toBeInTheDocument()
    );
  });

  it("el botón de carrito del menú móvil abre el carrito y cierra el menú", async () => {
    const user = userEvent.setup();
    const { container } = render(<NavHeader />);

    await user.click(screen.getByRole("button", { name: "Abrir menú" }));
    // El bloque de acciones del menú móvil vive fuera del <nav>, en su propio
    // div hermano — se acota por ese contenedor (mismo criterio que el <nav>).
    const mobileActions = container.querySelector("#mobile-nav .px-8.pb-6")!;
    await user.click(within(mobileActions as HTMLElement).getByRole("button", { name: "Carrito (0)" }));

    expect(useCartStore.getState().isOpen).toBe(true);
    await waitFor(() =>
      expect(screen.queryByRole("navigation", { name: "Menú móvil" })).not.toBeInTheDocument()
    );
  });

  it("hacer clic fuera del header cierra el menú móvil abierto", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <NavHeader />
        <button type="button">Fuera</button>
      </div>
    );

    await user.click(screen.getByRole("button", { name: "Abrir menú" }));
    expect(screen.getByRole("navigation", { name: "Menú móvil" })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("button", { name: "Fuera" }));

    await waitFor(() =>
      expect(screen.queryByRole("navigation", { name: "Menú móvil" })).not.toBeInTheDocument()
    );
  });

  it("hacer clic dentro del header no cierra el menú móvil", async () => {
    const user = userEvent.setup();
    render(<NavHeader />);

    await user.click(screen.getByRole("button", { name: "Abrir menú" }));
    fireEvent.mouseDown(screen.getAllByRole("link", { name: "Botas" })[0]);

    expect(screen.getByRole("navigation", { name: "Menú móvil" })).toBeInTheDocument();
  });
});
