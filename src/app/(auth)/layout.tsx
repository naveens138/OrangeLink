import Link from "next/link";
import { BrandLockup } from "@/components/brand/brand";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="theme-light-primary flex min-h-screen flex-col bg-background text-text-primary">
      <header className="px-6 py-5 md:px-10">
        <Link href="/" className="inline-flex">
          <BrandLockup />
        </Link>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
