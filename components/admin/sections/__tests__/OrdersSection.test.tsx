import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import OrdersSection from "../OrdersSection";
import { makeAdminOrder, makeOrdersPage } from "./helpers/factories";
import { renderWithQueryClient, setViewport } from "./helpers/render";

// `jest.mock("@/...")` no resuelve — rutas relativas a propósito (ver CLAUDE.md).
jest.mock("../../../../lib/api/adminOrders", () => ({
  ...jest.requireActual("../../../../lib/api/adminOrders"),
  getAdminOrders: jest.fn(),
  cancelAdminOrder: jest.fn(),
}));

jest.mock("sileo", () => ({
  sileo: { info: jest.fn() },
}));

import { cancelAdminOrder, getAdminOrders } from "@/lib/api/adminOrders";
import { sileo } from "sileo";

const mockGetOrders = getAdminOrders as jest.MockedFunction<typeof getAdminOrders>;
const mockCancelOrder = cancelAdminOrder as jest.MockedFunction<typeof cancelAdminOrder>;
const mockToast = sileo.info as jest.Mock;

// OrdersSection es lo más delicado que quedaba sin specs del módulo de pedidos,
// y no por lo que pinta —de eso se encargan `OrdersTable`/`OrderDetailModal`,
// que ya tienen sus suites— sino por lo que DECIDE:
//
//  1. El tamaño de página cambia con el viewport (20 en escritorio, 5 en móvil,
//     vía `matchMedia`), y ese número viaja en la query key: pedirle 20 a un
//     teléfono no es solo feo, es otra petición.
//  2. El toast de Sileo debe sonar SOLO cuando un refetch automático encuentra
//     una firma de renglón distinta. Nunca en la primera carga (no hay foto
//     previa contra la cual comparar), nunca tras un refresh manual, y nunca
//     tras una acción del propio dueño desde el modal —cancelar, reembolsar,
//     avanzar el estado tocan campos que están en la firma, así que sin la marca
//     de "esto lo hice yo" el panel le avisaría al dueño de su propio clic.
//  3. El filtro por día es SERVER-side aquí (a diferencia de `SalesTable`): va
//     en la query key y vuelve a pedir la página 1.
//
// El "refetch automático" se simula con `queryClient.refetchQueries()`, que es
// exactamente el mismo camino que toma el `refetchInterval` de 30 minutos: el
// efecto no distingue el intervalo de cualquier refetch que no venga del botón.

/** Un refetch de fondo, como el que dispara el `refetchInterval`. */
async function backgroundRefetch(queryClient: { refetchQueries: () => Promise<unknown> }) {
  await act(async () => {
    await queryClient.refetchQueries();
    // TanStack Query notifica a sus suscriptores en un macrotask: sin este
    // flush, una aserción de AUSENCIA de toast se evalúa contra el estado viejo
    // y pasa con y sin el guard (ver CLAUDE.md).
    await new Promise((r) => setTimeout(r, 0));
  });
}

function pickDay(day: string) {
  fireEvent.change(screen.getByLabelText("Filtrar pedidos por día"), {
    target: { value: day },
  });
}

beforeEach(() => {
  mockGetOrders.mockReset();
  mockCancelOrder.mockReset();
  mockToast.mockReset();
  setViewport(false);
  mockGetOrders.mockResolvedValue(makeOrdersPage([makeAdminOrder()]));
});

