import { render, screen } from "@testing-library/react";
import {
  DropoffBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
  PAYMENT_META,
  ShipmentStatusBadge,
  STATUS_META,
} from "../StatusBadges";

// `status` y `paymentStatus` son campos INDEPENDIENTES que se pintan uno junto al
// otro (fila de OrdersTable, header del modal) — así que STATUS_META y PAYMENT_META
// deben usar familias de color DISJUNTAS, o dos badges en la misma fila se
// confundirían sin leer el texto. Ese invariante se prueba explícitamente porque
// no hay forma de que TypeScript lo garantice: son dos Records que solo un humano
// mantiene sin overlap.

/**
 * Hue único de un badge (p. ej. "amber" de "border-amber-400 text-amber-400") —
 * cada entrada de STATUS_META/PAYMENT_META repite el mismo hue en `border-` y
 * `text-`, así que se deduplica antes de comparar entradas entre sí.
 */
function hueOf(classes: string): string {
  const hues = new Set(
    [...classes.matchAll(/(?:border|text|bg)-([a-z]+)-\d+/g)].map((m) => m[1])
  );
  return [...hues][0];
}

describe("OrderStatusBadge", () => {
  it("pinta la etiqueta correcta para cada status", () => {
    (Object.keys(STATUS_META) as (keyof typeof STATUS_META)[]).forEach((status) => {
      const { unmount } = render(<OrderStatusBadge status={status} />);
      expect(screen.getByText(STATUS_META[status].label)).toBeInTheDocument();
      unmount();
    });
  });
});

describe("PaymentStatusBadge", () => {
  it("pinta la etiqueta correcta para cada paymentStatus", () => {
    (Object.keys(PAYMENT_META) as (keyof typeof PAYMENT_META)[]).forEach((status) => {
      const { unmount } = render(<PaymentStatusBadge status={status} />);
      expect(screen.getByText(PAYMENT_META[status].label)).toBeInTheDocument();
      unmount();
    });
  });
});

describe("DropoffBadge", () => {
  it("avisa que la paquetería no recoge a domicilio", () => {
    render(<DropoffBadge />);
    expect(screen.getByText("Sin recolección")).toBeInTheDocument();
  });
});

describe("ShipmentStatusBadge", () => {
  it("traduce y colorea un status conocido de Skydropx", () => {
    render(<ShipmentStatusBadge status="in_transit" />);
    const el = screen.getByText("En tránsito");
    expect(el.className).toMatch(/border-violet-400/);
    expect(el.className).toMatch(/text-violet-400/);
  });

  it("no distingue mayúsculas al mapear color ni etiqueta", () => {
    render(<ShipmentStatusBadge status="IN_TRANSIT" />);
    const el = screen.getByText("En tránsito");
    expect(el.className).toMatch(/violet-400/);
  });

  it("cae a gris neutro y a una etiqueta legible para un status no mapeado", () => {
    // Skydropx no es un enum cerrado (ver lib/domain/shipmentStatus.ts) — un status
    // fuera de la tabla no debe fingir que sabemos en qué punto del ciclo cae.
    render(<ShipmentStatusBadge status="weird_carrier_status" />);
    const el = screen.getByText("Weird carrier status");
    expect(el.className).toMatch(/border-stone-500/);
    expect(el.className).toMatch(/text-stone-400/);
  });
});

describe("invariante de color STATUS vs PAYMENT", () => {
  it("no comparte ningún hue entre las dos rampas", () => {
    const statusHues = new Set(Object.values(STATUS_META).map((m) => hueOf(m.classes)));
    const paymentHues = new Set(
      Object.values(PAYMENT_META).map((m) => hueOf(m.classes))
    );
    const overlap = [...statusHues].filter((h) => paymentHues.has(h));
    expect(overlap).toEqual([]);
  });

  it("no repite ningún hue dentro de la misma rampa", () => {
    for (const meta of [STATUS_META, PAYMENT_META]) {
      const hues = Object.values(meta).map((m) => hueOf(m.classes));
      expect(new Set(hues).size).toBe(hues.length);
    }
  });
});
