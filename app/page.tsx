import Footer from "@/components/home/Footer";
import Hero from "@/components/home/Hero";
import NavHeader from "@/components/home/NavHeader";
import JsonLd from "@/components/seo/JsonLd";
import { storeJsonLd } from "@/lib/seo/jsonLd";

// El título/description del home salen de los defaults del root layout — no hay
// nada que sobreescribir aquí.

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
