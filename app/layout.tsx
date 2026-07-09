import type { Metadata } from "next";
import { Playfair_Display, Jost } from "next/font/google";
import "./globals.css";
import CartProvider from "@/components/ui/CartProvider";
import QueryProvider from "@/components/providers/QueryProvider";
import BrandProvider from "@/components/providers/BrandProvider";
import { BRAND } from "@/lib/brand";

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

export const metadata: Metadata = {
  // Las páginas hijas definen solo su nombre; el sufijo se aplica aquí.
  title: {
    default: BRAND.name,
    template: `%s | ${BRAND.name}`,
  },
  description:
    "Outlet de botas, sombreros y ropa vaquera — piezas finales, sin reposición.",
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
      <body className="min-h-full flex flex-col bg-tobacco-950 text-amber-50 font-sans">
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
