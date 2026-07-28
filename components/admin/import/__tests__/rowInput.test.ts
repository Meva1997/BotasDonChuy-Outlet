import type { ImportRowInput } from "@/lib/api/adminProductImport";
import {
  coerceField,
  editedFields,
  ingestRow,
  parseNumberText,
  parseSizesSpec,
  serializePristine,
  serializeRowEdit,
  stalenessOf,
  validateRowEdit,
} from "../rowInput";
import { EDITABLE_FIELDS } from "../types";

// Los primeros tests del repo. Cubren el módulo donde vive el riesgo real de la importación:
// si `serializeRowEdit` emite una clave de más, el backend responde 400 y muere el LOTE ENTERO;
// si confunde "ausente" con "vacío", una importación borra datos que nadie pidió borrar.

describe("presencia: ausente vs. vacío", () => {
  it("marca como ausentes las claves que el preview no trajo", () => {
    const edit = ingestRow({ code: "BTA-1", sizes: "26x20" });
    expect(edit.cells.code).toEqual({ presence: "present", text: "BTA-1" });
    expect(edit.cells.name).toEqual({ presence: "absent", text: "" });
    expect(edit.cells.originalPrice.presence).toBe("absent");
  });

  it("omite del payload las claves ausentes, sin emitir null", () => {
    const edit = ingestRow({ code: "BTA-1", sizes: "26x20" });
    const payload = serializeRowEdit(edit, 3);
    expect(payload).toEqual({ row: 3, code: "BTA-1", sizes: "26x20" });
    expect(Object.values(payload)).not.toContain(null);
  });

  it("una descripción presente y vacía SÍ viaja (limpia la del producto)", () => {
    const edit = ingestRow({ name: "Bota", description: "algo" });
    edit.cells.description = { presence: "present", text: "" };
    expect(serializeRowEdit(edit, 2)).toHaveProperty("description", "");
  });

  it("una descripción ausente NO viaja, aunque conserve texto de un toggle previo", () => {
    const edit = ingestRow({ name: "Bota", description: "algo" });
    edit.cells.description = { presence: "absent", text: "algo tecleado" };
    expect(serializeRowEdit(edit, 2)).not.toHaveProperty("description");
  });
});

describe("serialización: whitelist contra el .strict() del backend", () => {
  it("nunca emite una clave fuera del contrato, aunque el preview la devuelva", () => {
    // Simula que el backend agregó un campo al `input` del preview que el commit no acepta.
    const rogue = { name: "Bota", campoNuevo: "x" } as unknown as ImportRowInput;
    const payload = serializePristine(rogue, 5);
    expect(payload).not.toHaveProperty("campoNuevo");
    const allowed = new Set<string>(["row", ...EDITABLE_FIELDS]);
    for (const key of Object.keys(payload)) expect(allowed.has(key)).toBe(true);
  });

  it("no emite valores inválidos: omite el campo en vez de mandar NaN", () => {
    const edit = ingestRow({ name: "Bota", originalPrice: 100 });
    edit.cells.originalPrice = { presence: "present", text: "no soy número" };
    const payload = serializeRowEdit(edit, 1);
    expect(payload).not.toHaveProperty("originalPrice");
  });

  it("convierte `sizes` de number[] a string al ingerir", () => {
    const edit = ingestRow({ sizes: [25, 26, 26] });
    expect(edit.cells.sizes.text).toBe("25, 26, 26");
    expect(serializeRowEdit(edit, 1).sizes).toBe("25, 26, 26");
  });

  it("reenvía el folio para que los mensajes «Fila N:» del backend cuadren", () => {
    expect(serializePristine({ name: "Bota" }, 42).row).toBe(42);
  });
});

describe("coerción numérica", () => {
  it("acepta separador de miles y símbolo de moneda", () => {
    expect(parseNumberText("$1,250.50")).toEqual({ ok: true, value: 1250.5 });
  });

  it("acepta coma decimal (hoja con locale europeo)", () => {
    // Quitar todas las comas leería "1,5" como 15: un peso de 1.5 kg entraría como 15 kg.
    expect(parseNumberText("1,5")).toEqual({ ok: true, value: 1.5 });
  });

  it("rechaza basura en vez de degradarla a 0", () => {
    expect(parseNumberText("abc").ok).toBe(false);
    expect(parseNumberText("1,23,45").ok).toBe(false);
    expect(coerceField("salePrice", "abc").ok).toBe(false);
  });

  it("exige dimensiones mayores que 0 (Skydropx no cotiza con 0)", () => {
    expect(coerceField("weightKg", "0").ok).toBe(false);
    expect(coerceField("weightKg", "1.5")).toEqual({ ok: true, value: 1.5 });
  });

  it("mapea Visible a booleano y rechaza lo ambiguo", () => {
    expect(coerceField("visible", "Sí")).toEqual({ ok: true, value: true });
    expect(coerceField("visible", "no")).toEqual({ ok: true, value: false });
    expect(coerceField("visible", "quizá").ok).toBe(false);
  });
});

describe("tallas", () => {
  it("suma las ocurrencias repetidas", () => {
    const parsed = parseSizesSpec("25, 26, 26");
    expect(parsed.ok && parsed.value).toEqual({
      rows: [
        { size: 25, stock: 1 },
        { size: 26, stock: 2 },
      ],
      total: 3,
    });
  });

  it("entiende la notación por cantidad y la mezcla", () => {
    const parsed = parseSizesSpec("25x3, 26, 27x2");
    expect(parsed.ok && parsed.value.total).toBe(6);
  });

  it("respeta los topes del backend", () => {
    expect(parseSizesSpec("26x99999").ok).toBe(false);
    expect(parseSizesSpec("1000").ok).toBe(false);
    expect(parseSizesSpec("").ok).toBe(false);
  });
});

describe("validación de fila", () => {
  it("marca el precio de oferta mayor al original", () => {
    const edit = ingestRow({ originalPrice: 100, salePrice: 200 });
    expect(validateRowEdit(edit).salePrice).toBeDefined();
  });

  it("no compara precios si solo uno está presente (lo resuelve el backend)", () => {
    const edit = ingestRow({ salePrice: 200 });
    expect(validateRowEdit(edit).salePrice).toBeUndefined();
  });

  it("ignora los campos ausentes", () => {
    expect(validateRowEdit(ingestRow({}))).toEqual({});
  });
});

describe("frescura del diff tras editar", () => {
  it("detecta qué campos cambiaron respecto al archivo", () => {
    const edit = ingestRow({ name: "Bota", salePrice: 100 });
    edit.cells.salePrice = { presence: "present", text: "120" };
    expect(editedFields(edit)).toEqual(["salePrice"]);
  });

  it("no cuenta como edición pasar de ausente a ausente", () => {
    const edit = ingestRow({ name: "Bota" });
    edit.cells.code = { presence: "absent", text: "tecleado y descartado" };
    expect(editedFields(edit)).toEqual([]);
  });

  it("tocar código o nombre invalida TODO el diff (puede emparejar con otro producto)", () => {
    expect(stalenessOf(["code"])).toBe("identity");
    expect(stalenessOf(["name", "salePrice"])).toBe("identity");
    expect(stalenessOf(["salePrice"])).toBe("partial");
    expect(stalenessOf([])).toBe("fresh");
  });
});
