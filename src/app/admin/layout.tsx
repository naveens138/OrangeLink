import Link from "next/link";
import { requireAdmin } from "@/lib/queries/require-admin";
import { BrandLockup } from "@/components/brand/brand";

const adminLinks = [
  ["/admin/payouts", "Payouts"],
  ["/admin/creator-program", "Creator Program"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { email } = await requireAdmin();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/admin/payouts" className="inline-flex">
            <BrandLockup>
              <span className="text-[13px] text-text-muted">/ admin</span>
            </BrandLockup>
          </Link>
          <nav className="flex items-center gap-4">
            {adminLinks.map(([href, label]) => (
              <Link key={href} href={href} className="text-small text-text-secondary hover:text-text-primary">
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <span className="text-small text-text-muted">{email}</span>
      </header>
      <main className="px-6 py-8 md:px-10">{children}</main>
    </div>
  );
}
