import { dashboardKeys, getAdminDashboard } from "../dashboard";
import { installMockApi, type MockApi } from "./helpers/mockApi";
import { makeDashboard, omit } from "./helpers/factories";

let mock: MockApi;

beforeEach(() => {
  mock = installMockApi();
});

afterEach(() => {
  mock.restore();
});

describe("getAdminDashboard", () => {
  it("lee /admin/dashboard y parsea la respuesta completa", async () => {
    const data = makeDashboard();
    mock.ok(data);

    await expect(getAdminDashboard()).resolves.toEqual(data);
    expect(mock.lastCall().method).toBe("get");
    expect(mock.lastCall().url).toBe("/admin/dashboard");
  });

  it("acepta un KPI con `trend` y `subtitle`, y también uno sin ellos", async () => {
    // Los dos casos conviven en la misma respuesta: KpiGrid pinta genéricamente
    // por `label`, así que un KPI nuevo del backend no necesita código aquí.
    const kpis = [
      { label: "INGRESOS", value: "$12,500.00" },
      {
        label: "COSTO DE ENVÍO",
        value: "$1,280.00",
        trend: { label: "-12%", positive: true },
        subtitle: "vs. periodo anterior",
      },
    ];
    mock.ok(makeDashboard({ kpisByPeriod: { 7: kpis, 30: kpis, 90: kpis } }));

    const data = await getAdminDashboard();

    expect(data.kpisByPeriod[7]).toEqual(kpis);
  });

  it("LANZA si falta una de las tres ventanas (7/30/90)", async () => {
    // El selector de periodo indexa las tres sin preguntar; que falte una sería
    // un `undefined.map` en el panel, no un estado vacío.
    const data = makeDashboard();
    mock.ok({ ...data, revenueByPeriod: omit(data.revenueByPeriod, "90") });

    await expect(getAdminDashboard()).rejects.toThrow();
  });

  it("LANZA si una venta reciente no trae `shipping`", async () => {
    // Sin él la ganancia de la fila (`total − shipping − costoTotal`) no se puede
    // calcular, y omitirlo sobrestimaría el margen en los pedidos con más envío.
    const data = makeDashboard();
    mock.ok({ ...data, recentSales: [omit(data.recentSales[0], "shipping")] });

    await expect(getAdminDashboard()).rejects.toThrow();
  });

  it("LANZA si el valor de un KPI llega como número (el backend lo manda formateado)", async () => {
    const kpis = [{ label: "INGRESOS", value: 12500 }];
    mock.ok(makeDashboard({ kpisByPeriod: { 7: kpis, 30: kpis, 90: kpis } as never }));

    await expect(getAdminDashboard()).rejects.toThrow();
  });

  it("acepta listas vacías de ventas e inventario (tienda recién abierta)", async () => {
    mock.ok(makeDashboard({ recentSales: [], inventory: [] }));

    const data = await getAdminDashboard();

    expect(data.recentSales).toEqual([]);
    expect(data.inventory).toEqual([]);
  });
});

describe("dashboardKeys", () => {
  it("expone una key estable", () => {
    expect(dashboardKeys.all).toEqual(["adminDashboard"]);
  });
});
