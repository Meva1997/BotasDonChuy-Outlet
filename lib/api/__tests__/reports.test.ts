import { getMonthlyReport, getReplenishmentReport, reportKeys } from "../reports";
import { installMockApi, type MockApi } from "./helpers/mockApi";
import { makeMonthlyReport, makeReplenishmentRow, omit } from "./helpers/factories";

let mock: MockApi;

beforeEach(() => {
  mock = installMockApi();
});

afterEach(() => {
  mock.restore();
});

describe("getMonthlyReport", () => {
  it("lee el histórico mensual y lo parsea", async () => {
    const reports = [makeMonthlyReport(), makeMonthlyReport({ key: "2026-08" })];
    mock.ok(reports);

    await expect(getMonthlyReport()).resolves.toEqual(reports);
    expect(mock.lastCall().method).toBe("get");
    expect(mock.lastCall().url).toBe("/admin/reports/monthly");
  });

  it("acepta un mes marcado como parcial (el mes en curso)", async () => {
    // El mes en curso se muestra igual pero ETIQUETADO: esconderlo dejaría al
    // dueño sin la venta de hoy, y mostrarlo sin aviso le haría leer una caída
    // que no ocurrió (los gastos del mes ya vienen completos, los ingresos no).
    mock.ok([makeMonthlyReport({ partial: true })]);

    const [mes] = await getMonthlyReport();

    expect(mes.partial).toBe(true);
  });

  it("acepta un mes sin ventas (arrays vacíos, no ausentes)", async () => {
    mock.ok([
      makeMonthlyReport({ totalRevenue: 0, totalUnits: 0, byProduct: [], byCategory: [] }),
    ]);

    const [mes] = await getMonthlyReport();

    expect(mes.byProduct).toEqual([]);
  });

  it("LANZA si una fila de producto no trae unitCost (parse estricto: es lectura)", async () => {
    // La utilidad del reporte se calcula con él; sin unitCost la hoja impresa
    // mostraría un margen igual al ingreso.
    const base = makeMonthlyReport();
    mock.ok([{ ...base, byProduct: [omit(base.byProduct[0], "unitCost")] }]);

    await expect(getMonthlyReport()).rejects.toThrow();
  });

  it("LANZA si la respuesta no es un array", async () => {
    mock.ok({ reports: [makeMonthlyReport()] });

    await expect(getMonthlyReport()).rejects.toThrow();
  });
});

describe("getReplenishmentReport", () => {
  it("lee la reposición sugerida y la parsea", async () => {
    const rows = [makeReplenishmentRow()];
    mock.ok(rows);

    await expect(getReplenishmentReport()).resolves.toEqual(rows);
    expect(mock.lastCall().url).toBe("/admin/reports/replenishment");
  });

  it("acepta las tres prioridades de cobertura", async () => {
    // El orden de la tabla lo decide `priority`, no el margen: un enum abierto
    // dejaría pasar un valor que la UI no sabe pintar ni ordenar.
    const rows = (["urgente", "pronto", "ok"] as const).map((priority, i) =>
      makeReplenishmentRow({ productId: i + 1, priority })
    );
    mock.ok(rows);

    await expect(getReplenishmentReport()).resolves.toHaveLength(3);
  });

  it("LANZA si `priority` trae un valor fuera del enum", async () => {
    mock.ok([makeReplenishmentRow({ priority: "critico" })]);

    await expect(getReplenishmentReport()).rejects.toThrow();
  });

  it("LANZA si `confidence` trae un valor fuera del enum", async () => {
    mock.ok([makeReplenishmentRow({ confidence: "altísima" })]);

    await expect(getReplenishmentReport()).rejects.toThrow();
  });

  it("acepta un catálogo sin nada por reponer", async () => {
    mock.ok([]);

    await expect(getReplenishmentReport()).resolves.toEqual([]);
  });
});

describe("reportKeys", () => {
  it("cuelga ambas lecturas de `all` para invalidarlas de una sola vez", () => {
    expect(reportKeys.all).toEqual(["adminReports"]);
    expect(reportKeys.monthly()).toEqual(["adminReports", "monthly"]);
    expect(reportKeys.replenishment()).toEqual(["adminReports", "replenishment"]);
  });
});
