import { fireEvent, screen } from "@testing-library/react";
import { MAX_IMPORT_FILE_BYTES } from "@/lib/api/adminProductImport";
import ImportDropzone, { TEMPLATE_HREF, validateImportFile } from "../../ImportDropzone";
import { COPY } from "../../labels";
import { makeXlsxFile, XLSX_MIME } from "../helpers/factories";
import { renderWithUser } from "../helpers/render";

// La puerta de entrada. Espeja los límites del backend para no gastar una petición en un archivo
// que va a rebotar, y —más importante— nunca elige por el dueño cuál archivo se importa: aplicar
// el equivocado suma stock que no se puede deshacer.

function setup(props: Partial<React.ComponentProps<typeof ImportDropzone>> = {}) {
  const onFile = jest.fn();
  const onReject = jest.fn();
  const utils = renderWithUser(
    <ImportDropzone onFile={onFile} onReject={onReject} error={null} {...props} />
  );
  return { onFile, onReject, ...utils };
}

/** El `<input type="file">` está oculto (lo dispara el botón), así que se busca por el DOM. */
function fileInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector<HTMLInputElement>('input[type="file"]')!;
}

/**
 * El área que escucha el drop es el contenedor punteado. Se apunta a su título y se deja que el
 * evento burbuje (React delega en la raíz), que es más estable que caminar el DOM por índices.
 */
function dropzone(): HTMLElement {
  return screen.getByText(COPY.dropzoneTitle);
}

/** jsdom no implementa DataTransfer: se pasa un doble con lo único que el componente lee. */
function dataTransfer({ files = [], isDirectory = false }: { files?: File[]; isDirectory?: boolean }) {
  return {
    files,
    items: files.map(() => ({ webkitGetAsEntry: () => ({ isDirectory }) })),
  };
}

describe("validateImportFile", () => {
  it("acepta un .xlsx normal", () => {
    expect(validateImportFile(makeXlsxFile())).toBeNull();
  });

  it("distingue el .xls viejo y dice cómo convertirlo", () => {
    const problem = validateImportFile(makeXlsxFile({ name: "catalogo.xls", type: "" }));
    expect(problem).toMatch(/formato viejo/);
  });

  it("rechaza cualquier otra extensión", () => {
    expect(validateImportFile(makeXlsxFile({ name: "catalogo.csv", type: "text/csv" }))).toMatch(
      /Solo se aceptan archivos \.xlsx/
    );
  });

  it("rechaza un archivo vacío", () => {
    expect(validateImportFile(makeXlsxFile({ size: 0 }))).toBe("El archivo está vacío.");
  });

  it("rechaza lo que pasa el tope de multer, diciendo cuánto pesa", () => {
    const problem = validateImportFile(makeXlsxFile({ size: MAX_IMPORT_FILE_BYTES + 1 }));
    expect(problem).toMatch(/2\.0 MB y el máximo son 2 MB/);
  });

  it("no rechaza por un mimetype ausente o genérico", () => {
    // `file.type` llega vacío o como octet-stream con mucha frecuencia (Windows sin el tipo
    // OOXML registrado, o al arrastrar desde ciertos orígenes): vetar por eso rompería subidas
    // legítimas. La extensión es la autoridad y el backend hace la comprobación dura.
    expect(validateImportFile(makeXlsxFile({ type: "" }))).toBeNull();
    expect(validateImportFile(makeXlsxFile({ type: "application/octet-stream" }))).toBeNull();
  });

  it("veta un mimetype que el navegador SÍ reportó y no es el de .xlsx", () => {
    expect(validateImportFile(makeXlsxFile({ type: "application/pdf" }))).toMatch(
      /no parece un \.xlsx real/
    );
  });
});

describe("elegir el archivo", () => {
  it("entrega un .xlsx válido", () => {
    const { container, onFile, onReject } = setup();
    const file = makeXlsxFile();
    fireEvent.change(fileInput(container), { target: { files: [file] } });

    expect(onFile).toHaveBeenCalledWith(file);
    expect(onReject).not.toHaveBeenCalled();
  });

  it("rechaza uno inválido sin entregarlo", () => {
    const { container, onFile, onReject } = setup();
    fireEvent.change(fileInput(container), {
      target: { files: [makeXlsxFile({ name: "catalogo.csv", type: "text/csv" })] },
    });

    expect(onFile).not.toHaveBeenCalled();
    expect(onReject).toHaveBeenCalledWith(expect.stringMatching(/Solo se aceptan archivos \.xlsx/));
  });

  it("limpia el input para que reelegir el MISMO archivo vuelva a disparar el análisis", () => {
    const { container, onFile } = setup();
    const input = fileInput(container);
    fireEvent.change(input, { target: { files: [makeXlsxFile()] } });
    expect(input.value).toBe("");

    fireEvent.change(input, { target: { files: [makeXlsxFile()] } });
    expect(onFile).toHaveBeenCalledTimes(2);
  });
});

describe("arrastrar y soltar", () => {
  it("acepta un archivo soltado", () => {
    const { onFile } = setup();
    const file = makeXlsxFile();
    fireEvent.drop(dropzone(), { dataTransfer: dataTransfer({ files: [file] }) });
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it("rechaza el lote entero si se sueltan varios archivos", () => {
    // No se toma el primero avisando: el aviso no se alcanzaba a ver (el análisis arranca en la
    // misma pasada y desmonta esto), y elegir por el dueño acaba sumando el stock del archivo
    // equivocado.
    const { onFile, onReject } = setup();
    fireEvent.drop(dropzone(), {
      dataTransfer: dataTransfer({ files: [makeXlsxFile(), makeXlsxFile({ name: "otro.xlsx" })] }),
    });

    expect(onFile).not.toHaveBeenCalled();
    expect(onReject).toHaveBeenCalledWith(expect.stringMatching(/Soltaste 2 archivos/));
  });

  it("rechaza una carpeta soltada", () => {
    const { onFile, onReject } = setup();
    fireEvent.drop(dropzone(), {
      dataTransfer: dataTransfer({ files: [makeXlsxFile()], isDirectory: true }),
    });

    expect(onFile).not.toHaveBeenCalled();
    expect(onReject).toHaveBeenCalledWith(expect.stringMatching(/Soltaste una carpeta/));
  });

  it("no acepta nada mientras está deshabilitado (hay un análisis en curso)", () => {
    const { onFile, onReject } = setup({ disabled: true });
    fireEvent.drop(dropzone(), { dataTransfer: dataTransfer({ files: [makeXlsxFile()] }) });

    expect(onFile).not.toHaveBeenCalled();
    expect(onReject).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /elegir archivo/i })).toBeDisabled();
  });
});

describe("errores y plantilla", () => {
  it("anuncia el rechazo como alert", () => {
    setup({ error: "El archivo está vacío." });
    expect(screen.getByRole("alert")).toHaveTextContent("El archivo está vacío.");
  });

  it("ofrece la plantilla con el encabezado canónico", () => {
    setup();
    const link = screen.getByRole("link", { name: /descargar plantilla/i });
    expect(link).toHaveAttribute("href", TEMPLATE_HREF);
    expect(link).toHaveAttribute("download");
  });

  it("acepta el mimetype OOXML en el input, no solo la extensión", () => {
    const { container } = setup();
    expect(fileInput(container).accept).toContain(XLSX_MIME);
  });
});
