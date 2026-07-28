"use client";

import { create } from "zustand";
import {
  importReducer,
  initialImportState,
  localErrorsFor,
  selectableIndexes,
  type ImportEvent,
} from "@/components/admin/import/importReducer";
import type { ImportState } from "@/components/admin/import/types";

// Estado de la importación por Excel. Vive fuera del árbol de componentes a propósito.
//
// `app/admin/page.tsx` monta las secciones condicionalmente, así que un clic en el Sidebar
// DESMONTA la sección activa. Con el estado en `useState`/`useReducer` local, cambiar de
// pestaña destruiría una revisión a medias (el archivo analizado, las filas corregidas a mano,
// la selección) sin ninguna forma de recuperarla salvo volver a subir el archivo y rehacer
// todo. Aquí sobrevive a ir y volver.
//
// SIN `persist` a propósito, al revés que cartStore/authStore: un plan restaurado tras recargar
// se calculó contra un catálogo que pudo cambiar (otro admin editó un producto, entró un
// pedido), y presentarlo como fresco es la misma mentira que mostrar un diff desactualizado,
// pero más difícil de notar. Perder la revisión molesta; aplicar un restock irreversible sobre
// datos viejos, no. Gana perder.

interface ImportStore {
  state: ImportState;
  dispatch: (event: ImportEvent) => void;
}

export const useImportStore = create<ImportStore>()((set, get) => ({
  state: initialImportState,
  dispatch: (event) => set({ state: importReducer(get().state, event) }),
}));

/**
 * Cuántas filas quedan por aplicar en una revisión viva. El Sidebar la pinta como badge en
 * "Importar" para que el dueño vea que su revisión sigue ahí tras cambiar de sección.
 */
export function usePendingImportCount(): number | undefined {
  return useImportStore((store) => {
    const { phase, plan } = store.state;
    if (phase !== "reviewing" || !plan) return undefined;
    // Exactamente el mismo cálculo que el "Vas a aplicar" del toolbar (filas seleccionadas, sin
    // errores de captura y sin candado). Contarlo aparte dejaba el badge por encima del toolbar
    // cuando había filas con errores locales, y dos números distintos para lo mismo en la misma
    // pantalla es justo lo que erosiona la confianza en esta revisión.
    const count = selectableIndexes(store.state, localErrorsFor(store.state)).length;
    return count > 0 ? count : undefined;
  });
}
