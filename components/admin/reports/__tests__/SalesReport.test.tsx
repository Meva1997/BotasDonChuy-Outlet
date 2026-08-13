import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SalesReport from "../SalesReport";
import { captureDownload } from "./helpers/download";
import { makeMonthlyReport } from "./helpers/factories";

// SalesReport no pide datos: recibe el arreglo completo de meses y el mes
// elegido desde `ReportsSection`. Casi todo viene derivado del backend, pero tres
// cosas se calculan aquí y pueden mentir sin que nada reviente:
//
//  1. La utilidad del mes (ingresos − costo) y su margen — es el único lugar del
//     panel donde `unitCost` se agrega sobre todo un mes.
//  2. La comparación contra el mes anterior, que tiene DOS formas de no existir
//     (es el primer mes / el anterior no facturó nada) y no debe inventar un
//     porcentaje en ninguna.
//  3. El CSV: un nombre de producto con una coma parte el renglón en dos si
//     `csvField` no lo entrecomilla, y el archivo llega corrido de columnas sin
//     que la pantalla se vea mal.

function reportsWith(...overrides: Parameters<typeof makeMonthlyReport>[0][]) {
  return overrides.map((o) => makeMonthlyReport(o));
}

describe("SalesReport", () => {
  it("no pinta nada si el mes elegido no está en los datos", () => {
    const { container } = render(
      <SalesReport monthKey="2026-01" reports={reportsWith({ key: "2026-07" })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("pinta ingresos, piezas y precio promedio del mes", () => {
    render(
      <SalesReport
        monthKey="2026-07"
        reports={reportsWith({ key: "2026-07", totalRevenue: 10000, totalUnits: 8 })}
      />,
    );

    expect(screen.getByText("$10,000.00")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    // 10000 / 8 = 1250, redondeado antes de formatear.
    expect(screen.getByText("$1,250.00")).toBeInTheDocument();
  });

  it("calcula la utilidad del mes restando el costo de cada producto vendido", () => {
    render(
      <SalesReport
        monthKey="2026-07"
        reports={reportsWith({
          key: "2026-07",
          totalRevenue: 10000,
          byProduct: [
            {
              productId: 1,
              name: "Bota",
              type: "bota",
              unitsSold: 5,
              revenue: 6000,
              unitCost: 500,
            },
            {
              productId: 2,
              name: "Sombrero",
              type: "sombrero",
              unitsSold: 3,
              revenue: 4000,
              unitCost: 400,
            },
          ],
        })}
      />,
    );

    // costo = 5×500 + 3×400 = 3,700 → utilidad 6,300 (63% de margen).
    expect(screen.getByText("$6,300.00")).toBeInTheDocument();
    expect(screen.getByText("63% de margen")).toBeInTheDocument();
  });

  it("un mes sin piezas vendidas muestra «—» en vez de dividir entre cero", () => {
    render(
      <SalesReport
        monthKey="2026-07"
        reports={reportsWith({
          key: "2026-07",
          totalRevenue: 0,
          totalUnits: 0,
          byProduct: [],
          byCategory: [],
        })}
      />,
    );

    expect(screen.getByText("—")).toBeInTheDocument();
    // Y el margen sobre ingresos de 0 se reporta como 0%, no como NaN.
    expect(screen.getByText("0% de margen")).toBeInTheDocument();
  });

  it("ordena los productos por unidades vendidas, de mayor a menor", () => {
    render(
      <SalesReport
        monthKey="2026-07"
        reports={reportsWith({
          key: "2026-07",
          byProduct: [
            { productId: 1, name: "Poco vendida", type: "bota", unitsSold: 2, revenue: 1000, unitCost: 300 },
            { productId: 2, name: "La más vendida", type: "sombrero", unitsSold: 9, revenue: 5000, unitCost: 300 },
            { productId: 3, name: "Intermedia", type: "ropa", unitsSold: 5, revenue: 3000, unitCost: 300 },
          ],
        })}
      />,
    );

    const names = within(screen.getByRole("table"))
      .getAllByRole("row")
      .slice(1)
      .map((row) => within(row).getAllByRole("cell")[1].textContent);

    expect(names?.[0]).toContain("La más vendida");
    expect(names?.[1]).toContain("Intermedia");
    expect(names?.[2]).toContain("Poco vendida");
  });

  it("traduce el tipo de cada producto a su etiqueta en singular", () => {
    render(
      <SalesReport
        monthKey="2026-07"
        reports={reportsWith({ key: "2026-07" })}
      />,
    );

    const table = within(screen.getByRole("table"));
    expect(table.getByText("Bota")).toBeInTheDocument();
    expect(table.getByText("Sombrero")).toBeInTheDocument();
  });

  it("pinta el desglose por categoría con su participación del mes", () => {
    render(
      <SalesReport
        monthKey="2026-07"
        reports={reportsWith({ key: "2026-07", totalRevenue: 10000 })}
      />,
    );

    expect(screen.getByText("Botas")).toBeInTheDocument();
    expect(screen.getByText("· 5 pzas · 60% del mes")).toBeInTheDocument();
    expect(screen.getByText("· 3 pzas · 40% del mes")).toBeInTheDocument();
  });

  // ── Comparación contra el mes anterior ──

  it("el primer mes del historial no compara contra nada", () => {
    render(
      <SalesReport
        monthKey="2026-06"
        reports={reportsWith(
          { key: "2026-06", label: "Junio 2026" },
          { key: "2026-07", label: "Julio 2026" },
        )}
      />,
    );

    expect(screen.queryByText(/vs mes anterior/)).not.toBeInTheDocument();
  });

  it("un mes anterior sin ingresos tampoco genera comparación (evita dividir entre cero)", () => {
    render(
      <SalesReport
        monthKey="2026-07"
        reports={reportsWith(
          { key: "2026-06", totalRevenue: 0 },
          { key: "2026-07", totalRevenue: 10000 },
        )}
      />,
    );

    expect(screen.queryByText(/vs mes anterior/)).not.toBeInTheDocument();
  });

  it("un mes al alza compara en verde y con signo +", () => {
    render(
      <SalesReport
        monthKey="2026-07"
        reports={reportsWith(
          { key: "2026-06", totalRevenue: 8000 },
          { key: "2026-07", totalRevenue: 10000 },
        )}
      />,
    );

    const trend = screen.getByText(/vs mes anterior/);
    expect(trend).toHaveTextContent("+25% vs mes anterior");
    expect(trend).toHaveClass("text-emerald-400/80");
  });

  it("un mes a la baja compara en rojo y sin signo + (el porcentaje ya es negativo)", () => {
    render(
      <SalesReport
        monthKey="2026-07"
        reports={reportsWith(
          { key: "2026-06", totalRevenue: 10000 },
          { key: "2026-07", totalRevenue: 8000 },
        )}
      />,
    );

    const trend = screen.getByText(/vs mes anterior/);
    expect(trend).toHaveTextContent("-20% vs mes anterior");
    expect(trend).toHaveClass("text-red-400/80");
  });

  // Un mes plano (diff === 0) cuenta como positivo: `diff >= 0`.
  it("un mes idéntico al anterior se considera positivo", () => {
    render(
      <SalesReport
        monthKey="2026-07"
        reports={reportsWith(
          { key: "2026-06", totalRevenue: 10000 },
          { key: "2026-07", totalRevenue: 10000 },
        )}
      />,
    );

    expect(screen.getByText(/vs mes anterior/)).toHaveTextContent("+0% vs mes anterior");
  });

  it("marca el mes en curso como parcial", () => {
    render(
      <SalesReport
        monthKey="2026-07"
        reports={reportsWith({ key: "2026-07", partial: true })}
      />,
    );
    expect(screen.getByText("mes parcial")).toBeInTheDocument();
  });

  it("un mes cerrado no lleva la nota de parcial", () => {
    render(
      <SalesReport monthKey="2026-07" reports={reportsWith({ key: "2026-07" })} />,
    );
    expect(screen.queryByText("mes parcial")).not.toBeInTheDocument();
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

    it("nombra el archivo con la clave del mes exportado", async () => {
      const user = userEvent.setup();
      render(
        <SalesReport
          monthKey="2026-07"
          reports={reportsWith({ key: "2026-07" })}
        />,
      );

      await user.click(screen.getByRole("button", { name: /Exportar CSV/ }));
      expect(download.filename).toBe("ventas-2026-07.csv");
    });

    // Sin el BOM, Excel abre el archivo en Latin-1 y "Suavización" llega como
    // "SuavizaciÃ³n" — el CSV se ve roto aunque el contenido sea correcto.
    it("antepone el BOM para que Excel lea los acentos", async () => {
      const user = userEvent.setup();
      render(
        <SalesReport monthKey="2026-07" reports={reportsWith({ key: "2026-07" })} />,
      );

      await user.click(screen.getByRole("button", { name: /Exportar CSV/ }));
      expect(await download.text()).toMatch(/^﻿/);
      expect(download.mimeType).toBe("text/csv;charset=utf-8;");
    });

    it("exporta los productos ordenados, con posición, tipo y márgenes", async () => {
      const user = userEvent.setup();
      render(
        <SalesReport
          monthKey="2026-07"
          reports={reportsWith({
            key: "2026-07",
            totalRevenue: 10000,
            byProduct: [
              { productId: 1, name: "Sombrero", type: "sombrero", unitsSold: 3, revenue: 4000, unitCost: 400 },
              { productId: 2, name: "Bota", type: "bota", unitsSold: 5, revenue: 6000, unitCost: 500 },
            ],
          })}
        />,
      );

      await user.click(screen.getByRole("button", { name: /Exportar CSV/ }));
      const rows = await download.rows();

      expect(rows[0]).toBe(
        "Pos,Producto,Tipo,Unidades,Ingresos,% del total,Utilidad,Margen %",
      );
      // La más vendida va primera, igual que en la tabla.
      expect(rows[1]).toBe("1,Bota,Bota,5,6000,60%,3500,58%");
      expect(rows[2]).toBe("2,Sombrero,Sombrero,3,4000,40%,2800,70%");
    });

    // El escapado RFC 4180 de `csvField`: sin comillas, una coma en el nombre
    // corre todas las columnas siguientes una posición.
    it("entrecomilla los nombres con coma y duplica las comillas internas", async () => {
      const user = userEvent.setup();
      render(
        <SalesReport
          monthKey="2026-07"
          reports={reportsWith({
            key: "2026-07",
            totalRevenue: 10000,
            byProduct: [
              { productId: 1, name: 'Bota "Rodeo", edición limitada', type: "bota", unitsSold: 5, revenue: 6000, unitCost: 500 },
              { productId: 2, name: "Sombrero\ncon salto", type: "sombrero", unitsSold: 3, revenue: 4000, unitCost: 400 },
            ],
          })}
        />,
      );

      await user.click(screen.getByRole("button", { name: /Exportar CSV/ }));
      const csv = await download.text();

      expect(csv).toContain('"Bota ""Rodeo"", edición limitada"');
      expect(csv).toContain('"Sombrero\ncon salto"');
    });

    it("libera el object URL después de disparar la descarga", async () => {
      const user = userEvent.setup();
      render(
        <SalesReport monthKey="2026-07" reports={reportsWith({ key: "2026-07" })} />,
      );

      await user.click(screen.getByRole("button", { name: /Exportar CSV/ }));
      expect(download.revokeObjectURL).toHaveBeenCalledWith("blob:mock");
    });

    it("un mes sin ingresos exporta 0% en vez de NaN", async () => {
      const user = userEvent.setup();
      render(
        <SalesReport
          monthKey="2026-07"
          reports={reportsWith({
            key: "2026-07",
            totalRevenue: 0,
            totalUnits: 0,
            byProduct: [
              { productId: 1, name: "Regalo", type: "bota", unitsSold: 1, revenue: 0, unitCost: 0 },
            ],
            byCategory: [],
          })}
        />,
      );

      await user.click(screen.getByRole("button", { name: /Exportar CSV/ }));
      const rows = await download.rows();
      expect(rows[1]).toBe("1,Regalo,Bota,1,0,0%,0,0%");
    });
  });
});
