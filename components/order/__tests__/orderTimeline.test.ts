import { orderTimeline } from "../orderTimeline";
import type { PublicOrder } from "@/lib/api/orders";

// Lo que esta línea de tiempo tiene que garantizar es una sola cosa, pero es la
// que decide si el comprador llama por WhatsApp o no: nunca debe decir que algo
// ya pasó cuando no ha pasado. `status` y `paymentStatus` son campos
// INDEPENDIENTES en el backend, así que las combinaciones raras (cancelado sin
// reembolso, pendiente con pago fallido) existen de verdad y cada una tiene su
// mensaje.

type Args = Pick<PublicOrder, "status" | "paymentStatus">;

const order = (
  status: PublicOrder["status"],
  paymentStatus: PublicOrder["paymentStatus"]
): Args => ({ status, paymentStatus });

describe("orderTimeline", () => {
  describe("pedido pendiente de pago", () => {
    it("no entra a la línea de progreso", () => {
      expect(orderTimeline(order("pending", "processing")).kind).toBe(
        "awaiting-payment"
      );
      expect(orderTimeline(order("pending", "unpaid")).kind).toBe(
        "awaiting-payment"
      );
    });

    // El comprador que acaba de pagar y recarga la página no debe leer que su
    // pago falló solo porque el webhook aún no llega.
    it("dice 'esperando' mientras el pago sigue en proceso", () => {
      const timeline = orderTimeline(order("pending", "processing"));
      expect(timeline).toMatchObject({
        kind: "awaiting-payment",
        title: "Esperando el pago",
      });
    });

    it("distingue el pago fallido del pago en proceso", () => {
      const timeline = orderTimeline(order("pending", "failed"));
      expect(timeline).toMatchObject({
        kind: "awaiting-payment",
        title: "El pago no se completó",
      });
    });
  });

  describe("pedido cancelado", () => {
    it("rompe la línea en vez de mostrarla a medias", () => {
      expect(orderTimeline(order("cancelled", "failed")).kind).toBe("cancelled");
    });

    // Cancelado ≠ reembolsado: un pending que nunca se pagó no tiene dinero que
    // devolver, y prometerlo generaría justo la llamada que la fase evita.
    it("solo promete devolución cuando el pago se reembolsó", () => {
      expect(orderTimeline(order("cancelled", "refunded"))).toMatchObject({
        kind: "cancelled",
        refunded: true,
      });
      expect(orderTimeline(order("cancelled", "failed"))).toMatchObject({
        kind: "cancelled",
        refunded: false,
      });
      expect(orderTimeline(order("cancelled", "unpaid"))).toMatchObject({
        kind: "cancelled",
        refunded: false,
      });
    });

    // El estado del pago manda sobre el del envío: un pedido cancelado se muestra
    // como cancelado aunque `status` haya pasado por otros valores antes.
    it("gana sobre cualquier otra lectura", () => {
      expect(orderTimeline(order("cancelled", "paid")).kind).toBe("cancelled");
    });
  });

  describe("ciclo normal", () => {
    it("pone 'Preparando tu envío' en curso con el pago confirmado", () => {
      const timeline = orderTimeline(order("paid", "paid"));
      expect(timeline.kind).toBe("progress");
      if (timeline.kind !== "progress") throw new Error("no es progress");

      expect(timeline.currentIndex).toBe(1);
      expect(timeline.steps.map((s) => s.state)).toEqual([
        "done",
        "current",
        "pending",
        "pending",
      ]);
    });

    it("avanza a 'Va en camino' cuando el pedido se envía", () => {
      const timeline = orderTimeline(order("shipped", "paid"));
      if (timeline.kind !== "progress") throw new Error("no es progress");

      expect(timeline.currentIndex).toBe(2);
      expect(timeline.steps[2]).toMatchObject({
        key: "shipped",
        state: "current",
      });
    });

    it("marca todo como cumplido al entregarse", () => {
      const timeline = orderTimeline(order("delivered", "paid"));
      if (timeline.kind !== "progress") throw new Error("no es progress");

      expect(timeline.currentIndex).toBe(3);
      expect(timeline.steps.map((s) => s.state)).toEqual([
        "done",
        "done",
        "done",
        "current",
      ]);
      // Nunca queda un paso "pending" después del actual: sería prometer un paso
      // más allá de la entrega.
      expect(timeline.steps.some((s) => s.state === "pending")).toBe(false);
    });

    // La invariante que importa: ningún paso posterior al actual puede figurar
    // como cumplido, en ninguno de los tres estados del ciclo.
    it.each(["paid", "shipped", "delivered"] as const)(
      "no marca como cumplido nada posterior al paso en curso (%s)",
      (status) => {
        const timeline = orderTimeline(order(status, "paid"));
        if (timeline.kind !== "progress") throw new Error("no es progress");

        timeline.steps.forEach((step, i) => {
          if (i < timeline.currentIndex) expect(step.state).toBe("done");
          if (i === timeline.currentIndex) expect(step.state).toBe("current");
          if (i > timeline.currentIndex) expect(step.state).toBe("pending");
        });
      }
    );

    it("siempre devuelve los cuatro pasos, en el mismo orden", () => {
      const timeline = orderTimeline(order("paid", "paid"));
      if (timeline.kind !== "progress") throw new Error("no es progress");

      expect(timeline.steps.map((s) => s.key)).toEqual([
        "paid",
        "preparing",
        "shipped",
        "delivered",
      ]);
    });
  });
});
