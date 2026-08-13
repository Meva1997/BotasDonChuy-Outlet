// Intercepta el `<a download>` sintético con el que ambos reportes exportan su
// CSV. jsdom no implementa `URL.createObjectURL` (ni navegación por `click()`),
// así que sin esto la exportación revienta antes de generar nada.
//
// Devuelve el Blob real, que es donde vive lo que de verdad importa: el BOM que
// hace que Excel lea los acentos, y el escapado RFC 4180 de `csvField`.
export function captureDownload() {
  const captured: { blob: Blob | null; filename: string | null } = {
    blob: null,
    filename: null,
  };

  const createObjectURL = jest.fn((blob: Blob) => {
    captured.blob = blob;
    return "blob:mock";
  });
  const revokeObjectURL = jest.fn();

  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    writable: true,
    value: createObjectURL,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    writable: true,
    value: revokeObjectURL,
  });

  const clickSpy = jest
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(function (this: HTMLAnchorElement) {
      captured.filename = this.download;
    });

  // Todo lo que se expone lee el closure `captured` al vuelo, nunca una copia: el
  // Blob y el nombre de archivo se llenan DESPUÉS de este return (cuando el
  // componente exporta), así que un `...captured` dejaría congelados los `null`
  // del momento de creación y cualquier aserción sobre ellos sería vacua. El Blob
  // no se expone crudo a propósito — se lee por `text()`/`rows()`/`mimeType`.
  return {
    get filename() {
      return captured.filename;
    },
    /**
     * El CSV completo, **BOM incluido**.
     *
     * Se lee como ArrayBuffer y se decodifica a mano a propósito: el Blob de
     * jsdom no implementa `.text()`, y `FileReader.readAsText` sí existe pero se
     * come el BOM (lo trata como marca de codificación y no como contenido),
     * que es justamente lo que hay que poder afirmar.
     */
    async text(): Promise<string> {
      if (!captured.blob) throw new Error("No se generó ningún archivo");
      const blob = captured.blob;
      const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(blob);
      });
      return Buffer.from(buffer).toString("utf8");
    },
    /** El CSV en renglones, ya sin el BOM. */
    async rows() {
      return (await this.text()).replace(/^﻿/, "").split("\n");
    },
    get mimeType() {
      return captured.blob?.type ?? null;
    },
    revokeObjectURL,
    restore() {
      clickSpy.mockRestore();
    },
  };
}
