import Link from "next/link";
import { requireAdmin } from "@/lib/queries/require-admin";
import { BrandLockup } from "@/components/brand/brand";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { email } = await requireAdmin();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <Link href="/admin/payouts" className="inline-flex">
          <BrandLockup>
            <span className="text-[13px] text-text-muted">/ admin</span>
          </BrandLockup>
        </Link>
        <span className="text-small text-text-muted">{email}</span>
      </header>
      <main className="px-6 py-8 md:px-10">{children}</main>
    </div>
  );
}
