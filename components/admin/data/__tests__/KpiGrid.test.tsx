import { render, screen } from "@testing-library/react";
import KpiGrid from "../KpiGrid";
import { makeKpi } from "./helpers/factories";

// KpiGrid no sabe nada de negocio: pinta lo que `dashboard.ts` ya calculó, y el
// SIGNO de la tendencia (▲ verde / ▼ rojo) sale de `trend.positive`, no del
// número. Eso importa por el KPI "COSTO DE ENVÍO", cuyo `positive` viene
// INVERTIDO a propósito desde el backend (positive: true = el costo BAJÓ). Si
// alguien "arreglara" KpiCard para deducir el color del texto de la etiqueta, un
// envío más caro se pintaría en verde.

describe("KpiGrid", () => {
  it("pinta una tarjeta por KPI con su label y su valor", () => {
    render(
      <KpiGrid
        kpis={[
          makeKpi({ label: "INGRESOS", value: "$12,500.00" }),
          makeKpi({ label: "PEDIDOS", value: "8" }),
        ]}
      />,
    );

    expect(screen.getByText("INGRESOS")).toBeInTheDocument();
    expect(screen.getByText("$12,500.00")).toBeInTheDocument();
    expect(screen.getByText("PEDIDOS")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("no pinta ninguna tarjeta con una lista vacía de KPIs", () => {
    const { container } = render(<KpiGrid kpis={[]} />);
    expect(container.firstElementChild?.childElementCount).toBe(0);
  });

  it("omite la línea de tendencia cuando el KPI no trae `trend`", () => {
    render(<KpiGrid kpis={[makeKpi({ trend: undefined })]} />);
    expect(screen.queryByText(/▲|▼/)).not.toBeInTheDocument();
  });

  it("omite el subtítulo cuando el KPI no trae `subtitle`", () => {
    render(<KpiGrid kpis={[makeKpi({ subtitle: undefined })]} />);
    // El único texto de la tarjeta son label y valor.
    expect(screen.getByText("INGRESOS").parentElement?.childElementCount).toBe(2);
  });

  it("pinta el subtítulo cuando el KPI lo trae", () => {
    render(<KpiGrid kpis={[makeKpi({ subtitle: "vs. periodo anterior" })]} />);
    expect(screen.getByText("vs. periodo anterior")).toBeInTheDocument();
  });

  it("una tendencia positiva se pinta con ▲ en verde", () => {
    render(
      <KpiGrid
        kpis={[makeKpi({ trend: { label: "12% más que antes", positive: true } })]}
      />,
    );

    const trend = screen.getByText(/12% más que antes/);
    expect(trend).toHaveTextContent("▲");
    expect(trend).toHaveClass("text-emerald-400");
  });

  it("una tendencia negativa se pinta con ▼ en rojo", () => {
    render(
      <KpiGrid
        kpis={[makeKpi({ trend: { label: "9% menos que antes", positive: false } })]}
      />,
    );

    const trend = screen.getByText(/9% menos que antes/);
    expect(trend).toHaveTextContent("▼");
    expect(trend).toHaveClass("text-red-400");
  });

  // La razón de ser de la inversión: el backend manda `positive: true` cuando el
  // costo de envío BAJÓ. KpiCard debe obedecer esa bandera y no el sentido
  // literal de "el número subió".
  it("COSTO DE ENVÍO lee el signo de `positive`, no del número: un costo a la baja va en verde", () => {
    render(
      <KpiGrid
        kpis={[
          makeKpi({
            label: "COSTO DE ENVÍO",
            value: "$1,280.00",
            trend: { label: "15% menos de envío", positive: true },
          }),
        ]}
      />,
    );

    const trend = screen.getByText(/15% menos de envío/);
    expect(trend).toHaveClass("text-emerald-400");
    expect(trend).not.toHaveClass("text-red-400");
  });

  it("COSTO DE ENVÍO al alza va en rojo aunque el número haya crecido", () => {
    render(
      <KpiGrid
        kpis={[
          makeKpi({
            label: "COSTO DE ENVÍO",
            value: "$2,400.00",
            trend: { label: "22% más de envío", positive: false },
          }),
        ]}
      />,
    );

    expect(screen.getByText(/22% más de envío/)).toHaveClass("text-red-400");
  });
});
