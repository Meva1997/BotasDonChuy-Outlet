import ShippingInfo from "@/components/legal/ShippingInfo";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Política de Envíos",
  description:
    "Información sobre envíos de Botas Don Chuy Outlet. Enviamos únicamente al interior de la República Mexicana.",
  path: "/envios",
});

export default function EnviosPage() {
  return <ShippingInfo />;
}
