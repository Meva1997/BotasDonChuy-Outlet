import { notFound } from "next/navigation";
import ProductInfo from "@/components/ui/ProductInfo";
import { getProductById } from "@/lib/getProducts";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductById(Number(slug));

  if (!product) notFound();

  return <ProductInfo product={product} />;
}
