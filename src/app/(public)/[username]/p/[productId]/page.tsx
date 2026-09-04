import { notFound } from "next/navigation";
import { getPublicProduct } from "@/lib/queries/public-page";
import { ProductDetail } from "./product-detail";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ username: string; productId: string }>;
}) {
  const { username, productId } = await params;
  const data = await getPublicProduct(username, productId);
  if (!data) notFound();

  return <ProductDetail creator={data.creator} product={data.product} />;
}
