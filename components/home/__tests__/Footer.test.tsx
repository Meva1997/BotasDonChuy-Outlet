import { render, screen, within } from "@testing-library/react";
import Footer from "../Footer";

describe("Footer", () => {
  it("renderiza las tres secciones con sus links", () => {
    render(<Footer />);

    const tienda = screen.getByRole("region", { name: "Tienda" });
    expect(within(tienda).getByRole("link", { name: "Botas" })).toHaveAttribute(
      "href",
      "/botas"
    );
    expect(within(tienda).getByRole("link", { name: "Sombreros" })).toHaveAttribute(
      "href",
      "/sombreros"
    );
    expect(within(tienda).getByRole("link", { name: "Ropa" })).toHaveAttribute(
      "href",
      "/ropa"
    );

    const info = screen.getByRole("region", { name: "Información" });
    expect(within(info).getByRole("link", { name: "Sobre nosotros" })).toHaveAttribute(
      "href",
      "/nosotros"
    );
    expect(
      within(info).getByRole("link", { name: "Seguimiento de pedido" })
    ).toHaveAttribute("href", "/pedido");
    expect(
      within(info).getByRole("link", { name: "Términos y condiciones" })
    ).toHaveAttribute("href", "/terminos");
    expect(
      within(info).getByRole("link", { name: "Política de privacidad" })
    ).toHaveAttribute("href", "/privacidad");
    expect(within(info).getByRole("link", { name: "Envíos" })).toHaveAttribute(
      "href",
      "/envios"
    );
  });

  it("la sección Contacto usa el instagram de la marca y abre en una pestaña nueva", () => {
    render(<Footer />);

    const contacto = screen.getByRole("region", { name: "Contacto" });
    const link = within(contacto).getByRole("link", { name: "Instagram" });
    expect(link).toHaveAttribute("href", "https://www.instagram.com/botasdonchuy/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("los links que no son Instagram no abren en pestaña nueva", () => {
    render(<Footer />);

    const link = screen.getByRole("link", { name: "Sobre nosotros" });
    expect(link).not.toHaveAttribute("target");
    expect(link).not.toHaveAttribute("rel");
  });

  it("muestra la marca, el copyright con el año actual y el link de acceso admin", () => {
    render(<Footer />);

    expect(screen.getByText("Botas Don Chuy")).toBeInTheDocument();
    expect(screen.getByText("Outlet", { selector: "span.italic" })).toBeInTheDocument();
    expect(
      screen.getByText(`© ${new Date().getFullYear()} Botas Don Chuy Outlet. Todos los derechos reservados.`)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Acceso administrador" })).toHaveAttribute(
      "href",
      "/admin"
    );
  });
});
