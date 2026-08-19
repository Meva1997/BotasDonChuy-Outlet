import { LEGAL_VERSION, legalVersionLabel } from "../entity";

describe("legalVersionLabel", () => {
  it("formatea la versión ISO como la fecha en prosa del encabezado", () => {
    expect(legalVersionLabel("2026-08-18")).toBe("18 de agosto de 2026");
  });

  it("usa LEGAL_VERSION cuando no se le pasa nada", () => {
    expect(legalVersionLabel()).toBe(legalVersionLabel(LEGAL_VERSION));
  });

  it("NO se corre un día por la zona horaria de la tienda", () => {
    // Esta es la razón de ser del `timeZone: "UTC"`. `new Date("2026-08-01")` se
    // parsea como medianoche UTC; formateado en hora de México (UTC-6) caería en
    // el 31 de julio. Un aviso de privacidad que dice tener una fecha de última
    // actualización distinta a la que se guardó en el pedido es exactamente la
    // discrepancia que la constante compartida existe para evitar.
    expect(legalVersionLabel("2026-08-01")).toBe("1 de agosto de 2026");
    expect(legalVersionLabel("2026-01-01")).toBe("1 de enero de 2026");
  });

  it("LEGAL_VERSION tiene el formato ISO que exige el backend", () => {
    // `createOrderSchema` valida `/^\d{4}-\d{2}-\d{2}$/` y responde 400 si no
    // calza: un typo aquí rompería TODO el checkout, no solo el encabezado.
    expect(LEGAL_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
