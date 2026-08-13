import { screen, waitFor, within } from "@testing-library/react";
import type { ReplenishmentRow } from "@/components/admin/data/types";
import ReplenishmentReport from "../ReplenishmentReport";
import { captureDownload } from "./helpers/download";
import { makeMonthlyReport, makeReplenishmentRow } from "./helpers/factories";
import { renderWithQueryClient } from "./helpers/render";

// `jest.mock("@/...")` no resuelve — ruta relativa a propósito (ver CLAUDE.md).
jest.mock("../../../../lib/api/reports", () => ({
  ...jest.requireActual("../../../../lib/api/reports"),
  getReplenishmentReport: jest.fn(),
}));

import { getReplenishmentReport } from "@/lib/api/reports";

const mockGetReplenishment = getReplenishmentReport as jest.MockedFunction<
  typeof getReplenishmentReport
>;

// ReplenishmentReport es la única pestaña de reportes que monta su propia query
// (lazy, al abrir la pestaña). Todo el forecast lo calcula el backend; lo que se
// decide aquí es cómo se LEE:
//
//  - Una cobertura de 999 días no significa "tres años de inventario" sino "no
//    se vende": se pinta "—" en pantalla y "sin ventas" en el CSV, nunca 999.
//  - Un cero (margen, sugerido, costo) también se pinta "—": un "$0.00" en la
//    columna de inversión sugerida se lee como "sale gratis reponerlo".
//  - El banner de método sale del PRIMER renglón, porque todos comparten el
//    mismo historial de meses; sin renglones cae al nivel más conservador.

function renderReport(reports = [makeMonthlyReport()]) {
  return renderWithQueryClient(<ReplenishmentReport reports={reports} />);
}

/** Espera a que la query resuelva y devuelva la tabla ya pintada. */
async function tableBody() {
  const table = await screen.findByRole("table");
  return within(table.querySelector("tbody") as HTMLElement);
}

beforeEach(() => {
  mockGetReplenishment.mockReset();
  mockGetReplenishment.mockResolvedValue([makeReplenishmentRow()]);
});

