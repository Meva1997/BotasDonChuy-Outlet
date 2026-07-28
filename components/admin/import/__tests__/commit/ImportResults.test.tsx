import { screen, within } from "@testing-library/react";
import ImportResults from "../../ImportResults";
import { makeCommitResponse, makeRowResult } from "../helpers/factories";
import { renderWithUser } from "../helpers/render";

// Resumen tras confirmar. Ya se escribió, así que lo que importa es que el reporte sea fiel
// (incluido el éxito parcial) y que la salida "corregir y reintentar" solo aparezca si hay algo
// que corregir.

const MIXED = makeCommitResponse([
  makeRowResult({ row: 2, status: "created", name: "Bota de avestruz", code: "BTA-1", message: "Producto creado." }),
  makeRowResult({ row: 3, status: "updated", name: "Sombrero", message: "Se sumaron 5 piezas." }),
  makeRowResult({ row: 4, status: "error", name: "Cinto", message: "Falta el precio de oferta." }),
]);

function setup(props: Partial<React.ComponentProps<typeof ImportResults>> = {}) {
  const onFixErrors = jest.fn();
  const onStartOver = jest.fn();
  const utils = renderWithUser(
    <ImportResults
      response={MIXED}
      failedRows={[2]}
      onFixErrors={onFixErrors}
      onStartOver={onStartOver}
      {...props}
    />
  );
  return { onFixErrors, onStartOver, ...utils };
}

describe("resumen", () => {
  it("pinta un contador por estado", () => {
    setup();
    for (const label of ["Creados", "Actualizados", "Sin cambios", "Con error"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText("Creados").previousElementSibling).toHaveTextContent("1");
  });

  it("resume en una línea lo que pasó", () => {
    setup();
    expect(screen.getByRole("status")).toHaveTextContent(
      "1 producto creado · 1 actualizado · 1 con error"
    );
  });

  it("explica el éxito parcial: el resto SÍ quedó guardado y queda bloqueado", () => {
    setup();
    expect(screen.getByRole("alert")).toHaveTextContent("1 fila no se aplicó");
    expect(screen.getByRole("alert")).toHaveTextContent(/su stock no se sume dos veces/);
  });

  it("no alarma cuando no falló nada", () => {
    setup({
      response: makeCommitResponse([makeRowResult({ row: 2, status: "created" })]),
      failedRows: [],
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("detalle por fila", () => {
  it("lista cada fila enviada con su folio, resultado y mensaje del backend", () => {
    setup();
    const row = screen.getByRole("rowheader", { name: "4" }).closest("tr")!;
    expect(within(row).getByText("Cinto")).toBeInTheDocument();
    expect(within(row).getByText("Error")).toBeInTheDocument();
    expect(within(row).getByText("Falta el precio de oferta.")).toBeInTheDocument();
  });

  it("muestra el código cuando lo hay y un guion cuando no hay nombre", () => {
    setup({
      response: makeCommitResponse([makeRowResult({ row: 9, status: "unchanged", name: null })]),
      failedRows: [],
    });
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("salidas", () => {
  it("ofrece corregir solo si algo falló", async () => {
    const { user, onFixErrors } = setup();
    await user.click(screen.getByRole("button", { name: /corregir las filas con error/i }));
    expect(onFixErrors).toHaveBeenCalledTimes(1);
  });

  it("esconde «corregir» cuando no hay filas fallidas", () => {
    setup({ failedRows: [] });
    expect(screen.queryByRole("button", { name: /corregir/i })).not.toBeInTheDocument();
  });

  it("siempre deja empezar con otro archivo", async () => {
    const { user, onStartOver } = setup();
    await user.click(screen.getByRole("button", { name: /importar otro archivo/i }));
    expect(onStartOver).toHaveBeenCalledTimes(1);
  });
});

describe("accesibilidad", () => {
  it("manda el foco al encabezado: el botón que se pulsó ya no existe", () => {
    setup();
    expect(screen.getByRole("heading", { name: "Importación aplicada" })).toHaveFocus();
  });
});
