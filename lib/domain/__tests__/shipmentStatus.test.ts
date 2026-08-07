import { SHIPMENT_STATUS_LABELS, isKnownShipmentStatus, shipmentStatusLabel } from "../shipmentStatus";

// Skydropx reporta un string crudo, NO un enum cerrado validado por el backend:
// lo que de verdad hay que probar es el fallback ante un status desconocido, no
// solo los valores mapeados — de eso depende que la página nunca muestre la clave
// cruda o reviente ante un status nuevo del carrier.

describe("shipmentStatusLabel", () => {
  it("traduce cada status conocido de la tabla", () => {
    for (const [raw, label] of Object.entries(SHIPMENT_STATUS_LABELS)) {
      expect(shipmentStatusLabel(raw)).toBe(label);
    }
  });

  it("no distingue mayúsculas/minúsculas", () => {
    expect(shipmentStatusLabel("IN_TRANSIT")).toBe("En tránsito");
    expect(shipmentStatusLabel("In_Transit")).toBe("En tránsito");
  });

  it("cae a un fallback legible para un status desconocido", () => {
    expect(shipmentStatusLabel("out_for_delivery_retry")).toBe("Out for delivery retry");
    expect(shipmentStatusLabel("weird_new_status")).toBe("Weird new status");
  });

  it("el fallback capitaliza solo la primera letra", () => {
    expect(shipmentStatusLabel("something_else")).toBe("Something else");
  });
});

describe("isKnownShipmentStatus", () => {
  it("es true para un status de la tabla, en cualquier capitalización", () => {
    expect(isKnownShipmentStatus("delivered")).toBe(true);
    expect(isKnownShipmentStatus("DELIVERED")).toBe(true);
  });

  it("es false para un status fuera de la tabla", () => {
    expect(isKnownShipmentStatus("weird_new_status")).toBe(false);
  });
});
