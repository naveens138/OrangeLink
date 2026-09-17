import { requireCreator } from "@/lib/queries/dashboard";
import { BlockEditor } from "@/components/editor/block-editor";
import { DEFAULT_PRESET } from "@/lib/theme-presets";
import { normalizeCustomTheme } from "@/lib/theme-custom";
import { getTemplate } from "@/lib/page-templates";
import { buildTemplateSample } from "@/lib/template-sample";

export default async function LinksPage() {
  const { creator, page, products } = await requireCreator();

  return (
    <BlockEditor
      pageId={page.id}
      username={creator.username}
      initialBlocks={page.blocks}
      initialPreset={page.theme.preset ?? DEFAULT_PRESET}
      // Tabs are on unless the creator turned them off, matching what the
      // public page shows for a page with no saved choice.
      initialTabbedView={page.theme.tabbed_view ?? true}
      initialCustom={normalizeCustomTheme(page.theme.custom)}
      initialTemplate={getTemplate(page.theme.template)?.id ?? null}
      templateSample={buildTemplateSample(creator, page.blocks)}
      products={products}
    />
  );
}
