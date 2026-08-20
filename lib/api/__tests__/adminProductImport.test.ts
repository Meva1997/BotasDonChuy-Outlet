import {
  adminProductImportKeys,
  commitProductImport,
  importCommitErrorMessage,
  importPreviewErrorMessage,
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ROWS,
  previewProductImport,
  XLSX_MIME_TYPE,
} from "../adminProductImport";
import { installMockApi, type MockApi } from "./helpers/mockApi";
import {
  makeFile,
  makeImportCommit,
  makeImportPreview,
  makeImportRowPlan,
  omit,
} from "./helpers/factories";
import { apiError, networkError } from "./helpers/apiError";

let mock: MockApi;
let warn: jest.SpyInstance;

beforeEach(() => {
  mock = installMockApi();
  warn = jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  mock.restore();
  warn.mockRestore();
});

describe("constantes del contrato", () => {
  it("expone los topes que el backend impone", () => {
    expect(MAX_IMPORT_ROWS).toBe(500);
    expect(MAX_IMPORT_FILE_BYTES).toBe(2 * 1024 * 1024);
    expect(XLSX_MIME_TYPE).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  });
});

describe("previewProductImport", () => {
  it("sube el archivo como multipart en el campo `file`", async () => {
    mock.ok(makeImportPreview());

    await previewProductImport(makeFile({ name: "catalogo.xlsx" }));

    const call = mock.lastCall();
    expect(call.method).toBe("post");
    expect(call.url).toBe("/admin/products/import/preview");
    expect(call.body).toBeInstanceOf(FormData);
    expect((call.body as FormData).get("file")).toBeInstanceOf(File);
  });

  it("pide multipart para que axios ponga el boundary", async () => {
    mock.ok(makeImportPreview());

    await previewProductImport(makeFile());

    expect(String(mock.lastCall().headers["Content-Type"])).toContain(
      "multipart/form-data"
    );
  });

  it("parsea el plan de filas", async () => {
    const preview = makeImportPreview();
    mock.ok(preview);

    await expect(previewProductImport(makeFile())).resolves.toEqual(preview);
  });

  it("conserva `sizeChanges`, donde `added` se SUMA a `before`", async () => {
    // Es el dato más importante de la pantalla: el restock suma, y confundirlo
    // con un reemplazo es exactamente el error que duplica existencia real.
    mock.ok(makeImportPreview());

    const preview = await previewProductImport(makeFile());

    expect(preview.rows[0].sizeChanges).toEqual([
      { size: 26, before: 2, added: 3, after: 5 },
    ]);
  });

  it("conserva `reactivated`, que es un efecto secundario que sorprende en silencio", async () => {
    mock.ok(makeImportPreview({ rows: [makeImportRowPlan({ reactivated: true })] }));

    const preview = await previewProductImport(makeFile());

    expect(preview.rows[0].reactivated).toBe(true);
  });

  it("acepta productId null en un `update` (empareja con un producto que otra fila creará)", async () => {
    // El preview resuelve contra un catálogo VIRTUAL. `dependencies.ts` detecta
    // este caso y avisa; para eso el schema tiene que dejarlo pasar.
    mock.ok(
      makeImportPreview({
        rows: [makeImportRowPlan({ action: "update", productId: null, before: null })],
      })
    );

    const preview = await previewProductImport(makeFile());

    expect(preview.rows[0].productId).toBeNull();
  });

  it("LANZA si una fila trae una acción desconocida (parse ESTRICTO a propósito)", async () => {
    // Una acción que no sabemos pintar se pintaría mal, y el dueño confirmaría
    // una escritura que no entendió. Aquí no hay nada escrito todavía, así que
    // fallar es seguro y reintentar el análisis también.
    mock.ok(makeImportPreview({ rows: [makeImportRowPlan({ action: "merge" as never })] }));

    await expect(previewProductImport(makeFile())).rejects.toThrow();
  });

  it("LANZA si falta el `summary`", async () => {
    mock.ok(omit(makeImportPreview(), "summary"));

    await expect(previewProductImport(makeFile())).rejects.toThrow();
  });
});

describe("commitProductImport", () => {
  it("postea { rows } como JSON", async () => {
    mock.ok(makeImportCommit());

    const rows = [{ row: 2, code: "BV-001", sizes: "26,26,26" }];
    await commitProductImport(rows);

    expect(mock.lastCall().method).toBe("post");
    expect(mock.lastCall().url).toBe("/admin/products/import");
    expect(mock.lastCall().body).toEqual({ rows });
  });

  it("parsea el resultado por fila", async () => {
    const commit = makeImportCommit();
    mock.ok(commit);

    await expect(commitProductImport([])).resolves.toEqual(commit);
  });

  it("ante un 2xx con cuerpo inesperado avisa y devuelve el dato crudo, sin lanzar", async () => {
    // Es el `safeParse` con más razón de ser de toda la capa: el commit YA
    // escribió, y convertir un cuerpo raro en excepción invitaría a un reintento
    // que DUPLICA el stock (el restock suma, y no hay deshacer desde la app).
    const crudo = { resumen: "listo" };
    mock.ok(crudo);

    await expect(commitProductImport([])).resolves.toEqual(crudo);
    expect(warn).toHaveBeenCalledWith(
      "commitProductImport: la respuesta 2xx no valida ImportCommitResponseSchema",
      expect.anything()
    );
  });

  it("tampoco lanza cuando una fila trae un status desconocido", async () => {
    // Mismo motivo: el lote ya se aplicó. Un status que no conocemos es un
    // problema de presentación, nunca una razón para reintentar la escritura.
    const raro = makeImportCommit();
    raro.rows[0].status = "reactivado" as never;
    mock.ok(raro);

    await expect(commitProductImport([])).resolves.toEqual(raro);
    expect(warn).toHaveBeenCalled();
  });

  it("propaga el 409 de doble envío", async () => {
    mock.httpError(409, { message: "Esta misma importación se acaba de aplicar." });

    await expect(commitProductImport([])).rejects.toMatchObject({
      response: { status: 409 },
    });
  });
});

