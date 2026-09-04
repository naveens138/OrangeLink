import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="theme-light-primary flex min-h-screen flex-col bg-background text-text-primary">
      <header className="px-6 py-5 md:px-10">
        <Link
          href="/"
          className="text-body font-semibold tracking-tight text-text-primary"
        >
          Orange<span className="text-accent">Link</span>
        </Link>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
