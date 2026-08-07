import { computeTotals, mapCartItemsToOrderItems, cartLineSignature, shippingSignature } from "../cart";
import type { CartItem } from "@/store/cartStore";
import type { Product } from "@/lib/api/products";
import type { ShippingData } from "@/schemas/checkout";

// computeTotals dejó de calcular envío a propósito (Fase 23): una copia local del
// empacado por cajas del backend prometía un envío más barato del que realmente se
// cobraba. Un test que espere un número en `shipping` aquí estaría reintroduciendo
// ese bug. Las firmas (`cartLineSignature`/`shippingSignature`) son la fuente única
// que usan CheckoutContext/ShippingOptions/usePlaceOrder para decidir si una tarifa o
// un cupón cacheados siguen correspondiendo al carrito/cliente actual — un formato
// inconsistente entre ellas rompería ese cacheo en silencio.

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: "Bota vaquera",
    originalPrice: 1000,
    salePrice: 800,
    discountPercent: 20,
    stock: 5,
    type: "bota",
    sizes: [26, 27],
    hasSizes: true,
    images: [],
    imageSrc: null,
    code: null,
    weightKg: 1.5,
    lengthCm: 35,
    widthCm: 25,
    heightCm: 15,
    ...overrides,
  };
}

function makeItem(
  options: { product?: Partial<Product>; size?: number; quantity?: number } = {}
): CartItem {
  const product = makeProduct(options.product);
  const size = options.size ?? 26;
  return {
    id: `${product.id}-${size}`,
    product,
    size,
    quantity: options.quantity ?? 1,
  };
}

describe("computeTotals", () => {
  it("devuelve todo en cero y shipping null para un carrito vacío", () => {
    expect(computeTotals([])).toEqual({
      subtotal: 0,
      savings: 0,
      shipping: null,
      total: 0,
    });
  });

  it("suma subtotal sobre originalPrice y savings sobre la diferencia con salePrice", () => {
    const items = [
      makeItem({ product: makeProduct({ id: 1, originalPrice: 1000, salePrice: 800 }), quantity: 2 }),
      makeItem({ product: makeProduct({ id: 2, originalPrice: 500, salePrice: 500 }), quantity: 1 }),
    ];

    const totals = computeTotals(items);

    expect(totals.subtotal).toBe(2500); // 1000*2 + 500*1
    expect(totals.savings).toBe(400); // (1000-800)*2 + 0*1
    expect(totals.total).toBe(2100); // subtotal - savings
  });

  it("nunca calcula shipping: siempre null, sin importar el contenido del carrito", () => {
    const items = [makeItem({ quantity: 3 })];
    expect(computeTotals(items).shipping).toBeNull();
  });
});

describe("mapCartItemsToOrderItems", () => {
  it("proyecta productId, size y quantity", () => {
    const items = [
      makeItem({ product: makeProduct({ id: 7 }), size: 26, quantity: 2 }),
      makeItem({ product: makeProduct({ id: 8 }), size: 0, quantity: 1 }),
    ];

    expect(mapCartItemsToOrderItems(items)).toEqual([
      { productId: 7, size: 26, quantity: 2 },
      { productId: 8, size: 0, quantity: 1 },
    ]);
  });

  it("devuelve un arreglo vacío para un carrito vacío", () => {
    expect(mapCartItemsToOrderItems([])).toEqual([]);
  });
});

describe("cartLineSignature", () => {
  it("concatena id:size:quantity por renglón, separado por |", () => {
    const items = [
      makeItem({ product: makeProduct({ id: 1 }), size: 26, quantity: 2 }),
      makeItem({ product: makeProduct({ id: 2 }), size: 27, quantity: 1 }),
    ];
    expect(cartLineSignature(items)).toBe("1:26:2|2:27:1");
  });

  it("es una cadena vacía para un carrito vacío", () => {
    expect(cartLineSignature([])).toBe("");
  });

  it("distingue carritos con el mismo producto pero distinta talla o cantidad", () => {
    const a = [makeItem({ product: makeProduct({ id: 1 }), size: 26, quantity: 1 })];
    const b = [makeItem({ product: makeProduct({ id: 1 }), size: 27, quantity: 1 })];
    const c = [makeItem({ product: makeProduct({ id: 1 }), size: 26, quantity: 2 })];

    expect(cartLineSignature(a)).not.toBe(cartLineSignature(b));
    expect(cartLineSignature(a)).not.toBe(cartLineSignature(c));
  });
});

describe("shippingSignature", () => {
  const customer: ShippingData = {
    fullName: "Juan Pérez",
    email: "juan@example.com",
    phone: "1234567890",
    street: "Calle 1",
    neighborhood: "Centro",
    city: "Celaya",
    state: "Guanajuato",
    postalCode: "38000",
  };

  it("combina cartLineSignature y el cliente serializado con #", () => {
    const items = [makeItem({ product: makeProduct({ id: 1 }), size: 26, quantity: 1 })];
    expect(shippingSignature(items, customer)).toBe(
      `${cartLineSignature(items)}#${JSON.stringify(customer)}`
    );
  });

  it("cambia si cambia el cliente, aunque el carrito sea el mismo", () => {
    const items = [makeItem({ product: makeProduct({ id: 1 }), size: 26, quantity: 1 })];
    const otherCustomer = { ...customer, postalCode: "38010" };

    expect(shippingSignature(items, customer)).not.toBe(
      shippingSignature(items, otherCustomer)
    );
  });
});
