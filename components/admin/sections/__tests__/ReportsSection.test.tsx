import { act, screen, waitFor } from "@testing-library/react";
import type { MonthlyReport } from "@/components/admin/data/types";
import ReportsSection from "../ReportsSection";
import { renderWithQueryClient } from "./helpers/render";

// `jest.mock("@/...")` no resuelve — ruta relativa a propósito (ver CLAUDE.md).
jest.mock("../../../../lib/api/reports", () => ({
  ...jest.requireActual("../../../../lib/api/reports"),
  getMonthlyReport: jest.fn(),
  getReplenishmentReport: jest.fn(),
}));

import { getMonthlyReport, getReplenishmentReport } from "@/lib/api/reports";

const mockMonthly = getMonthlyReport as jest.MockedFunction<typeof getMonthlyReport>;
const mockReplenishment = getReplenishmentReport as jest.MockedFunction<
  typeof getReplenishmentReport
>;

// `SalesReport` y `ReplenishmentReport` ya tienen sus suites; lo que decide esta
// sección —y nadie más— es **qué mes se muestra**:
//
//  - Abre en el último mes COMPLETO, no en el parcial: comparar un mes a medias
//    contra uno cerrado hace que todo parezca en caída.
//  - Reconcilia el mes elegido contra los datos: si un refetch en segundo plano
//    cambia el set de meses y el seleccionado ya no existe, cae al de por
//    defecto en vez de dejar la pestaña en blanco.
//  - El selector solo aplica a Ventas; en Reposición se esconde (no se
//    desmonta) porque el forecast no es de un mes en particular.

// Cada mes lleva un producto con costo para que la UTILIDAD no coincida con los
// INGRESOS: con `byProduct` vacío el costo es 0 y las dos tarjetas pintan el
// mismo número, así que una aserción de texto suelto no distinguiría cuál mes se
// está mostrando (la trampa de ambigüedad documentada en expenses/__tests__).
function monthly(overrides: Partial<MonthlyReport>): MonthlyReport {
  const base = {
    key: "2026-07",
    label: "Julio 2026",
    totalRevenue: 10000,
    totalUnits: 8,
    byCategory: [],
    ...overrides,
  };
  return {
    ...base,
    byProduct: overrides.byProduct ?? [
      {
        productId: 1,
        name: "Bota vaquera",
        type: "bota",
        unitsSold: base.totalUnits,
        revenue: base.totalRevenue,
        unitCost: 100,
      },
    ],
  };
}

const TRES_MESES = [
  monthly({ key: "2026-05", label: "Mayo 2026", totalRevenue: 5000 }),
  monthly({ key: "2026-06", label: "Junio 2026", totalRevenue: 8000 }),
  monthly({ key: "2026-07", label: "Julio 2026", totalRevenue: 3000, partial: true }),
];

beforeEach(() => {
  mockMonthly.mockReset();
  mockReplenishment.mockReset();
  mockMonthly.mockResolvedValue(TRES_MESES);
  mockReplenishment.mockResolvedValue([]);
});

