import { ProductsManager } from "@/components/products/products-manager";
import { requireCreator } from "@/lib/queries/dashboard";
import { isDodoConfigured } from "@/lib/env";

export default async function ProductsPage() {
  const { products } = await requireCreator();

  return (
    <ProductsManager
      initialProducts={products}
      dodoConfigured={isDodoConfigured()}
    />
  );
}
