import { screen } from "@testing-library/react";
import ImportToolbar from "../../ImportToolbar";
import { analyzeDependencies, type DependencyReport } from "../../dependencies";
import { countByAction } from "../../importReducer";
import { loadedState, makePlan, makePlanRow, reduce } from "../helpers/factories";
import { renderWithUser } from "../helpers/render";

// Filtros, doble conteo y avisos de lote.
//
// El doble conteo es deliberado: el resumen del ARCHIVO y lo que se VA A APLICAR responden
// preguntas distintas, y enseñar solo el primero deja al dueño creyendo que aplicará más de lo
// que seleccionó. Y todo lo que descarta trabajo pide confirmación inline — nunca window.confirm.

const PLAN = makePlan([
  makePlanRow({ row: 2, action: "create" }),
  makePlanRow({ row: 3, action: "update", productId: 5 }),
  makePlanRow({ row: 4, action: "unchanged", productId: 6 }),
]);

const NO_DEPENDENCIES: DependencyReport = {
  byIndex: {},
  broken: [],
  missingProviders: [],
  duplicateCreates: [],
};

function setup(props: Partial<React.ComponentProps<typeof ImportToolbar>> = {}) {
  const handlers = {
    onFilterChange: jest.fn(),
    onFixDependencies: jest.fn(),
    onRevertAllEdits: jest.fn(),
    onReanalyze: jest.fn(),
    onStartOver: jest.fn(),
  };
  const plan = props.plan ?? PLAN;
  const utils = renderWithUser(
    <ImportToolbar
      plan={plan}
      counts={countByAction(plan)}
      filter="all"
      selectedCount={2}
      editCount={0}
      invalidCount={0}
      reactivateCount={0}
      dependencies={NO_DEPENDENCIES}
      fileName="productos.xlsx"
      appliedCount={0}
      canReanalyze
      disabled={false}
      isReanalyzing={false}
      {...handlers}
      {...props}
    />
  );
  return { ...handlers, ...utils };
}

describe("doble conteo", () => {
  it("separa lo que trae el archivo de lo que se va a aplicar", () => {
    setup({ selectedCount: 2 });
    expect(
      screen.getByText(/3 filas · 1 nuevos · 1 restock · 1 sin cambios · 0 con error/)
    ).toBeInTheDocument();
    expect(screen.getByText("2 filas")).toBeInTheDocument();
    expect(screen.getByText("productos.xlsx")).toBeInTheDocument();
  });

  it("anuncia las reactivaciones, que no aparecen en ningún diff", () => {
    setup({ reactivateCount: 2 });
    expect(screen.getByText("· 2 productos se reactivarán")).toBeInTheDocument();
  });

  it("avisa en consola si el summary del backend no cuadra con las filas, y manda la tabla", () => {
    // La tabla es lo que el dueño puede auditar: un toolbar que dice "5" sobre una tabla de 4
    // destruye la confianza en toda la pantalla.
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const lying = makePlan(PLAN.rows);
    lying.summary.created = 99;

    setup({ plan: lying });
    expect(screen.getByText(/3 filas · 1 nuevos/)).toBeInTheDocument();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe("filtros", () => {
  it("marca el activo y avisa del cambio", async () => {
    const { user, onFilterChange } = setup({ filter: "update" });
    expect(screen.getByRole("radio", { name: /restock/i })).toBeChecked();

    await user.click(screen.getByRole("radio", { name: /nuevo/i }));
    expect(onFilterChange).toHaveBeenCalledWith("create");
  });

  it("apaga los filtros sin filas, pero nunca «Todas»", () => {
    setup();
    expect(screen.getByRole("radio", { name: /error/i })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /todas/i })).toBeEnabled();
  });
});

describe("acciones que descartan trabajo", () => {
  it("descartar ediciones pide confirmación antes de borrarlas", async () => {
    const { user, onRevertAllEdits } = setup({ editCount: 3 });

    await user.click(screen.getByRole("button", { name: /descartar mis ediciones \(3\)/i }));
    expect(onRevertAllEdits).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /¿descartar 3\?/i }));
    expect(onRevertAllEdits).toHaveBeenCalledTimes(1);
  });

  it("no ofrece descartar si no hay ediciones que perder", () => {
    setup({ editCount: 0 });
    expect(screen.queryByRole("button", { name: /descartar mis ediciones/i })).not.toBeInTheDocument();
  });

  it("«Cancelar» desarma sin ejecutar nada", async () => {
    const { user, onStartOver } = setup({ editCount: 1 });
    await user.click(screen.getByRole("button", { name: /empezar de nuevo/i }));
    await user.click(screen.getByRole("button", { name: /^cancelar$/i }));

    expect(onStartOver).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /empezar de nuevo/i })).toBeInTheDocument();
  });

  it("sin ediciones, empezar de nuevo no estorba con una confirmación", async () => {
    const { user, onStartOver } = setup({ editCount: 0 });
    await user.click(screen.getByRole("button", { name: /empezar de nuevo/i }));
    expect(onStartOver).toHaveBeenCalledTimes(1);
  });
});

