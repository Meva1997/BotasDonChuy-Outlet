import TermsConditions from "@/components/legal/TermsConditions";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Términos y Condiciones",
  description:
    "Términos y condiciones de compra del outlet de Botas Don Chuy. Productos outlet sin cambios ni devoluciones.",
  path: "/terminos",
});

export default function TermsPage() {
  return <TermsConditions />;
}
