import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { PageEyebrow } from "@/components/dashboard/page-eyebrow";
import { DashboardMain } from "@/components/dashboard/dashboard-main";
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
        <DashboardMain>
          <PageEyebrow />
          {children}
        </DashboardMain>
      </div>
      <BottomNav />
    </div>
  );
}
