import { requireCreator } from "@/lib/queries/dashboard";
import { BlockEditor } from "@/components/editor/block-editor";

export default async function LinksPage() {
  const { creator, page, products } = await requireCreator();

  return (
    <BlockEditor
      pageId={page.id}
      username={creator.username}
      initialBlocks={page.blocks}
      initialPreset={page.theme.preset ?? "minimal"}
      products={products}
    />
  );
}
