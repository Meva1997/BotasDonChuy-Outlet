import { screen, within } from "@testing-library/react";
import type { DashboardData } from "@/components/admin/data/types";
import DataSection from "../DataSection";
import { renderWithQueryClient } from "./helpers/render";

// `jest.mock("@/...")` no resuelve — ruta relativa a propósito (ver CLAUDE.md).
jest.mock("../../../../lib/api/dashboard", () => ({
  ...jest.requireActual("../../../../lib/api/dashboard"),
  getAdminDashboard: jest.fn(),
}));

import { getAdminDashboard } from "@/lib/api/dashboard";

const mockDashboard = getAdminDashboard as jest.MockedFunction<typeof getAdminDashboard>;

// Los cuatro componentes de `data/` ya tienen sus suites; lo único que decide
// esta sección es **qué ventana de tiempo se está mirando**, y ese dato viaja
// por dos caminos que tienen que coincidir: el texto del encabezado ("últimos N
// días") y el índice con el que se leen `kpisByPeriod`/`profitKpisByPeriod`.
// Si se desincronizaran, el panel diría "30 días" sobre los números de 7 — el
// tipo de error que nadie nota hasta que toma una decisión con él.

function dashboard(): DashboardData {
  const kpis = (periodo: string) => [
    { label: "INGRESOS", value: `Ingresos de ${periodo}` },
  ];
  const profit = (periodo: string) => [
    { label: "GANANCIA BRUTA", value: `Ganancia de ${periodo}` },
  ];
  return {
    kpisByPeriod: { "7": kpis("7d"), "30": kpis("30d"), "90": kpis("90d") },
    profitKpisByPeriod: { "7": profit("7d"), "30": profit("30d"), "90": profit("90d") },
    revenueByPeriod: {
      "7": [{ date: "1 jul", revenue: 100 }],
      "30": [{ date: "1 ago", revenue: 200 }],
      "90": [{ date: "1 sep", revenue: 300 }],
    },
    recentSales: [],
    inventory: [],
  };
}

/**
 * El selector de periodo de la SECCIÓN. `RevenueChart` pinta tres botones con
 * exactamente las mismas etiquetas para su propio eje temporal, y los dos son
 * independientes a propósito: el gráfico recibe las tres series y elige la suya
 * sin consultar a la sección. Sin acotar, `getByRole` encuentra los dos.
 *
 * Se acota por el `role="group"` con nombre del contenedor, no por su clase de
 * Tailwind: la clase es presentación y cambia sin avisar (misma razón por la que
 * este proyecto no usa snapshots), el nombre accesible es contrato.
 */
function periodButton(label: string) {
  const selector = screen.getByRole("group", { name: "Periodo de las métricas" });
  return within(selector).getByRole("button", { name: label });
}

beforeEach(() => {
  mockDashboard.mockReset();
  mockDashboard.mockResolvedValue(dashboard());
});

describe("DataSection", () => {
  it("muestra el estado de carga mientras pide las métricas", () => {
    mockDashboard.mockReturnValue(new Promise(() => {}));
    renderWithQueryClient(<DataSection />);

    expect(screen.getByText("Cargando métricas…")).toBeInTheDocument();
    // Sin datos no se ofrece el selector de periodo: no habría qué cambiar.
    expect(screen.queryByRole("button", { name: "7 días" })).not.toBeInTheDocument();
  });

  it("ante un error ofrece reintentar, y el reintento vuelve a pedir", async () => {
    mockDashboard.mockRejectedValueOnce(new Error("red caída"));
    const { user } = renderWithQueryClient(<DataSection />);

    expect(await screen.findByText(/No pudimos cargar las métricas/)).toBeInTheDocument();

    mockDashboard.mockResolvedValue(dashboard());
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Ingresos de 30d")).toBeInTheDocument();
  });

  it("abre en 30 días y lee ese índice en las dos rejillas de KPIs", async () => {
    renderWithQueryClient(<DataSection />);

    expect(await screen.findByText("Ingresos de 30d")).toBeInTheDocument();
    expect(screen.getByText("Ganancia de 30d")).toBeInTheDocument();
    expect(screen.queryByText("Ingresos de 7d")).not.toBeInTheDocument();
  });

  // La invariante: el rótulo y los números salen del MISMO periodo.
  it("cambiar de periodo mueve el rótulo y los KPIs a la vez", async () => {
    const { user } = renderWithQueryClient(<DataSection />);
    await screen.findByText("Ingresos de 30d");

    await user.click(periodButton("7 días"));

    expect(screen.getByText("Ingresos de 7d")).toBeInTheDocument();
    expect(screen.getByText("Ganancia de 7d")).toBeInTheDocument();
    expect(
      screen.getByText("últimos 7 días · compras reales del carrito"),
    ).toBeInTheDocument();
    expect(screen.getByText("Ventas · últimos 7 días")).toBeInTheDocument();
    expect(screen.getByText("Rentabilidad · últimos 7 días")).toBeInTheDocument();
  });

  it("el periodo de 90 días también es alcanzable", async () => {
    const { user } = renderWithQueryClient(<DataSection />);
    await screen.findByText("Ingresos de 30d");

    await user.click(periodButton("90 días"));

    expect(screen.getByText("Ingresos de 90d")).toBeInTheDocument();
    expect(screen.getByText("Ganancia de 90d")).toBeInTheDocument();
  });

  it("marca como activo solo el periodo elegido", async () => {
    const { user } = renderWithQueryClient(<DataSection />);
    await screen.findByText("Ingresos de 30d");

    await user.click(periodButton("7 días"));

    expect(periodButton("7 días")).toHaveClass("border-amber-400");
    expect(periodButton("30 días")).not.toHaveClass("border-amber-400");
  });

  // Los cuatro componentes de `data/` reciben sus datos como props; lo único que
  // esta sección tiene que garantizar es que se monten con lo que trajo la query.
  it("monta la tabla de ventas y el inventario con los datos del backend", async () => {
    renderWithQueryClient(<DataSection />);
    await screen.findByText("Ingresos de 30d");

    expect(screen.getByText("Últimas ventas del carrito")).toBeInTheDocument();
    expect(screen.getByText("Inventario disponible")).toBeInTheDocument();
    expect(
      within(screen.getByText("Últimas ventas del carrito").parentElement as HTMLElement)
        .getByText("Sin ventas registradas"),
    ).toBeInTheDocument();
  });
});
