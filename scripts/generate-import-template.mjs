// Genera la plantilla .xlsx de la importación masiva de productos (Fase 13).
//
// Script ONE-OFF: su salida (`public/product-import-template.xlsx`) está versionada en
// el repo y la UI la ofrece como descarga. No corre en el build ni en runtime.
//
// Usa el `exceljs` que YA está instalado en el backend (que es quien lee estos archivos), para
// no meter una dependencia de ~1 MB en el bundle del frontend por una sola descarga estática.
// Por eso hay que resolverlo desde ahí:
//
//   cd frontend
//   NODE_PATH=../backend/node_modules node scripts/generate-import-template.mjs
//
// Al tocar el encabezado canónico o los alias, hay que regenerar el archivo y volver a
// commitearlo. La fuente de verdad de las columnas es HEADER_ALIASES en
// ../backend/src/services/productImport.service.ts.

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const ExcelJS = require("exceljs");

const OUT_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "product-import-template.xlsx"
);

/** Encabezado canónico, en el orden documentado para el dueño. */
const HEADERS = [
  { header: "Código", width: 14 },
  { header: "Nombre", width: 34 },
  { header: "Categoría", width: 13 },
  { header: "Descripción", width: 40 },
  { header: "Precio original", width: 15 },
  { header: "Precio oferta", width: 14 },
  { header: "Costo unitario", width: 15 },
  { header: "Tallas", width: 24 },
  { header: "Peso (kg)", width: 11 },
  { header: "Largo (cm)", width: 11 },
  { header: "Ancho (cm)", width: 11 },
  { header: "Alto (cm)", width: 10 },
  { header: "Visible", width: 9 },
];

// Filas de ejemplo. La segunda es la importante: demuestra la notación `26x20`, que es lo que
// hace usable el restock en una hoja de cálculo (repetir "26," veinte veces no lo es).
const EXAMPLES = [
  {
    values: [
      "BTA-001",
      "Bota Rodeo Café",
      "bota",
      "Piel de res, horma tradicional",
      3200,
      1890,
      1100,
      "25, 26, 26, 27",
      1.5,
      35,
      25,
      15,
      "Sí",
    ],
    note: "Producto nuevo: 4 piezas (una 25, dos 26, una 27).",
  },
  {
    values: [
      "BTA-001",
      "Bota Rodeo Café",
      "",
      "",
      "",
      "",
      "",
      "26x20, 27x5",
      "",
      "",
      "",
      "",
      "",
    ],
    note: "Restock del MISMO producto: suma 20 piezas de la 26 y 5 de la 27. Las columnas vacías no se tocan.",
  },
  {
    values: [
      "SOM-014",
      "Sombrero Lana Negro",
      "sombrero",
      "",
      1400,
      850,
      480,
      "56x3, 58x4",
      0.6,
      40,
      40,
      20,
      "Sí",
    ],
    note: "Otra alta, usando la notación por cantidad desde el inicio.",
  },
];

async function main() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Botas Don Chuy Outlet";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Productos");
  sheet.columns = HEADERS.map((column) => ({
    header: column.header,
    width: column.width,
  }));

  // Encabezado: destacado y congelado, para que no se pierda al bajar en un archivo largo.
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFF7ED" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1C1917" },
  };
  headerRow.alignment = { vertical: "middle" };
  headerRow.height = 22;
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const example of EXAMPLES) {
    const row = sheet.addRow(example.values);
    // El comentario va en la primera celda, para no ensuciar ninguna columna con texto que el
    // importador tendría que interpretar.
    row.getCell(1).note = example.note;
  }

  // "Código" y "Tallas" como TEXTO explícito: si no, Excel autoformatea "1-2" o "25/26" como
  // fecha, y el backend tiene que avisar de una celda con formato de fecha en vez de leer el
  // valor que el dueño tecleó.
  sheet.getColumn(1).numFmt = "@";
  sheet.getColumn(8).numFmt = "@";

  // Segunda hoja con las instrucciones — la plantilla se comparte por WhatsApp sin contexto.
  const help = workbook.addWorksheet("Instrucciones");
  help.columns = [{ width: 24 }, { width: 96 }];
  const lines = [
    ["Cómo llenar esta plantilla", ""],
    ["", ""],
    ["Regla más importante", "Al actualizar un producto, las TALLAS SUMAN piezas al stock guardado — no lo reemplazan. Antes de aplicar vas a ver en pantalla cuánto queda en cada talla."],
    ["", ""],
    ["Emparejamiento", 'Si la fila trae "Código", empareja por código. Si no, por nombre exacto. Sin coincidencia, crea un producto nuevo.'],
    ["Columnas vacías", "Una celda en blanco significa «no cambies esa columna». No borra nada."],
    ["Producto nuevo", "Necesita Nombre, Categoría, los tres precios, Tallas y las cuatro medidas del paquete."],
    ["", ""],
    ["Tallas", '"25, 26, 26" = una pieza de la 25 y dos de la 26.'],
    ["", '"26x20" = veinte piezas de la 26.'],
    ["", 'Se pueden mezclar: "25x3, 26, 27x2".'],
    ["Categoría", "bota · sombrero · ropa"],
    ["Visible", "Sí / No. Si la dejas vacía, no se cambia."],
    ["Precios", "El precio de oferta no puede ser mayor al precio original."],
    ["Medidas", "Del paquete de envío, no del producto. Deben ser mayores que 0 para poder cotizar el envío."],
    ["", ""],
    ["Límites", "Máximo 500 filas y 2 MB por archivo."],
    ["Códigos", 'Formatea la columna "Código" como Texto en Excel si tus códigos llevan guiones (si no, Excel los convierte en fechas).'],
  ];
  for (const [label, text] of lines) {
    const row = help.addRow([label, text]);
    row.getCell(1).font = { bold: true };
    row.getCell(2).alignment = { wrapText: true, vertical: "top" };
  }
  help.getRow(1).font = { bold: true, size: 14 };

  await workbook.xlsx.writeFile(OUT_PATH);
  console.log(`Plantilla escrita en ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
