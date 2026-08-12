import { deleteNotice, saveNotice } from "../notices";

// Copy compartida por ProductCategoryView y ProductForm — un mensaje que diverja
// entre los dos lugares que borran un producto sería confuso ("se eliminó" en uno,
// "se ocultó" en el otro para la misma acción). `name` ausente es una rama real:
// ProductCategoryView la dispara si el producto ya no está en `products` cuando
// la mutation resuelve (p. ej. la lista se refrescó entre el clic y la respuesta).

describe("deleteNotice", () => {
  it("hard delete: cita el nombre entre comillas", () => {
    expect(deleteNotice("Bota vaquera", false)).toBe("«Bota vaquera» se eliminó.");
  });

  it("soft delete: avisa que se ocultó por tener pedidos asociados", () => {
    expect(deleteNotice("Bota vaquera", true)).toBe(
      "«Bota vaquera» se ocultó del catálogo porque tiene pedidos asociados (se conserva para el historial)."
    );
  });

  it("sin nombre (hard delete), cae a la frase genérica", () => {
    expect(deleteNotice(undefined, false)).toBe("El producto se eliminó.");
  });

  it("sin nombre (soft delete), cae a la frase genérica", () => {
    expect(deleteNotice(undefined, true)).toBe(
      "El producto se ocultó del catálogo porque tiene pedidos asociados (se conserva para el historial)."
    );
  });
});

describe("saveNotice", () => {
  it("creando, dice que se agregó al catálogo", () => {
    expect(saveNotice("Bota vaquera", false)).toBe("«Bota vaquera» se agregó al catálogo.");
  });

  it("editando, dice que se guardó", () => {
    expect(saveNotice("Bota vaquera", true)).toBe("«Bota vaquera» se guardó.");
  });
});
