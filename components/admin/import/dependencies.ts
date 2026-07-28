import type { ImportPreviewResponse } from "@/lib/api/adminProductImport";
import type { ImportState } from "./types";

// Dependencias entre filas del MISMO archivo.
//
// El preview no resuelve cada fila contra la base de datos a secas, sino contra un catálogo
// VIRTUAL: el estado real más lo que las filas anteriores del archivo ya proyectaron. Por eso
// la fila 2 puede crear "BTA-9" y la fila 5 restockearlo, y el preview lo muestra como un
// update aunque ese producto todavía no exista.
//
// La consecuencia práctica es que DESELECCIONAR una fila cambia el resultado de las filas
// posteriores que dependían de ella: si se quita la que crea BTA-9 pero se deja la que le suma
// stock, esa segunda fila ya no actualizará nada — creará un producto distinto al previsto (con
// solo las piezas de esa fila) o fallará. El preview no puede saberlo porque se calculó antes.

/** Igual que el backend: código si lo hay, si no el nombre; ambos normalizados. */
function identityOf(code: string | null | undefined, name: string | null | undefined): string | null {
  const trimmedCode = code?.trim();
  if (trimmedCode) return `code:${trimmedCode.toLowerCase()}`;
  const trimmedName = name?.trim();
  if (trimmedName) return `name:${trimmedName.toLowerCase()}`;
  return null;
}

/**
 * Identidad EFECTIVA de una fila: la del `input` editado si el usuario tocó código o nombre.
 * Editar el código de la fila que crea BTA-9 rompe a su dependiente igual de bien que
 * deseleccionarla, así que las ediciones tienen que entrar en el cálculo.
 */
function effectiveIdentity(state: ImportState, index: number): string | null {
  const planRow = state.plan?.rows[index];
  if (!planRow) return null;
  const edit = state.edits[index];
  if (!edit) return identityOf(planRow.input.code, planRow.input.name);

  const code = edit.cells.code.presence === "present" ? edit.cells.code.text : undefined;
  const name = edit.cells.name.presence === "present" ? edit.cells.name.text : undefined;
  return identityOf(code, name);
}

export interface RowDependency {
  /** Índice de la fila que depende de otra. */
  index: number;
  /** Índice de la fila que crea el producto, o `null` si ya no hay ninguna que lo provea. */
  providerIndex: number | null;
  /** El proveedor existe, va antes y está seleccionado. */
  satisfied: boolean;
}

export interface DependencyReport {
  byIndex: Record<number, RowDependency>;
  broken: RowDependency[];
  /** Índices de filas `create` que hay que volver a seleccionar para reparar todo. */
  missingProviders: number[];
  /** Dos filas `create` que apuntan al mismo producto — el archivo lo daría de alta dos veces. */
  duplicateCreates: number[][];
}

/**
 * Una fila `update` con `productId === null` está actualizando un producto que NO existe en la
 * base: solo pudo emparejar con la proyección de una fila anterior. Ese es el detector — exacto
 * y barato, sin comparar cadenas para encontrar el caso.
 */
export function analyzeDependencies(state: ImportState): DependencyReport {
  const plan: ImportPreviewResponse | null = state.plan;
  const empty: DependencyReport = {
    byIndex: {},
    broken: [],
    missingProviders: [],
    duplicateCreates: [],
  };
  if (!plan) return empty;

  const applied = new Set(state.applied);

  // Quién crea cada identidad. Gana la primera, igual que el backend al proyectar.
  const providers = new Map<string, number>();
  const createsByIdentity = new Map<string, number[]>();
  plan.rows.forEach((row, index) => {
    if (row.action !== "create") return;
    const identity = effectiveIdentity(state, index);
    if (!identity) return;
    if (!providers.has(identity)) providers.set(identity, index);
    createsByIdentity.set(identity, [...(createsByIdentity.get(identity) ?? []), index]);
  });

  const byIndex: Record<number, RowDependency> = {};
  const broken: RowDependency[] = [];
  const missingProviders = new Set<number>();

  plan.rows.forEach((row, index) => {
    if (row.action !== "update" || row.productId !== null) return;

    const identity = effectiveIdentity(state, index);
    const providerIndex = identity ? providers.get(identity) ?? null : null;

    // Una fila ya aplicada dejó de importar: su producto ahora existe de verdad en la base.
    const providerCovered =
      providerIndex !== null &&
      providerIndex < index &&
      (state.selected[providerIndex] === true || applied.has(providerIndex));

    const dependency: RowDependency = {
      index,
      providerIndex,
      satisfied: providerCovered,
    };
    byIndex[index] = dependency;

    // Solo alarma si la fila dependiente se va a enviar; si está deseleccionada, da igual.
    if (!providerCovered && state.selected[index] && !applied.has(index)) {
      broken.push(dependency);
      if (providerIndex !== null) missingProviders.add(providerIndex);
    }
  });

  const duplicateCreates = [...createsByIdentity.values()].filter((list) => list.length > 1);

  return {
    byIndex,
    broken,
    missingProviders: [...missingProviders].sort((a, b) => a - b),
    duplicateCreates,
  };
}
