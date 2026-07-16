import type { Metadata } from "next";
import { Playfair_Display, Jost } from "next/font/google";
import "./globals.css";
import CartProvider from "@/components/ui/CartProvider";
import QueryProvider from "@/components/providers/QueryProvider";
import BrandProvider from "@/components/providers/BrandProvider";
import { BRAND } from "@/lib/domain/brand";
import { SITE_KEYWORDS, SITE_URL } from "@/lib/seo/site";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700", "900"],
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const SITE_DESCRIPTION =
  "Outlet de botas vaqueras, sombreros y ropa de piel en Celaya, Guanajuato. Piezas finales de inventario a precio de liquidación — sin reposición. Envíos a todo México.";

export const metadata: Metadata = {
  // Resuelve las URLs relativas (canonicals, imágenes OG) a absolutas. Sin esto
  // Next avisa en build y las redes sociales no resuelven la imagen.
  metadataBase: new URL(SITE_URL),
  // Las páginas hijas definen solo su nombre; el sufijo se aplica aquí.
  title: {
    default: `${BRAND.name} — Botas, sombreros y ropa vaquera`,
    template: `%s | ${BRAND.name}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: BRAND.name,
  authors: [{ name: BRAND.name }],
  creator: BRAND.name,
  publisher: BRAND.name,
  alternates: { canonical: "/" },
  // Safari convierte cadenas de dígitos (precios, CPs, códigos de producto) en
  // enlaces de teléfono si no se apaga.
  formatDetection: { telephone: false, address: false, email: false },
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: "/",
    siteName: BRAND.name,
    title: `${BRAND.name} — Botas, sombreros y ropa vaquera`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} — Botas, sombreros y ropa vaquera`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Sin límite de tamaño en el preview de imagen/texto: es lo que permite que
      // la foto del producto salga grande en el resultado de búsqueda.
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${playfair.variable} ${jost.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col bg-tobacco-950 text-amber-50 font-sans"
        suppressHydrationWarning
      >
        <QueryProvider>
          <BrandProvider>
            {children}
            <CartProvider />
          </BrandProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