describe("volver a analizar", () => {
  it("relee el archivo directo cuando no hay ediciones que perder", async () => {
    const { user, onReanalyze } = setup({ editCount: 0 });
    await user.click(screen.getByRole("button", { name: /volver a analizar/i }));
    expect(onReanalyze).toHaveBeenCalledTimes(1);
  });

  it("con ediciones, explica qué se pierde antes de releer", async () => {
    const { user, onReanalyze } = setup({ editCount: 2 });
    await user.click(screen.getByRole("button", { name: /volver a analizar/i }));

    expect(onReanalyze).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(/tus 2 filas editadas se pierden/);

    await user.click(screen.getByRole("button", { name: /¿descartar ediciones\?/i }));
    expect(onReanalyze).toHaveBeenCalledTimes(1);
  });

  it("desaparece —no se deshabilita— con filas ya aplicadas, y explica el porqué", () => {
    // Un plan nuevo se calcularía contra el catálogo YA actualizado y volvería a proponer ese
    // restock, sumando el stock otra vez. No hay nada que esperar: la salida es empezar de nuevo.
    setup({ canReanalyze: false, appliedCount: 2 });
    expect(screen.queryByRole("button", { name: /volver a analizar/i })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Ya se aplicaron 2 filas de este archivo/);
    expect(screen.getByRole("button", { name: /empezar de nuevo/i })).toBeInTheDocument();
  });

  it("no se puede pulsar dos veces mientras relee", () => {
    setup({ isReanalyzing: true });
    expect(screen.getByRole("button", { name: /volver a analizar/i })).toBeDisabled();
  });
});

describe("avisos de lote", () => {
  it("los errores de captura no bloquean el resto del lote", () => {
    setup({ invalidCount: 1 });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "1 fila tiene errores de captura y no se puede aplicar"
    );
    expect(screen.getByRole("alert")).toHaveTextContent("el resto del lote sí se aplica");
  });

  it("ofrece reparar una dependencia rota reseleccionando la fila que crea el producto", async () => {
    const chained = makePlan([
      makePlanRow({ row: 2, action: "create", input: { code: "BTA-9" } }),
      makePlanRow({ row: 9, action: "update", productId: null, input: { code: "BTA-9" } }),
    ]);
    const state = reduce(loadedState(chained), { type: "toggleRow", index: 0 });
    const { user, onFixDependencies } = setup({
      plan: chained,
      dependencies: analyzeDependencies(state),
    });

    expect(screen.getByRole("alert")).toHaveTextContent(/1 fila depende de un producto/);
    await user.click(screen.getByRole("button", { name: /seleccionar las filas faltantes/i }));
    expect(onFixDependencies).toHaveBeenCalledTimes(1);
  });

  it("sin proveedor que reseleccionar, avisa pero no ofrece el botón", () => {
    setup({
      dependencies: {
        ...NO_DEPENDENCIES,
        broken: [{ index: 1, providerIndex: null, satisfied: false }],
      },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/1 fila depende de un producto/);
    expect(
      screen.queryByRole("button", { name: /seleccionar las filas faltantes/i })
    ).not.toBeInTheDocument();
  });

  it("señala los productos que el archivo daría de alta dos veces", () => {
    setup({ dependencies: { ...NO_DEPENDENCIES, duplicateCreates: [[0, 1]] } });
    expect(screen.getByRole("status")).toHaveTextContent(
      /Hay 1 producto que se daría de alta dos veces/
    );
  });
});