describe("ReplenishmentReport", () => {
  it("muestra el estado de carga mientras la query está en vuelo", () => {
    mockGetReplenishment.mockReturnValue(new Promise(() => {}));
    renderReport();
    expect(screen.getByText("Cargando reposición…")).toBeInTheDocument();
  });

  it("ante un error ofrece reintentar, y el reintento vuelve a pedir los datos", async () => {
    mockGetReplenishment.mockRejectedValueOnce(new Error("red caída"));
    const { user } = renderReport();

    expect(
      await screen.findByText(/No pudimos cargar la reposición/),
    ).toBeInTheDocument();

    mockGetReplenishment.mockResolvedValue([makeReplenishmentRow()]);
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("table")).toBeInTheDocument();
  });

  it("pinta cada producto con su forecast, stock, cobertura y margen", async () => {
    mockGetReplenishment.mockResolvedValue([
      makeReplenishmentRow({
        name: "Bota vaquera",
        type: "bota",
        currentStock: 12,
        forecastNextMonth: 6,
        diasCobertura: 60,
        margenMensual: 2400,
      }),
    ]);
    renderReport();

    const body = await tableBody();
    expect(body.getByText("Bota vaquera")).toBeInTheDocument();
    expect(body.getByText("Bota")).toBeInTheDocument();
    expect(body.getByText("12")).toBeInTheDocument();
    expect(body.getByText("6")).toBeInTheDocument();
    expect(body.getByText("60d")).toBeInTheDocument();
    expect(body.getByText("$2,400.00")).toBeInTheDocument();
  });

  // ── Los "—" que evitan leer un cero como un dato ──

  it("una cobertura de 999 días se pinta «—», no el número centinela", async () => {
    mockGetReplenishment.mockResolvedValue([
      makeReplenishmentRow({ diasCobertura: 999 }),
    ]);
    renderReport();

    const body = await tableBody();
    expect(body.queryByText("999d")).not.toBeInTheDocument();
    expect(body.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("margen, sugerido y costo en cero se pintan «—» y nunca «$0.00»", async () => {
    mockGetReplenishment.mockResolvedValue([
      makeReplenishmentRow({
        margenMensual: 0,
        suggestedOrder: 0,
        costoEstimadoPedido: 0,
      }),
    ]);
    renderReport();

    const body = await tableBody();
    expect(body.queryByText("$0.00")).not.toBeInTheDocument();
    expect(body.queryByText("0")).not.toBeInTheDocument();
    // Los tres guiones de la fila (margen, comprar, costo).
    expect(body.getAllByText("—")).toHaveLength(3);
  });

  it("con valores positivos pinta los números, no guiones", async () => {
    mockGetReplenishment.mockResolvedValue([
      makeReplenishmentRow({
        margenMensual: 2400,
        suggestedOrder: 4,
        costoEstimadoPedido: 2000,
      }),
    ]);
    renderReport();

    const body = await tableBody();
    expect(body.getByText("4")).toBeInTheDocument();
    expect(body.getByText("$2,400.00")).toBeInTheDocument();
    expect(body.getByText("$2,000.00")).toBeInTheDocument();
  });

  // ── Urgencia ──

  it("los tres colores de cobertura corresponden a los tres tramos", async () => {
    mockGetReplenishment.mockResolvedValue([
      makeReplenishmentRow({ productId: 1, name: "Crítica", diasCobertura: 10, priority: "urgente" }),
      makeReplenishmentRow({ productId: 2, name: "Media", diasCobertura: 30, priority: "pronto" }),
      makeReplenishmentRow({ productId: 3, name: "Holgada", diasCobertura: 90, priority: "ok" }),
    ]);
    renderReport();

    const body = await tableBody();
    expect(body.getByText("10d")).toHaveClass("text-red-400");
    expect(body.getByText("30d")).toHaveClass("text-amber-400");
    expect(body.getByText("90d")).toHaveClass("text-emerald-400");
  });

  it("pinta las tres etiquetas de prioridad", async () => {
    mockGetReplenishment.mockResolvedValue([
      makeReplenishmentRow({ productId: 1, priority: "urgente" }),
      makeReplenishmentRow({ productId: 2, priority: "pronto" }),
      makeReplenishmentRow({ productId: 3, priority: "ok" }),
    ]);
    renderReport();

    const body = await tableBody();
    expect(body.getByText("Urgente")).toBeInTheDocument();
    expect(body.getByText("Pronto")).toBeInTheDocument();
    expect(body.getByText("OK")).toBeInTheDocument();
  });

  it("cuenta los productos con cobertura crítica, en plural", async () => {
    mockGetReplenishment.mockResolvedValue([
      makeReplenishmentRow({ productId: 1, priority: "urgente" }),
      makeReplenishmentRow({ productId: 2, priority: "urgente" }),
      makeReplenishmentRow({ productId: 3, priority: "ok" }),
    ]);
    renderReport();

    expect(await screen.findByText("2")).toBeInTheDocument();
    expect(screen.getByText("productos · menos de 15 días")).toBeInTheDocument();
  });

  it("con un solo producto crítico el aviso va en singular", async () => {
    mockGetReplenishment.mockResolvedValue([
      makeReplenishmentRow({ productId: 1, priority: "urgente" }),
    ]);
    renderReport();

    expect(await screen.findByText("producto · menos de 15 días")).toBeInTheDocument();
  });

  it("suma la inversión sugerida de todos los renglones", async () => {
    mockGetReplenishment.mockResolvedValue([
      makeReplenishmentRow({ productId: 1, suggestedOrder: 4, costoEstimadoPedido: 2000 }),
      makeReplenishmentRow({ productId: 2, suggestedOrder: 3, costoEstimadoPedido: 1500 }),
    ]);
    renderReport();

    // Aparece dos veces: en la tarjeta de resumen y en el pie de la tabla.
    await waitFor(() =>
      expect(screen.getAllByText("$3,500.00")).toHaveLength(2),
    );
    expect(screen.getByText("7 pzas")).toBeInTheDocument();
  });

  // ── Iconos de tendencia ──

  it("pinta el icono de cada tendencia conocida", async () => {
    mockGetReplenishment.mockResolvedValue([
      makeReplenishmentRow({ productId: 1, trend: "creciendo" }),
      makeReplenishmentRow({ productId: 2, trend: "estable" }),
      makeReplenishmentRow({ productId: 3, trend: "bajando" }),
    ]);
    renderReport();

    const body = await tableBody();
    expect(body.getByText("↑")).toHaveClass("text-emerald-400");
    expect(body.getByText("→")).toHaveClass("text-amber-100/40");
    expect(body.getByText("↓")).toHaveClass("text-red-400");
  });

  // El cast es deliberado: `trend` está acotado por Zod al enum de tres valores,
  // así que este fallback solo puede dispararse si el backend agrega un cuarto.
  // Es código defensivo, y probarlo evita que un valor nuevo pinte una celda en
  // blanco en vez de la flecha neutra.
  it("una tendencia desconocida cae en la flecha neutra en vez de quedar vacía", async () => {
    mockGetReplenishment.mockResolvedValue([
      makeReplenishmentRow({
        trend: "desplomándose" as ReplenishmentRow["trend"],
      }),
    ]);
    renderReport();

    const body = await tableBody();
    expect(body.getByText("→")).toBeInTheDocument();
  });

  // ── Banner de método y rango de historial ──

  it("el banner describe el método del primer renglón", async () => {
    mockGetReplenishment.mockResolvedValue([
      makeReplenishmentRow({ forecastMethod: "suavizacion-exponencial" }),
    ]);
    renderReport();

    expect(
      await screen.findByText("Nivel 3 · Suavización exponencial"),
    ).toBeInTheDocument();
    expect(screen.getByText(/4\+ meses de datos · confianza alta/)).toBeInTheDocument();
  });

  it("sin renglones cae al método más conservador", async () => {
    mockGetReplenishment.mockResolvedValue([]);
    renderReport();

    expect(await screen.findByText("Nivel 1 · Promedio simple")).toBeInTheDocument();
  });

  it("reconoce también el nivel intermedio", async () => {
    mockGetReplenishment.mockResolvedValue([
      makeReplenishmentRow({ forecastMethod: "tendencia" }),
    ]);
    renderReport();

    expect(
      await screen.findByText("Nivel 2 · Prom. ponderado + tendencia"),
    ).toBeInTheDocument();
  });

  it("cuenta solo los meses completos del historial y los nombra de extremo a extremo", async () => {
    renderReport([
      makeMonthlyReport({ key: "2026-05", label: "Mayo 2026" }),
      makeMonthlyReport({ key: "2026-06", label: "Junio 2026" }),
      // El mes en curso no cuenta: sus datos están a medias.
      makeMonthlyReport({ key: "2026-07", label: "Julio 2026", partial: true }),
    ]);

    expect(
      await screen.findByText(/Forecast basado en historial · Mayo 2026 – Junio 2026/),
    ).toBeInTheDocument();
    expect(screen.getByText(/2 meses de historial completo/)).toBeInTheDocument();
  });

  it("un solo mes completo se anuncia en singular", async () => {
    renderReport([makeMonthlyReport({ key: "2026-06", label: "Junio 2026" })]);

    expect(await screen.findByText(/1 mes de historial completo/)).toBeInTheDocument();
    expect(screen.getByText(/Junio 2026 – Junio 2026/)).toBeInTheDocument();
  });

  it("sin meses completos lo dice en vez de inventar un rango", async () => {
    renderReport([makeMonthlyReport({ key: "2026-07", partial: true })]);

    expect(await screen.findByText(/historial · sin historial/)).toBeInTheDocument();
    expect(screen.getByText(/0 meses de historial completo/)).toBeInTheDocument();
  });

  // ── Exportación CSV ──

  describe("exportar CSV", () => {
    let download: ReturnType<typeof captureDownload>;

    beforeEach(() => {
      download = captureDownload();
    });

    afterEach(() => {
      download.restore();
    });

    it("nombra el archivo con el mes en curso", async () => {
      const { user } = renderReport();
      await screen.findByRole("table");

      await user.click(screen.getByRole("button", { name: /Exportar CSV/ }));

      const mesActual = new Date().toISOString().slice(0, 7);
      expect(download.filename).toBe(`reposicion-${mesActual}.csv`);
    });

    it("antepone el BOM para que Excel lea los acentos", async () => {
      const { user } = renderReport();
      await screen.findByRole("table");

      await user.click(screen.getByRole("button", { name: /Exportar CSV/ }));

      expect(await download.text()).toMatch(/^﻿/);
      expect(download.mimeType).toBe("text/csv;charset=utf-8;");
    });

    it("exporta las doce columnas con los datos crudos del renglón", async () => {
      mockGetReplenishment.mockResolvedValue([
        makeReplenishmentRow({
          name: "Bota vaquera",
          type: "bota",
          currentStock: 12,
          forecastNextMonth: 6,
          trend: "creciendo",
          forecastMethodLabel: "Suavización exponencial",
          diasCobertura: 60,
          ingresoMensual: 5400,
          margenMensual: 2400,
          priority: "urgente",
          suggestedOrder: 4,
          costoEstimadoPedido: 2000,
        }),
      ]);
      const { user } = renderReport();
      await screen.findByRole("table");

      await user.click(screen.getByRole("button", { name: /Exportar CSV/ }));
      const rows = await download.rows();

      expect(rows[0]).toContain("Producto,Tipo,Stock Actual");
      expect(rows[1]).toBe(
        "Bota vaquera,Bota,12,6,creciendo,Suavización exponencial,60,5400,2400,urgente,4,2000",
      );
    });

    // 999 es un centinela, no una cobertura: en el CSV se traduce a texto para
    // que nadie lo promedie con los días reales de las otras filas.
    it("traduce la cobertura centinela a «sin ventas» en el CSV", async () => {
      mockGetReplenishment.mockResolvedValue([
        makeReplenishmentRow({ diasCobertura: 999 }),
      ]);
      const { user } = renderReport();
      await screen.findByRole("table");

      await user.click(screen.getByRole("button", { name: /Exportar CSV/ }));
      const rows = await download.rows();

      expect(rows[1]).toContain("sin ventas");
      expect(rows[1]).not.toContain("999");
    });

    it("entrecomilla los nombres con coma (RFC 4180)", async () => {
      mockGetReplenishment.mockResolvedValue([
        makeReplenishmentRow({ name: 'Bota "Rodeo", edición limitada' }),
      ]);
      const { user } = renderReport();
      await screen.findByRole("table");

      await user.click(screen.getByRole("button", { name: /Exportar CSV/ }));

      expect(await download.text()).toContain('"Bota ""Rodeo"", edición limitada"');
    });

    it("libera el object URL después de disparar la descarga", async () => {
      const { user } = renderReport();
      await screen.findByRole("table");

      await user.click(screen.getByRole("button", { name: /Exportar CSV/ }));
      expect(download.revokeObjectURL).toHaveBeenCalledWith("blob:mock");
    });
  });
});
