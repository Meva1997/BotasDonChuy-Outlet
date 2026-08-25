import { render, screen } from "@testing-library/react";
import NewProducts, { NewArrivalCard } from "../NewProducts";
import { LEGAL_ENTITY } from "@/components/legal/entity";

// NEW_ARRIVALS es un arreglo estático dentro de NewProducts.tsx (no exportado):
// no hay backend para "nuevo en tienda física". Hoy está VACÍO, que es un estado
// normal y no un error — por eso la sección se prueba en ese estado, y la tarjeta
// se monta aparte con piezas de prueba (es la única forma de cubrirla mientras el
// arreglo siga vacío). Si algún día se anuncian llegadas reales, agrega aquí un
// bloque que las liste; no borres el del estado vacío: la sección va a volver a él.
describe("NewProducts (sin llegadas que anunciar)", () => {
  it("renderiza el encabezado de la sección", () => {
    render(<NewProducts />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /recién llegado a la tienda/i,
      })
    ).toBeInTheDocument();
  });

  it("explica que no hay llegadas nuevas en vez de afirmar que sí las hay", () => {
    render(<NewProducts />);

    expect(
      screen.getByText(/por ahora no tenemos llegadas nuevas que anunciar/i)
    ).toBeInTheDocument();
    // El texto del estado con piezas afirma que "acaban de llegar": mostrarlo
    // sobre una sección vacía sería una promesa falsa.
    expect(
      screen.queryByText(/acaban de llegar a nuestra sucursal/i)
    ).not.toBeInTheDocument();
  });

  it("no renderiza ninguna tarjeta", () => {
    render(<NewProducts />);

    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(screen.queryByText("Nuevo")).not.toBeInTheDocument();
    expect(screen.queryByText("Solo en tienda")).not.toBeInTheDocument();
  });

  it("invita a ver el outlet en línea con enlace a /outlet", () => {
    render(<NewProducts />);

    expect(screen.getByText(/todavía no hay llegadas nuevas/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver el outlet" })).toHaveAttribute(
      "href",
      "/outlet"
    );
  });

  it("sigue mostrando el bloque de la tienda física aunque no haya llegadas", () => {
    render(<NewProducts />);

    expect(screen.getByText("Visítanos en tienda")).toBeInTheDocument();
    // Dirección desde LEGAL_ENTITY (fuente única).
    expect(screen.getByText(LEGAL_ENTITY.address)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cómo llegar" })).toHaveAttribute(
      "href",
      "/nosotros#ubicacion"
    );
  });
});

// Primer <path> de cada ícono de categoría, para distinguirlos sin depender del
// nombre del componente.
const ICON_PATH_D = {
  bota: "M6 2v9.5c0 1-.4 1.6-1.2 2.4L3 15.7c-.6.6-1 1.4-1 2.3V21h13v-3.2c0-1-.4-1.9-1.1-2.6L11 12.3V2",
  sombrero: "M2.5 16.5c1.5-1 5.5-2 9.5-2s8 1 9.5 2",
  ropa: "M8 4L4 6.5V21h5V11l3 2.5 3-2.5v10h5V6.5L16 4l-4 2.5z",
} as const;

describe("NewArrivalCard", () => {
  it("renderiza nombre, descripción y los sellos 'Nuevo' / 'Solo en tienda'", () => {
    render(
      <NewArrivalCard
        item={{
          id: "botas-avestruz",
          category: "bota",
          name: "Botas Cuadra piel de avestruz",
          description: "Punta cuadrada, horma cómoda.",
        }}
      />
    );

    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Botas Cuadra piel de avestruz",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("Punta cuadrada, horma cómoda.")).toBeInTheDocument();
    expect(screen.getByText("Nuevo")).toBeInTheDocument();
    expect(screen.getByText("Solo en tienda")).toBeInTheDocument();
  });

  it.each(["bota", "sombrero", "ropa"] as const)(
    "sin imageSrc usa el ícono de respaldo de su categoría (%s)",
    (category) => {
      render(
        <NewArrivalCard
          item={{
            id: `pieza-${category}`,
            category,
            name: `Pieza ${category}`,
            description: "Descripción.",
          }}
        />
      );

      // Sin foto no se monta next/image en absoluto.
      expect(screen.queryAllByRole("img")).toHaveLength(0);
      const card = screen.getByRole("article");
      expect(card.querySelector("svg path")).toHaveAttribute(
        "d",
        ICON_PATH_D[category]
      );
    }
  );

  it("con imageSrc muestra la foto real en lugar del ícono", () => {
    render(
      <NewArrivalCard
        item={{
          id: "sombrero-fieltro",
          category: "sombrero",
          name: "Sombrero de fieltro ala ancha",
          description: "Copa alta estilo texano.",
          imageSrc: "/sombrero.jpg",
        }}
      />
    );

    expect(
      screen.getByRole("img", { name: "Sombrero de fieltro ala ancha" })
    ).toBeInTheDocument();
    expect(screen.getByRole("article").querySelector("svg")).toBeNull();
  });
});
