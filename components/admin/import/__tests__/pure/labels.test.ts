import { ImportActionSchema } from "@/lib/api/adminProductImport";
import {
  ACTION_META,
  RESULT_META,
  brokenDependencyNotice,
  commitSummaryNotice,
  pieceCount,
  rowCount,
} from "../../labels";

// Copy centralizada: varios componentes describen las mismas acciones y no pueden divergir.
// Lo que se prueba aquí es la parte con lógica (pluralización y ramas), más la exhaustividad de
// los mapas — que un badge se quede sin entrada es un `undefined` en pantalla.

describe("cobertura de los mapas de copy", () => {
  it("ACTION_META cubre todas las acciones del contrato", () => {
    for (const action of ImportActionSchema.options) {
      expect(ACTION_META[action]?.label).toBeTruthy();
      expect(ACTION_META[action]?.description).toBeTruthy();
    }
  });

  it("RESULT_META cubre todos los estados de resultado del commit", () => {
    for (const status of ["created", "updated", "unchanged", "error"]) {
      expect(RESULT_META[status]?.label).toBeTruthy();
    }
  });
});

describe("pluralización", () => {
  it("rowCount y pieceCount concuerdan en singular y plural", () => {
    expect(rowCount(1)).toBe("1 fila");
    expect(rowCount(2)).toBe("2 filas");
    expect(rowCount(0)).toBe("0 filas");
    expect(pieceCount(1)).toBe("1 pieza");
    expect(pieceCount(3)).toBe("3 piezas");
  });
});

describe("resumen del commit", () => {
  it("omite los contadores en cero y concuerda cada uno por separado", () => {
    expect(commitSummaryNotice({ created: 1, updated: 2, unchanged: 0, failed: 0 })).toBe(
      "1 producto creado · 2 actualizados"
    );
    expect(commitSummaryNotice({ created: 2, updated: 1, unchanged: 3, failed: 1 })).toBe(
      "2 productos creados · 1 actualizado · 3 sin cambios · 1 con error"
    );
  });

  it("dice algo legible cuando no se aplicó nada", () => {
    expect(commitSummaryNotice({ created: 0, updated: 0, unchanged: 0, failed: 0 })).toBe(
      "No se aplicó ninguna fila."
    );
  });
});

describe("aviso de dependencia rota", () => {
  it("nombra la fila proveedora por su FOLIO del Excel", () => {
    // El folio es lo que el dueño ve en su hoja; el índice interno no le sirve de nada.
    expect(brokenDependencyNotice(7, "BTA-9")).toContain("La fila 7");
    expect(brokenDependencyNotice(7, "BTA-9")).toContain("«BTA-9»");
  });

  it("cambia de mensaje cuando ninguna fila crea el producto", () => {
    const notice = brokenDependencyNotice(null, "BTA-9");
    expect(notice).toContain("Ninguna fila seleccionada crea");
    expect(notice).not.toContain("La fila");
  });
});
