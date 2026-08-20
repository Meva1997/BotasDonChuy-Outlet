import { render, screen } from "@testing-library/react";
import NewProducts from "../NewProducts";
import { LEGAL_ENTITY } from "@/components/legal/entity";

// NEW_ARRIVALS es un arreglo estático dentro de NewProducts.tsx (no exportado): no
// hay backend para "nuevo en tienda física". Estos títulos/descripciones están
// hardcodeados a propósito para reflejar ese contenido — si cambia el contenido
// real, este test debe actualizarse junto con él.
const ITEMS = [
  {
    name: "Botas Cuadra piel de avestruz",
    description: "Punta cuadrada, horma cómoda. Negro y miel, tallas 25–29.",
    // primer <path> de BootIcon
    iconPathD:
      "M6 2v9.5c0 1-.4 1.6-1.2 2.4L3 15.7c-.6.6-1 1.4-1 2.3V21h13v-3.2c0-1-.4-1.9-1.1-2.6L11 12.3V2",
  },
  {
    name: "Sombrero de fieltro ala ancha",
    description:
      "Copa alta estilo texano, banda de piel. Ideal para el sol de temporada.",
    // primer <path> de HatIcon
    iconPathD: "M2.5 16.5c1.5-1 5.5-2 9.5-2s8 1 9.5 2",
  },
  {
    name: "Chamarra vaquera de piel",
    description:
      "Piel genuina forrada, corte clásico. Tallas chica a extra grande.",
    // primer <path> de JacketIcon
    iconPathD: "M8 4L4 6.5V21h5V11l3 2.5 3-2.5v10h5V6.5L16 4l-4 2.5z",
  },
];

describe("NewProducts", () => {
  it("renderiza el encabezado y la descripción de la sección", () => {
    render(<NewProducts />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /recién llegado a la tienda/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/acaban de llegar a nuestra sucursal de celaya/i)
    ).toBeInTheDocument();
  });

  it("renderiza las 3 piezas con su nombre y descripción", () => {
    render(<NewProducts />);

    for (const item of ITEMS) {
      expect(
        screen.getByRole("heading", { level: 3, name: item.name })
      ).toBeInTheDocument();
      expect(screen.getByText(item.description)).toBeInTheDocument();
    }
  });

  it("renderiza exactamente 3 tarjetas (no se pierde ni se duplica ninguna pieza)", () => {
    render(<NewProducts />);

    expect(screen.getAllByRole("article")).toHaveLength(3);
  });

  it("muestra el badge 'Nuevo' y 'Solo en tienda' en cada una de las 3 tarjetas", () => {
    render(<NewProducts />);

    expect(screen.getAllByText("Nuevo")).toHaveLength(3);
    expect(screen.getAllByText("Solo en tienda")).toHaveLength(3);
  });

  it("sin imageSrc en ninguna pieza, no renderiza ninguna foto real (usa el ícono de respaldo)", () => {
    render(<NewProducts />);

    // Ninguna pieza en NEW_ARRIVALS trae `imageSrc` todavía, así que las 3
    // tarjetas deben caer en la rama del ícono — next/image nunca se monta.
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  it("usa el ícono de categoría correcto para cada pieza (bota, sombrero, ropa)", () => {
    render(<NewProducts />);

    for (const item of ITEMS) {
      const card = screen
        .getByRole("heading", { level: 3, name: item.name })
        .closest("article");
      expect(card).not.toBeNull();
      const firstPath = card!.querySelector("svg path");
      expect(firstPath).toHaveAttribute("d", item.iconPathD);
    }
  });

  it("enlaza 'Cómo llegar' a /nosotros#ubicacion", () => {
    render(<NewProducts />);

    expect(screen.getByRole("link", { name: "Cómo llegar" })).toHaveAttribute(
      "href",
      "/nosotros#ubicacion"
    );
  });

  it("muestra la dirección de la tienda física desde LEGAL_ENTITY (fuente única)", () => {
    render(<NewProducts />);

    expect(screen.getByText("Visítanos en tienda")).toBeInTheDocument();
    expect(screen.getByText(LEGAL_ENTITY.address)).toBeInTheDocument();
  });
});
