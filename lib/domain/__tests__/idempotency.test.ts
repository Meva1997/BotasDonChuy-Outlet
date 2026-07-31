import { newIdempotencyKey } from "../idempotency";

// La clave viaja como header `Idempotency-Key` en POST /api/orders. Lo que
// importa de ella es poco pero es duro: no puede repetirse entre dos intentos de
// compra distintos, no puede pasar de 200 caracteres (el backend responde 400) y
// —sobre todo— no puede LANZAR: `crypto.randomUUID` solo existe en contexto
// seguro, así que abrir el sitio en `http://192.168.x.x:3000` desde el teléfono
// dejaría el checkout entero sin poder pagar.

const realCrypto = globalThis.crypto;

afterEach(() => {
  Object.defineProperty(globalThis, "crypto", {
    value: realCrypto,
    configurable: true,
    writable: true,
  });
});

/** Sustituye `globalThis.crypto` por una versión recortada (o lo elimina). */
function stubCrypto(value: Partial<Crypto> | undefined) {
  Object.defineProperty(globalThis, "crypto", {
    value,
    configurable: true,
    writable: true,
  });
}

describe("newIdempotencyKey", () => {
  it("devuelve una clave distinta en cada llamada", () => {
    const keys = new Set(Array.from({ length: 200 }, () => newIdempotencyKey()));
    expect(keys.size).toBe(200);
  });

  it("cabe en el tope de 200 caracteres del backend", () => {
    expect(newIdempotencyKey().length).toBeLessThanOrEqual(200);
    expect(newIdempotencyKey().length).toBeGreaterThan(0);
  });

  it("usa crypto.randomUUID cuando está disponible", () => {
    const randomUUID = jest.fn(
      () => "11111111-2222-4333-8444-555555555555" as const
    );
    stubCrypto({ randomUUID } as unknown as Partial<Crypto>);

    expect(newIdempotencyKey()).toBe("11111111-2222-4333-8444-555555555555");
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });

  // Contexto NO seguro (http en la red local): randomUUID no existe, pero
  // getRandomValues sí. Es el caso que motivó los fallbacks.
  it("cae a getRandomValues cuando no hay randomUUID", () => {
    const getRandomValues = jest.fn((array: Uint8Array) => {
      array.fill(0xab);
      return array;
    });
    stubCrypto({ getRandomValues } as unknown as Partial<Crypto>);

    const key = newIdempotencyKey();
    expect(getRandomValues).toHaveBeenCalledTimes(1);
    expect(key).toBe("ab".repeat(16));
    expect(key.length).toBeLessThanOrEqual(200);
  });

  it("no lanza cuando no hay WebCrypto en absoluto", () => {
    stubCrypto(undefined);

    const first = newIdempotencyKey();
    const second = newIdempotencyKey();
    expect(first).toBeTruthy();
    expect(first).not.toBe(second);
    expect(first.length).toBeLessThanOrEqual(200);
  });
});
