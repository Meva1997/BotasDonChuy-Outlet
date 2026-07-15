// Copy de las confirmaciones del catálogo. Vive aquí y no en cada vista porque
// el borrado se dispara desde dos lugares —la tabla de ProductCategoryView y el
// propio ProductForm— y ambos deben decir exactamente lo mismo.

// El backend hace soft-delete cuando el producto tiene pedidos asociados: se
// oculta en vez de borrarse, y hay que decirlo (el admin verá que sigue en el
// historial). `name` es opcional: si la fila ya no está a mano, se degrada a una
// frase genérica en vez de imprimir unas comillas vacías.
export function deleteNotice(
  name: string | undefined,
  softDeleted: boolean,
): string {
  const label = name ? `«${name}»` : "El producto";
  return softDeleted
    ? `${label} se ocultó del catálogo porque tiene pedidos asociados (se conserva para el historial).`
    : `${label} se eliminó.`;
}

export function saveNotice(name: string, isEditing: boolean): string {
  return isEditing ? `«${name}» se guardó.` : `«${name}» se agregó al catálogo.`;
}