describe("OrdersSection", () => {
  // ── Tamaño de página según viewport ──

  it("en móvil pide páginas de 5", async () => {
    setViewport(false);
    renderWithQueryClient(<OrdersSection />);

    await waitFor(() => expect(mockGetOrders).toHaveBeenCalled());
    expect(mockGetOrders).toHaveBeenCalledWith(1, 5, undefined, "pendientes_envio");
  });

  it("en escritorio pide páginas de 20", async () => {
    setViewport(true);
    renderWithQueryClient(<OrdersSection />);

    await waitFor(() => expect(mockGetOrders).toHaveBeenCalled());
    expect(mockGetOrders).toHaveBeenCalledWith(1, 20, undefined, "pendientes_envio");
  });

  // ── Estados de la query ──

  it("muestra el estado de carga mientras pide la primera página", () => {
    mockGetOrders.mockReturnValue(new Promise(() => {}));
    renderWithQueryClient(<OrdersSection />);
    expect(screen.getByText("Cargando pedidos…")).toBeInTheDocument();
  });

  it("sin datos previos, un error ocupa la pantalla y ofrece reintentar", async () => {
    mockGetOrders.mockRejectedValueOnce(new Error("red caída"));
    const { user } = renderWithQueryClient(<OrdersSection />);

    expect(await screen.findByText(/No pudimos cargar los pedidos/)).toBeInTheDocument();

    mockGetOrders.mockResolvedValue(makeOrdersPage([makeAdminOrder()]));
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() =>
      expect(screen.queryByText(/No pudimos cargar los pedidos/)).not.toBeInTheDocument(),
    );
  });

  // Con datos en pantalla, un refetch fallido NO borra la tabla: avisa arriba y
  // deja lo anterior. Es la misma regla que `OutletView` (Fase 4).
  it("con datos ya en pantalla, un refetch fallido avisa sin borrar la tabla", async () => {
    const { queryClient } = renderWithQueryClient(<OrdersSection />);
    await screen.findByText("1 pedido");

    mockGetOrders.mockRejectedValue(new Error("red caída"));
    await backgroundRefetch(queryClient);

    expect(
      await screen.findByText(/No se pudo actualizar. Mostrando datos anteriores./),
    ).toBeInTheDocument();
    // Y el error de pantalla completa NO aparece.
    expect(screen.queryByText(/No pudimos cargar los pedidos/)).not.toBeInTheDocument();
    expect(screen.getByText("1 pedido")).toBeInTheDocument();
  });

  it("pluraliza el conteo de pedidos y anuncia la página cuando hay más de una", async () => {
    mockGetOrders.mockResolvedValue(
      makeOrdersPage([makeAdminOrder({ id: 1 }), makeAdminOrder({ id: 2 })], {
        total: 40,
        totalPages: 2,
      }),
    );
    renderWithQueryClient(<OrdersSection />);

    expect(await screen.findByText("40 pedidos · página 1 de 2")).toBeInTheDocument();
  });

  it("con una sola página no anuncia paginación", async () => {
    renderWithQueryClient(<OrdersSection />);
    expect(await screen.findByText("1 pedido")).toBeInTheDocument();
  });

  // ── Toast del polling ──

  it("la primera carga nunca dispara el toast (no hay foto previa)", async () => {
    renderWithQueryClient(<OrdersSection />);
    await screen.findByText("1 pedido");

    // Un flush completo, por si el toast llegara tarde.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(mockToast).not.toHaveBeenCalled();
  });

  it("un refetch automático con una firma distinta avisa del pedido que cambió", async () => {
    const { queryClient } = renderWithQueryClient(<OrdersSection />);
    await screen.findByText("1 pedido");

    mockGetOrders.mockResolvedValue(
      makeOrdersPage([makeAdminOrder({ shipmentStatus: "in_transit" })]),
    );
    await backgroundRefetch(queryClient);

    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith({
      title: "Pedido actualizado",
      description: "El pedido #100 tiene información nueva.",
    });
  });

  it("con varios pedidos cambiados el aviso va en plural y los cuenta", async () => {
    mockGetOrders.mockResolvedValue(
      makeOrdersPage([makeAdminOrder({ id: 1 }), makeAdminOrder({ id: 2 })]),
    );
    const { queryClient } = renderWithQueryClient(<OrdersSection />);
    await screen.findByText("2 pedidos");

    mockGetOrders.mockResolvedValue(
      makeOrdersPage([
        makeAdminOrder({ id: 1, status: "shipped" }),
        makeAdminOrder({ id: 2, trackingNumber: "1Z999" }),
      ]),
    );
    await backgroundRefetch(queryClient);

    expect(mockToast).toHaveBeenCalledWith({
      title: "Pedidos actualizados",
      description: "2 pedidos tienen información nueva.",
    });
  });

  it("un refetch automático que no cambia nada no avisa", async () => {
    const { queryClient } = renderWithQueryClient(<OrdersSection />);
    await screen.findByText("1 pedido");

    await backgroundRefetch(queryClient);

    expect(mockToast).not.toHaveBeenCalled();
  });

  // El barrido de reintento de guía (Fase 16) mueve `skydropxShipmentId` mucho
  // antes de que el webhook traiga el `labelUrl`: es lo primero que el dueño
  // puede saber, y por eso entra en la firma.
  it("un cambio en skydropxShipmentId ya cuenta como información nueva", async () => {
    const { queryClient } = renderWithQueryClient(<OrdersSection />);
    await screen.findByText("1 pedido");

    mockGetOrders.mockResolvedValue(
      makeOrdersPage([makeAdminOrder({ skydropxShipmentId: "creating" })]),
    );
    await backgroundRefetch(queryClient);

    expect(mockToast).toHaveBeenCalledTimes(1);
  });

  it("un pedido que no estaba en la foto previa no cuenta como cambiado", async () => {
    const { queryClient } = renderWithQueryClient(<OrdersSection />);
    await screen.findByText("1 pedido");

    // Llega un pedido nuevo; el que ya estaba sigue igual.
    mockGetOrders.mockResolvedValue(
      makeOrdersPage([makeAdminOrder({ id: 100 }), makeAdminOrder({ id: 101 })]),
    );
    await backgroundRefetch(queryClient);

    expect(mockToast).not.toHaveBeenCalled();
  });

  it("el refresh manual no dispara el toast aunque traiga cambios", async () => {
    const { user } = renderWithQueryClient(<OrdersSection />);
    await screen.findByText("1 pedido");

    mockGetOrders.mockResolvedValue(
      makeOrdersPage([makeAdminOrder({ status: "shipped" })]),
    );
    await user.click(screen.getByRole("button", { name: "Actualizar pedidos" }));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(mockToast).not.toHaveBeenCalled();
  });

  // Tras el refresh manual la marca se limpia, así que el SIGUIENTE refetch
  // automático vuelve a avisar. Sin ese reset, el toast se apagaría para siempre
  // en cuanto el dueño tocara el botón una vez.
  it("después de un refresh manual, el siguiente refetch automático vuelve a avisar", async () => {
    const { user, queryClient } = renderWithQueryClient(<OrdersSection />);
    await screen.findByText("1 pedido");

    await user.click(screen.getByRole("button", { name: "Actualizar pedidos" }));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    mockGetOrders.mockResolvedValue(
      makeOrdersPage([makeAdminOrder({ status: "shipped" })]),
    );
    await backgroundRefetch(queryClient);

    expect(mockToast).toHaveBeenCalledTimes(1);
  });

  // Cancelar/reembolsar toca `status` y `paymentStatus`, los dos dentro de la
  // firma. Sin la marca de "esto lo hice yo" el panel le avisaría al dueño de su
  // propio clic, unos segundos después de darlo.
  it("cancelar desde el modal sincroniza la tabla sin disparar el toast", async () => {
    const cancelado = makeAdminOrder({
      status: "cancelled",
      paymentStatus: "refunded",
      refundId: "re_1",
      refundedAt: "2026-07-04T12:00:00.000Z",
    });
    mockCancelOrder.mockResolvedValue(cancelado);

    const { user } = renderWithQueryClient(<OrdersSection />);
    await screen.findByText("1 pedido");

    // La card móvil del renglón es un `<button>` con "Pedido #100" dentro.
    await user.click(screen.getAllByRole("button", { name: /Pedido #100/ })[0]);
    await screen.findByRole("dialog");

    await user.click(
      screen.getByRole("button", { name: "Cancelar / reembolsar pedido" }),
    );
    // La cancelación invalida `adminOrderKeys.all`, así que la tabla se vuelve a
    // pedir sola: el refetch trae el pedido ya cancelado.
    mockGetOrders.mockResolvedValue(makeOrdersPage([cancelado]));
    await user.click(screen.getByRole("button", { name: "Confirmar cancelación" }));

    await waitFor(() => expect(mockCancelOrder).toHaveBeenCalled());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockToast).not.toHaveBeenCalled();
  });

  // ── Filtro por día (server-side) ──

  it("filtrar por día se pide al backend y vuelve a la página 1", async () => {
    mockGetOrders.mockResolvedValue(
      makeOrdersPage([makeAdminOrder()], { total: 40, totalPages: 2 }),
    );
    const { user } = renderWithQueryClient(<OrdersSection />);
    await screen.findByText(/40 pedidos/);

    await user.click(screen.getByRole("button", { name: "Página 2" }));
    await waitFor(() =>
      expect(mockGetOrders).toHaveBeenCalledWith(2, 5, undefined, "pendientes_envio"),
    );

    pickDay("2026-07-13");

    await waitFor(() =>
      expect(mockGetOrders).toHaveBeenCalledWith(1, 5, "2026-07-13", "pendientes_envio"),
    );
    expect(await screen.findByText(/· día seleccionado/)).toBeInTheDocument();
  });

  it("limpiar el día vuelve a pedir sin filtro y desde la página 1", async () => {
    const { user } = renderWithQueryClient(<OrdersSection />);
    await screen.findByText("1 pedido");

    pickDay("2026-07-13");
    await waitFor(() =>
      expect(mockGetOrders).toHaveBeenCalledWith(1, 5, "2026-07-13", "pendientes_envio"),
    );

    await user.click(screen.getByRole("button", { name: /Limpiar/ }));

    await waitFor(() =>
      expect(screen.queryByText(/· día seleccionado/)).not.toBeInTheDocument(),
    );
    expect(screen.getByLabelText("Filtrar pedidos por día")).toHaveValue("");
  });

  it("el botón de limpiar solo existe con un día elegido", async () => {
    renderWithQueryClient(<OrdersSection />);
    await screen.findByText("1 pedido");

    expect(screen.queryByRole("button", { name: /Limpiar/ })).not.toBeInTheDocument();

    pickDay("2026-07-13");
    expect(await screen.findByRole("button", { name: /Limpiar/ })).toBeInTheDocument();
  });

  it("el date picker no deja elegir un día futuro", async () => {
    renderWithQueryClient(<OrdersSection />);
    await screen.findByText("1 pedido");

    expect(screen.getByLabelText("Filtrar pedidos por día")).toHaveAttribute(
      "max",
      new Date().toISOString().slice(0, 10),
    );
  });

  it("cambiar de página o de día empieza una foto nueva: el primer refetch de esa vista no avisa", async () => {
    mockGetOrders.mockResolvedValue(
      makeOrdersPage([makeAdminOrder()], { total: 40, totalPages: 2 }),
    );
    const { user } = renderWithQueryClient(<OrdersSection />);
    await screen.findByText(/40 pedidos/);

    // Página 2: vista nueva, sin foto previa.
    mockGetOrders.mockResolvedValue(
      makeOrdersPage([makeAdminOrder({ id: 200, status: "shipped" })], {
        page: 2,
        total: 40,
        totalPages: 2,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Página 2" }));
    await screen.findByText(/página 2 de 2/);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(mockToast).not.toHaveBeenCalled();
  });

  it("el mensaje de la tabla vacía distingue «no hay pedidos» de «no hay ese día»", async () => {
    mockGetOrders.mockResolvedValue(makeOrdersPage([]));
    const { user } = renderWithQueryClient(<OrdersSection />);

    // Pestaña default "Pendientes de enviar".
    expect(
      await screen.findByText("No hay pedidos pendientes de enviar"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Enviados" }));
    expect(
      await screen.findByText("No hay pedidos enviados sin entregar"),
    ).toBeInTheDocument();

    pickDay("2026-07-13");
    expect(await screen.findByText("Sin pedidos ese día")).toBeInTheDocument();
  });

  // ── Pestañas de estado (Fase 25) ──

  it("al montar, la pestaña activa es «Pendientes de enviar»", async () => {
    renderWithQueryClient(<OrdersSection />);

    await waitFor(() =>
      expect(mockGetOrders).toHaveBeenCalledWith(1, 5, undefined, "pendientes_envio"),
    );
    expect(screen.getByRole("tab", { name: "Pendientes de enviar" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("cambiar de pestaña pide el estado correcto y vuelve a la página 1", async () => {
    mockGetOrders.mockResolvedValue(
      makeOrdersPage([makeAdminOrder()], { total: 40, totalPages: 2 }),
    );
    const { user } = renderWithQueryClient(<OrdersSection />);
    await screen.findByText(/40 pedidos/);

    await user.click(screen.getByRole("button", { name: "Página 2" }));
    await waitFor(() =>
      expect(mockGetOrders).toHaveBeenCalledWith(2, 5, undefined, "pendientes_envio"),
    );

    await user.click(screen.getByRole("tab", { name: "Entregados" }));
    await waitFor(() =>
      expect(mockGetOrders).toHaveBeenCalledWith(1, 5, undefined, "entregados"),
    );
  });

  it("la pestaña «Enviados» pide status = shipped", async () => {
    const { user } = renderWithQueryClient(<OrdersSection />);
    await screen.findByText("1 pedido");

    await user.click(screen.getByRole("tab", { name: "Enviados" }));

    await waitFor(() =>
      expect(mockGetOrders).toHaveBeenCalledWith(1, 5, undefined, "enviados"),
    );
  });

  it("la pestaña «Todos» no manda filtro de estado", async () => {
    const { user } = renderWithQueryClient(<OrdersSection />);
    await screen.findByText("1 pedido");

    await user.click(screen.getByRole("tab", { name: "Todos" }));

    await waitFor(() =>
      expect(mockGetOrders).toHaveBeenCalledWith(1, 5, undefined, undefined),
    );
  });

  it("pestaña y día se combinan en la misma petición", async () => {
    const { user } = renderWithQueryClient(<OrdersSection />);
    await screen.findByText("1 pedido");

    await user.click(screen.getByRole("tab", { name: "Entregados" }));
    await waitFor(() =>
      expect(mockGetOrders).toHaveBeenCalledWith(1, 5, undefined, "entregados"),
    );

    pickDay("2026-07-13");
    await waitFor(() =>
      expect(mockGetOrders).toHaveBeenCalledWith(1, 5, "2026-07-13", "entregados"),
    );
  });

  it("cambiar de pestaña empieza una foto nueva: el primer refetch de esa vista no avisa", async () => {
    const { user } = renderWithQueryClient(<OrdersSection />);
    await screen.findByText("1 pedido");

    // Id distinto al de la pestaña anterior — mismo motivo que el caso análogo
    // de cambio de página: mientras la nueva pestaña carga, `keepPreviousData`
    // sigue mostrando los pedidos de la pestaña vieja bajo la key nueva (sin
    // foto previa), y si el pedido "nuevo" comparte id con uno de esos, se lee
    // como un cambio de ese pedido en vez de como una vista sin historial.
    mockGetOrders.mockResolvedValue(
      makeOrdersPage([makeAdminOrder({ id: 200, status: "delivered" })]),
    );
    await user.click(screen.getByRole("tab", { name: "Entregados" }));
    await waitFor(() =>
      expect(mockGetOrders).toHaveBeenCalledWith(1, 5, undefined, "entregados"),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(mockToast).not.toHaveBeenCalled();
  });

  // ── Botón de impresión (solo en "Pendientes de enviar") ──

  it("el botón de imprimir pendientes solo aparece en la pestaña «Pendientes de enviar»", async () => {
    const { user } = renderWithQueryClient(<OrdersSection />);
    await screen.findByText("1 pedido");

    expect(
      screen.getByRole("button", { name: "Imprimir pendientes" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Entregados" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Imprimir pendientes" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("sin pedidos pendientes de enviar, oculta el botón de imprimir y avisa", async () => {
    mockGetOrders.mockResolvedValue(makeOrdersPage([]));
    renderWithQueryClient(<OrdersSection />);

    await screen.findByText("No hay pedidos pendientes de enviar");
    expect(
      screen.queryByRole("button", { name: "Imprimir pendientes" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Nada pendiente por imprimir")).toBeInTheDocument();
  });

  it("el chequeo de impresión ignora el filtro de día: con pendientes en otro día, el botón se muestra", async () => {
    // Vista filtrada por día sin pedidos, pero el chequeo sin filtro (perPage:1)
    // sí encuentra pendientes en otras fechas.
    mockGetOrders.mockImplementation(async (_page, perPage) =>
      perPage === 1 ? makeOrdersPage([makeAdminOrder()], { total: 1 }) : makeOrdersPage([]),
    );
    renderWithQueryClient(<OrdersSection />);
    await screen.findByText("No hay pedidos pendientes de enviar");

    pickDay("2026-07-13");
    await screen.findByText("Sin pedidos ese día");

    expect(
      await screen.findByRole("button", { name: "Imprimir pendientes" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Nada pendiente por imprimir")).not.toBeInTheDocument();
  });

  it("deshabilita el botón de refrescar mientras hay una petición en vuelo", async () => {
    let resolve: (value: ReturnType<typeof makeOrdersPage>) => void = () => {};
    mockGetOrders.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderWithQueryClient(<OrdersSection />);

    expect(screen.getByRole("button", { name: "Actualizar pedidos" })).toBeDisabled();

    await act(async () => {
      resolve(makeOrdersPage([makeAdminOrder()]));
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(screen.getByRole("button", { name: "Actualizar pedidos" })).toBeEnabled();
  });
});
