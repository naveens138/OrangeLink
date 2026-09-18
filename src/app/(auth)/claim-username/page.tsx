import { Suspense } from "react";
import { OnboardingProgress } from "@/components/auth/onboarding-progress";
import { ClaimUsernameForm } from "./claim-form";

/**
 * The form reads ?username= with useSearchParams, which is URL data a
 * prerender can't know, so it has to sit behind a Suspense boundary or the
 * build refuses to prerender this route at all. The fallback is the same
 * chrome without the field, so the page doesn't jump when the form arrives.
 */
export default function ClaimUsernamePage() {
  return (
    <Suspense fallback={<ClaimUsernameFallback />}>
      <ClaimUsernameForm />
    </Suspense>
  );
}

function ClaimUsernameFallback() {
  return (
    <div className="flex flex-1 flex-col items-center px-6 py-10 md:py-16">
      <OnboardingProgress steps={2} current={2} className="mb-10" />
      <div className="w-full max-w-[460px] text-center">
        <h1 className="text-h1 md:text-display">Claim your link</h1>
        <p className="mt-3 text-body-lg text-text-secondary">
          This is what you&apos;ll share everywhere. Pick it carefully:
          changing it later breaks links you&apos;ve already put out.
        </p>
        <div className="mt-9 h-14 rounded-md border border-border bg-surface-1" />
      </div>
    </div>
  );
}