describe("importPreviewErrorMessage", () => {
  it("prefiere el mensaje del backend en un 400 (ya viene en español y es específico)", () => {
    expect(
      importPreviewErrorMessage(apiError(400, "El archivo tiene columnas duplicadas."))
    ).toBe("El archivo tiene columnas duplicadas.");
  });

  it("tiene copia propia para un 400 sin mensaje", () => {
    expect(importPreviewErrorMessage(apiError(400))).toMatch(/sea un \.xlsx válido/);
  });

  it("explica el tope de peso en un 413", () => {
    expect(importPreviewErrorMessage(apiError(413))).toMatch(/más de 2 MB/);
  });

  it("prefiere el mensaje del backend también en un 413", () => {
    expect(importPreviewErrorMessage(apiError(413, "Archivo demasiado grande."))).toBe(
      "Archivo demasiado grande."
    );
  });

  it("en un 5xx usa copia propia y NO el mensaje del backend", () => {
    // Un 500 trae un texto de infraestructura que no le dice nada al dueño.
    expect(importPreviewErrorMessage(apiError(500, "ECONNRESET"))).toMatch(
      /problema en el servidor al leer el archivo/
    );
  });

  it("distingue 'no pudimos conectar' cuando la petición nunca llegó", () => {
    expect(importPreviewErrorMessage(networkError())).toMatch(/No pudimos conectar/);
  });

  it("ignora un `message` vacío o de puros espacios y cae al de respaldo", () => {
    expect(importPreviewErrorMessage(apiError(400, "   "))).toMatch(
      /sea un \.xlsx válido/
    );
  });

  it("cae al genérico ante algo que no es un AxiosError", () => {
    expect(importPreviewErrorMessage(new Error("boom"))).toBe(
      "No pudimos analizar el archivo. Inténtalo de nuevo."
    );
  });

  it("cae al genérico ante un status intermedio no contemplado", () => {
    expect(importPreviewErrorMessage(apiError(418))).toBe(
      "No pudimos analizar el archivo. Inténtalo de nuevo."
    );
  });
});

describe("importCommitErrorMessage", () => {
  it("muestra tal cual el 409 de doble envío, sin genérico encima", () => {
    expect(
      importCommitErrorMessage(
        apiError(409, "Esta misma importación se acaba de aplicar hace 12 segundos.")
      )
    ).toBe("Esta misma importación se acaba de aplicar hace 12 segundos.");
  });

  it("tiene copia propia para un 409 sin mensaje, y explica POR QUÉ no reintentar", () => {
    expect(importCommitErrorMessage(apiError(409))).toMatch(/duplicaría las piezas/);
  });

  it("tiene copia propia para un 400 sin mensaje", () => {
    expect(importCommitErrorMessage(apiError(400))).toMatch(/Vuelve a analizar el archivo/);
  });

  it("prefiere el mensaje del backend en un 400", () => {
    expect(importCommitErrorMessage(apiError(400, "La fila 4 trae una talla inválida."))).toBe(
      "La fila 4 trae una talla inválida."
    );
  });

  it("en un 5xx avisa que PARTE pudo haberse aplicado", () => {
    // Lo importante no es el error: es que el dueño revise el catálogo antes de
    // reintentar, porque una aplicación parcial ya escribió.
    expect(importCommitErrorMessage(apiError(500))).toMatch(
      /parte de la importación pudo haberse aplicado/
    );
  });

  it("ante un fallo de red admite que NO SABEMOS si se aplicó", () => {
    // Es el mensaje más honesto de la capa: la petición pudo haber llegado y la
    // respuesta perderse. Decir "no se aplicó" invitaría a duplicar el stock.
    expect(importCommitErrorMessage(networkError())).toMatch(/No sabemos si la importación se aplicó/);
  });

  it("cae al genérico ante algo que no es un AxiosError", () => {
    expect(importCommitErrorMessage(new Error("boom"))).toBe(
      "No pudimos aplicar la importación. Revisa el catálogo antes de reintentar."
    );
  });
});

describe("adminProductImportKeys", () => {
  it("expone una key estable", () => {
    expect(adminProductImportKeys.all).toEqual(["adminProductImport"]);
  });
});
