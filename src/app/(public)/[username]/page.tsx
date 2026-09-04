import { notFound } from "next/navigation";
import { PublicPageView } from "@/components/public/public-page-view";
import { TrackingPixels } from "@/components/public/tracking-pixels";
import { getPublicPage } from "@/lib/queries/public-page";

export default async function PublicCreatorPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const data = await getPublicPage(username);
  if (!data) notFound();

  return (
    <>
      <TrackingPixels pixels={data.pixels} />
      <PublicPageView
        creator={data.creator}
        page={data.page}
        products={data.products}
      />
    </>
  );
}
