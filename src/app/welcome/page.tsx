import Link from "next/link";
import { Check } from "lucide-react";

export default function WelcomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
        <Check className="h-6 w-6" />
      </div>
      <h1 className="text-h2">You&apos;re subscribed.</h1>
      <p className="max-w-sm text-body text-text-secondary">
        Your subscription is active. It may take a moment to fully process.
      </p>
      <Link href="/dashboard" className="text-body font-medium text-accent">
        Go to your dashboard
      </Link>
    </div>
  );
}
