import { cloneElement, type ReactElement } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RevenueChart from "../RevenueChart";
import { makeRevenuePoints } from "./helpers/factories";

// `ResponsiveContainer` mide su contenedor con ResizeObserver, y en jsdom todo
// mide 0×0: sin este mock recharts no pinta ni un eje, y el gráfico entero
// (incluido `formatY`, el formateador de los ticks del eje Y) queda fuera de
// alcance — es exactamente el hueco que `ExpenseHistory.test.tsx` dejó
// documentado. Pasarle dimensiones fijas al hijo lo vuelve testeable sin tocar
// el fuente.
jest.mock("recharts", () => {
  const actual = jest.requireActual("recharts");
  return {
    ...actual,
    // `cloneElement` no puede tipar las props del hijo (el mock recibe un
    // `ReactElement` genérico), de ahí el cast.
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children as ReactElement<{ width: number; height: number }>, {
        width: 800,
        height: 260,
      }),
  };
});

const dataByPeriod = {
  "7": makeRevenuePoints(3, "jul"),
  "30": makeRevenuePoints(4, "ago"),
  "90": makeRevenuePoints(5, "sep"),
};

function chart() {
  // El SVG de recharts es la única `img` implícita del componente.
  return within(document.querySelector(".recharts-wrapper") as HTMLElement);
}

describe("RevenueChart", () => {
  it("abre en 30 días, el periodo por defecto", () => {
    render(<RevenueChart dataByPeriod={dataByPeriod} />);

    const button = screen.getByRole("button", { name: "30 días" });
    expect(button).toHaveClass("border-amber-400");
    expect(screen.getByRole("button", { name: "7 días" })).not.toHaveClass(
      "border-amber-400",
    );
  });

  it("pinta las fechas del periodo activo en el eje X", () => {
    render(<RevenueChart dataByPeriod={dataByPeriod} />);
    // El periodo por defecto (30) trae los puntos "ago".
    expect(chart().getByText("1 ago")).toBeInTheDocument();
    expect(chart().queryByText("1 jul")).not.toBeInTheDocument();
  });

  it("cambiar de periodo repinta el gráfico con la otra serie", async () => {
    const user = userEvent.setup();
    render(<RevenueChart dataByPeriod={dataByPeriod} />);

    await user.click(screen.getByRole("button", { name: "7 días" }));

    expect(chart().getByText("1 jul")).toBeInTheDocument();
    expect(chart().queryByText("1 ago")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "7 días" })).toHaveClass(
      "border-amber-400",
    );
  });

  it("los tres periodos son alcanzables, incluido el de 90 días", async () => {
    const user = userEvent.setup();
    render(<RevenueChart dataByPeriod={dataByPeriod} />);

    await user.click(screen.getByRole("button", { name: "90 días" }));
    expect(chart().getByText("5 sep")).toBeInTheDocument();
  });

  // `formatY` abrevia en miles a partir de $1,000 y deja el número crudo por
  // debajo: son sus dos ramas, y ambas se leen en el mismo eje.
  it("el eje Y abrevia los miles y deja el resto sin abreviar", () => {
    render(
      <RevenueChart
        dataByPeriod={{
          ...dataByPeriod,
          "30": [
            { date: "1 ago", revenue: 0 },
            { date: "2 ago", revenue: 2000 },
          ],
        }}
      />,
    );

    expect(chart().getByText("$0")).toBeInTheDocument();
    expect(chart().getByText("$2.0k")).toBeInTheDocument();
  });

  // El tooltip se monta, pero vacío y oculto: recharts 3 decide el punto activo
  // en un pipeline de eventos punteros que jsdom no reproduce (ni `mouseMove` ni
  // `pointerMove`, con o sin `getBoundingClientRect` parchado, lo activan). Su
  // `formatter` queda como hueco aceptado — ver el README de esta carpeta.
  it("monta el tooltip aunque en jsdom nunca llegue a activarse", () => {
    render(<RevenueChart dataByPeriod={dataByPeriod} />);
    expect(document.querySelector(".recharts-tooltip-wrapper")).toBeInTheDocument();
  });

  it("un periodo sin ventas no revienta el gráfico", () => {
    render(
      <RevenueChart dataByPeriod={{ ...dataByPeriod, "30": [] }} />,
    );
    expect(screen.getByText("Ventas diarias")).toBeInTheDocument();
  });
});
