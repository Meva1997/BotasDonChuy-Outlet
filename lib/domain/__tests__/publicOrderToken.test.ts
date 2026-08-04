import {
  extractPublicOrderToken,
  isOwnOrderTrackingUrl,
  isPublicOrderToken,
} from "../publicOrderToken";

// El token es la credencial de GET /api/orders/lookup/:token, y lo que el
// comprador pega en /pedido es lo que copió del correo: casi nunca el UUID pelón,
// casi siempre el enlace entero (a veces con espacios de más, a veces envuelto por
// el cliente de correo). Lo que este módulo debe garantizar es que ese enlace se
// convierta en una consulta y que la basura NO gaste una de las 30 req/min.

const TOKEN = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

describe("isPublicOrderToken", () => {
  it("acepta un UUID con el formato del backend", () => {
    expect(isPublicOrderToken(TOKEN)).toBe(true);
  });

  it("ignora los espacios alrededor", () => {
    expect(isPublicOrderToken(`  ${TOKEN}  `)).toBe(true);
  });

  it("acepta mayúsculas (el backend compara sin distinguirlas)", () => {
    expect(isPublicOrderToken(TOKEN.toUpperCase())).toBe(true);
  });

  it("rechaza lo que no tiene forma de UUID", () => {
    expect(isPublicOrderToken("")).toBe(false);
    expect(isPublicOrderToken("mi pedido")).toBe(false);
    expect(isPublicOrderToken("12345")).toBe(false);
    // Un carácter de más o de menos en un grupo ya no es un UUID.
    expect(isPublicOrderToken(`${TOKEN}a`)).toBe(false);
    expect(isPublicOrderToken(TOKEN.slice(0, -1))).toBe(false);
    // 'g' no es hexadecimal.
    expect(isPublicOrderToken("gf2504e0-4f89-41d3-9a0c-0305e82c3301")).toBe(
      false
    );
  });
});

describe("extractPublicOrderToken", () => {
  it("devuelve el token cuando le pasan el token", () => {
    expect(extractPublicOrderToken(TOKEN)).toBe(TOKEN);
  });

  // El caso real: la gente copia el enlace del correo, no el UUID.
  it("saca el token de la URL completa del correo", () => {
    expect(
      extractPublicOrderToken(`https://botasdonchuy.com/pedido/${TOKEN}`)
    ).toBe(TOKEN);
  });

  it("tolera barra final, query y hash", () => {
    expect(extractPublicOrderToken(`https://x.com/pedido/${TOKEN}/`)).toBe(
      TOKEN
    );
    expect(
      extractPublicOrderToken(`https://x.com/pedido/${TOKEN}?utm_source=email`)
    ).toBe(TOKEN);
    expect(extractPublicOrderToken(`https://x.com/pedido/${TOKEN}#resumen`)).toBe(
      TOKEN
    );
  });

  it("normaliza a minúsculas para no depender de cómo se pegó", () => {
    expect(extractPublicOrderToken(TOKEN.toUpperCase())).toBe(TOKEN);
    expect(
      extractPublicOrderToken(`https://x.com/pedido/${TOKEN.toUpperCase()}`)
    ).toBe(TOKEN);
  });

  it("sobrevive al texto que arrastra el copiar/pegar de un correo", () => {
    expect(
      extractPublicOrderToken(
        `Ver el estado de mi pedido: https://botasdonchuy.com/pedido/${TOKEN} — Botas Don Chuy`
      )
    ).toBe(TOKEN);
  });

  // Esto es lo que evita gastar una consulta del límite de 30/min.
  it("devuelve null cuando no hay nada con forma de token", () => {
    expect(extractPublicOrderToken("")).toBeNull();
    expect(extractPublicOrderToken("   ")).toBeNull();
    expect(extractPublicOrderToken("mi pedido de botas")).toBeNull();
    expect(extractPublicOrderToken("https://botasdonchuy.com/pedido/")).toBeNull();
    expect(extractPublicOrderToken("#128")).toBeNull();
  });
});

// El botón "Rastrear" de /pedido/<token> promete el sitio de la paquetería. Lo
// que este helper decide es qué NO es la paquetería: si se cuela nuestro propio
// enlace, el comprador acaba en la página en la que ya estaba.
describe("isOwnOrderTrackingUrl", () => {
  it("reconoce nuestro enlace de seguimiento en desarrollo y en producción", () => {
    expect(isOwnOrderTrackingUrl(`http://localhost:3000/pedido/${TOKEN}`)).toBe(
      true
    );
    expect(
      isOwnOrderTrackingUrl(`https://botasdonchuy.com/pedido/${TOKEN}`)
    ).toBe(true);
  });

  it("tolera barra final, query y hash", () => {
    expect(isOwnOrderTrackingUrl(`https://x.com/pedido/${TOKEN}/`)).toBe(true);
    expect(isOwnOrderTrackingUrl(`https://x.com/pedido/${TOKEN}?ref=mail`)).toBe(
      true
    );
    expect(isOwnOrderTrackingUrl(`https://x.com/pedido/${TOKEN}#resumen`)).toBe(
      true
    );
  });

  it("también reconoce el buscador sin token", () => {
    expect(isOwnOrderTrackingUrl("https://botasdonchuy.com/pedido")).toBe(true);
    expect(isOwnOrderTrackingUrl("https://botasdonchuy.com/pedido/")).toBe(true);
  });

  it("deja pasar el rastreo real de una paquetería", () => {
    expect(
      isOwnOrderTrackingUrl("https://www.estafeta.com/rastreo/42342309487238409")
    ).toBe(false);
    expect(
      isOwnOrderTrackingUrl("https://www.fedex.com/fedextrack/?trknbr=7712")
    ).toBe(false);
  });

  // El caso que obliga a exigir el UUID: una paquetería mexicana bien puede tener
  // "pedido" en la ruta, y descartar su enlace dejaría al comprador sin rastreo.
  it("no confunde un /pedido/<folio> ajeno con el nuestro", () => {
    expect(isOwnOrderTrackingUrl("https://carrier.com/pedido/12345")).toBe(
      false
    );
    expect(isOwnOrderTrackingUrl("https://carrier.com/pedido/ABC-99/estado")).toBe(
      false
    );
  });
});
