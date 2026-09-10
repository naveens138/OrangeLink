import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { PageEyebrow } from "@/components/dashboard/page-eyebrow";
import { requireCreator } from "@/lib/queries/dashboard";

// Runs in the landing page's theme (.theme-marketing): white ground, the
// same greys, hairlines and type, so the dashboard and the marketing site
// read as one product.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { creator } = await requireCreator();

  return (
    <div className="theme-marketing flex min-h-screen bg-background text-text-primary">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar creator={creator} />
        <main className="mx-auto w-full max-w-[880px] flex-1 px-5 pb-28 pt-8 md:px-8 md:pb-12 md:pt-10">
          <PageEyebrow />
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