describe("ReportsSection", () => {
  it("muestra el estado de carga mientras pide los meses", () => {
    mockMonthly.mockReturnValue(new Promise(() => {}));
    renderWithQueryClient(<ReportsSection />);
    expect(screen.getByText("Cargando reportes…")).toBeInTheDocument();
  });

  it("ante un error ofrece reintentar, y el reintento vuelve a pedir", async () => {
    mockMonthly.mockRejectedValueOnce(new Error("red caída"));
    const { user } = renderWithQueryClient(<ReportsSection />);

    expect(await screen.findByText(/No pudimos cargar los reportes/)).toBeInTheDocument();

    mockMonthly.mockResolvedValue(TRES_MESES);
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("button", { name: /Junio 2026/ })).toBeInTheDocument();
  });

  it("sin ventas registradas lo dice en vez de pintar un reporte vacío", async () => {
    mockMonthly.mockResolvedValue([]);
    renderWithQueryClient(<ReportsSection />);

    expect(
      await screen.findByText("Aún no hay ventas registradas para reportar."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ventas" })).not.toBeInTheDocument();
  });

  // La regla del mes por defecto: el parcial existe en el selector (marcado con
  // asterisco) pero NO es el que se abre.
  it("abre en el último mes completo, no en el mes en curso", async () => {
    renderWithQueryClient(<ReportsSection />);

    const junio = await screen.findByRole("button", { name: /Junio 2026/ });
    expect(junio).toHaveClass("border-amber-400");
    expect(screen.getByRole("button", { name: /Julio 2026/ })).not.toHaveClass(
      "border-amber-400",
    );
    // Y lo que se pinta es junio: su UTILIDAD ($8,000 − $800 de costo) es el
    // único número de la pantalla que no se repite en la tabla de productos.
    expect(screen.getByText("$7,200.00")).toBeInTheDocument();
  });

  it("si todos los meses son parciales cae al último de la lista", async () => {
    mockMonthly.mockResolvedValue([
      monthly({ key: "2026-06", label: "Junio 2026", totalRevenue: 8000, partial: true }),
      monthly({ key: "2026-07", label: "Julio 2026", totalRevenue: 3000, partial: true }),
    ]);
    renderWithQueryClient(<ReportsSection />);

    expect(await screen.findByRole("button", { name: /Julio 2026/ })).toHaveClass(
      "border-amber-400",
    );
  });

  it("elegir otro mes cambia el reporte", async () => {
    const { user } = renderWithQueryClient(<ReportsSection />);
    await screen.findByRole("button", { name: /Junio 2026/ });

    await user.click(screen.getByRole("button", { name: /Mayo 2026/ }));

    expect(screen.getByText("$4,200.00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mayo 2026/ })).toHaveClass(
      "border-amber-400",
    );
  });

  it("un mes parcial elegido a mano lleva su nota de datos incompletos", async () => {
    const { user } = renderWithQueryClient(<ReportsSection />);
    await screen.findByRole("button", { name: /Junio 2026/ });

    expect(screen.queryByText(/es un mes en curso/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Julio 2026/ }));

    expect(
      screen.getByText("Julio 2026 es un mes en curso — los datos son parciales."),
    ).toBeInTheDocument();
  });

  // Sin la reconciliación, un mes que desaparece del backend deja la pestaña en
  // blanco: `reports.find(...)` devuelve `undefined` y `SalesReport` no pinta nada.
  it("si el mes elegido desaparece del backend, cae al mes por defecto", async () => {
    const { user, queryClient } = renderWithQueryClient(<ReportsSection />);
    await screen.findByRole("button", { name: /Junio 2026/ });

    await user.click(screen.getByRole("button", { name: /Mayo 2026/ }));
    expect(screen.getByText("$4,200.00")).toBeInTheDocument();

    // Un refetch de fondo devuelve un set de meses sin mayo.
    mockMonthly.mockResolvedValue([
      monthly({ key: "2026-06", label: "Junio 2026", totalRevenue: 8000 }),
      monthly({ key: "2026-07", label: "Julio 2026", totalRevenue: 3000, partial: true }),
    ]);
    await act(async () => {
      await queryClient.refetchQueries();
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(screen.queryByRole("button", { name: /Mayo 2026/ })).not.toBeInTheDocument();
    expect(screen.getByText("$7,200.00")).toBeInTheDocument();
  });

  // ── Pestañas ──

  it("la pestaña Reposición monta su propia consulta, y solo al abrirla", async () => {
    const { user } = renderWithQueryClient(<ReportsSection />);
    await screen.findByRole("button", { name: /Junio 2026/ });

    expect(mockReplenishment).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Reposición" }));

    await waitFor(() => expect(mockReplenishment).toHaveBeenCalled());
  });

  it("el selector de mes se esconde en Reposición y vuelve en Ventas", async () => {
    const { user } = renderWithQueryClient(<ReportsSection />);
    const junio = await screen.findByRole("button", { name: /Junio 2026/ });
    const selector = junio.parentElement as HTMLElement;

    expect(selector).not.toHaveClass("hidden");

    await user.click(screen.getByRole("button", { name: "Reposición" }));
    expect(selector).toHaveClass("hidden");

    await user.click(screen.getByRole("button", { name: "Ventas" }));
    expect(selector).not.toHaveClass("hidden");
  });

  it("la nota de mes parcial no se pinta en la pestaña Reposición", async () => {
    const { user } = renderWithQueryClient(<ReportsSection />);
    await screen.findByRole("button", { name: /Junio 2026/ });

    await user.click(screen.getByRole("button", { name: /Julio 2026/ }));
    expect(screen.getByText(/es un mes en curso/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reposición" }));
    expect(screen.queryByText(/es un mes en curso/)).not.toBeInTheDocument();
  });
});
