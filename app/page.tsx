import type { Metadata } from "next";
import Footer from "@/components/home/Footer";
import Hero from "@/components/home/Hero";
import NavHeader from "@/components/home/NavHeader";
import JsonLd from "@/components/seo/JsonLd";
import { storeJsonLd } from "@/lib/seo/jsonLd";

// El título/description/openGraph del home salen de los defaults del root layout
// —describen justo esta página—, así que solo se declara el canonical. Va aquí y
// no en el layout a propósito: en el layout lo heredaría toda página sin canonical
// propio y las volvería duplicados del home. Y se define solo `alternates`: tocar
// `openGraph` reemplazaría el bloque heredado, imagen incluida.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <div>
      {/* Identifica el negocio ante Google: nombre, dirección de Celaya, redes. */}
      <JsonLd data={storeJsonLd()} />

      <NavHeader />

      <Hero />

      <Footer />
    </div>
  );
}
