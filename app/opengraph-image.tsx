import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/domain/brand";

// Imagen que se ve al compartir el sitio (WhatsApp, Facebook, X). Al vivir en la
// raíz de `app/`, la heredan todas las rutas que no definan la suya — la página de
// producto sí define la suya (la foto real de la pieza).
//
// Se genera en build, no en cada request.

export const alt = `${BRAND.name} — Botas, sombreros y ropa vaquera`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ImageResponse no ve las fuentes de next/font (viven en el bundle del navegador),
// así que hay que darle el binario. Si Google Fonts no responde durante el build,
// cae a la serif por defecto: una imagen con la tipografía equivocada es mucho
// mejor que un build roto.
async function loadPlayfair(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700",
      { headers: { "User-Agent": "Mozilla/5.0" } },
    ).then((res) => res.text());

    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!url) return null;

    return await fetch(url).then((res) => res.arrayBuffer());
  } catch {
    return null;
  }
}

export default async function OpenGraphImage() {
  const playfair = await loadPlayfair();

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#15100a",
          fontFamily: playfair ? "Playfair" : "serif",
          position: "relative",
        }}
      >
        {/* Marco interior — el mismo gesto de borde ámbar tenue del sitio */}
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 40,
            bottom: 40,
            left: 40,
            border: "1px solid rgba(251, 191, 36, 0.25)",
          }}
        />

        <div
          style={{
            display: "flex",
            fontSize: 22,
            letterSpacing: 10,
            textTransform: "uppercase",
            color: "rgba(251, 191, 36, 0.7)",
            marginBottom: 34,
          }}
        >
          {BRAND.heroText}
        </div>

        <div style={{ display: "flex", fontSize: 88, color: "#fffbeb" }}>
          {BRAND.namePrimary}
        </div>
        {/* El logo del sitio pone el acento en cursiva, pero aquí solo se registra
            la Playfair regular: pedir `italic` sin la variante haría que satori
            cayera a otra fuente y rompiera la pareja tipográfica. */}
        <div style={{ display: "flex", fontSize: 88, color: "#fbbf24" }}>
          {BRAND.nameAccent}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 40,
            fontSize: 26,
            letterSpacing: 2,
            color: "rgba(254, 243, 199, 0.5)",
          }}
        >
          {BRAND.taglineLines.join(" ")}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: playfair
        ? [{ name: "Playfair", data: playfair, style: "normal", weight: 700 }]
        : [],
    },
  );
}
