import PrivacyPolicy from "@/components/legal/PrivacyPolicy";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Política de Privacidad",
  description:
    "Política de privacidad y tratamiento de datos personales de Botas Don Chuy Outlet.",
  path: "/privacidad",
});

export default function PrivacyPage() {
  return <PrivacyPolicy />;
}
