import { notFound } from "next/navigation";
import { PublicPageView } from "@/components/public/public-page-view";
import { TrackingPixels } from "@/components/public/tracking-pixels";
import { getPublicPage } from "@/lib/queries/public-page";

export default async function PublicCreatorPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { username } = await params;
  const { tab } = await searchParams;
  const data = await getPublicPage(username);
  if (!data) notFound();

  return (
    <>
      <TrackingPixels pixels={data.pixels} />
      <PublicPageView
        creator={data.creator}
        page={data.page}
        products={data.products}
        // Links open by default, like a Linktree profile; ?tab=shop lands
        // straight on the products, so a creator can share a direct link to
        // their shop. Resolved on the server rather than from
        // useSearchParams so the right tab is in the first paint, which is
        // also what makes the inactive tab capturable at all, since the
        // other tab's markup is never rendered.
        initialTab={tab === "shop" ? "shop" : "links"}
      />
    </>
  );
}
