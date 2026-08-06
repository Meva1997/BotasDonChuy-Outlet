import AboutUs from "@/components/about/AboutUs";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Sobre Nosotros",
  description:
    "Más de 35 años de experiencia en moda vaquera en Celaya, Guanajuato. Conoce nuestra historia y las marcas premium que manejamos, como Cuadra.",
  path: "/nosotros",
});

export default function NosotrosPage() {
  return <AboutUs />;
}
