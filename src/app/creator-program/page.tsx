import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SectionHeader, btnGhost } from "@/components/marketing/section-header";
import { Faq, type FaqItem } from "@/components/marketing/faq";
import { SubmissionForm } from "@/components/creator-program/submission-form";
import { WaitlistCapture } from "@/components/creator-program/waitlist-capture";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getApprovedCount, PROGRAM_CAP } from "@/lib/creator-program";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Creator Program | OrangeLink",
  description: "Post a reel about OrangeLink and get a full year free. Open to our first 100 creators.",
};

const steps = [
  {
    title: "Sign up and build your page",
    body: "Create your OrangeLink account and add your links and products.",
  },
  {
    title: "Post a reel showing OrangeLink in action",
    body: "Put your page link where people can see it.",
  },
  {
    title: "Submit your reel link below",
    body: "We'll review it and unlock your free year within 48 hours.",
  },
];

const faqItems: FaqItem[] = [
  {
    q: "What counts as a qualifying reel?",
    a: "A reel of 15 seconds or more that shows OrangeLink in use, with your page link clearly visible.",
  },
  {
    q: "Do I need a minimum follower count to join?",
    a: "No. There's no minimum. Any creator can join, big or small.",
  },
  {
    q: "Is there a deadline to apply?",
    a: "No fixed date. It's open until all 100 spots are claimed.",
  },
  {
    q: "How long does review take?",
    a: "Up to 48 hours. Once your reel is approved, your free year starts right away.",
  },
];

type OwnSubmission = { status: "pending" | "approved" | "rejected" };

/**
 * The signed-in creator's own application, if any, read with their session
 * so row level security decides what they can see.
 */
async function getOwnStatus() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return null;

  const [{ data: submission }, { data: override }, { data: creator }] = await Promise.all([
    supabase
      .from("creator_program_submissions")
      .select("status")
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle<OwnSubmission>(),
    supabase.from("billing_overrides").select("free_until").maybeSingle<{ free_until: string }>(),
    createServiceRoleClient()
      .from("creators")
      .select("username")
      .eq("id", userId)
      .maybeSingle<{ username: string }>(),
  ]);

  return {
    username: creator?.username ?? null,
    status: submission?.status ?? null,
    freeUntil: override?.free_until ?? null,
  };
}

export default async function CreatorProgramPage() {
  // The counter must be live, never baked in at build time.
  await connection();
  const [approved, own] = await Promise.all([getApprovedCount(), getOwnStatus()]);

  const claimed = Math.min(approved, PROGRAM_CAP);
  const full = approved >= PROGRAM_CAP;
  const hasLiveApplication = own?.status === "pending" || own?.status === "approved";

  return (
    <div className="theme-marketing min-h-screen bg-background text-text-primary">
      <SiteNav />

      <main className="mx-auto w-full max-w-[560px] px-5">
        {/* Hero and counter */}
        <section className="pb-16 pt-16">
          <p className="t-mono rise text-text-muted">Creator Program</p>
          {full ? (
            <>
              <h1 className="t-display rise mt-3 max-w-[24ch] text-balance">
                All 100 spots are claimed.
              </h1>
              <p className="t-body rise rise-1 mt-4 max-w-[52ch] text-text-secondary">
                Thanks to everyone who posted. Join the waitlist and we&apos;ll let you know
                when the next round opens.
              </p>
            </>
          ) : (
            <>
              <h1 className="t-display rise mt-3 max-w-[24ch] text-balance">
                Post a Reel. Get a Year Free.
              </h1>
              <p className="t-body rise rise-1 mt-4 max-w-[52ch] text-text-secondary">
                We&apos;re giving our first 100 creators a full year of OrangeLink, free. Just
                show your audience how you use it.
              </p>
            </>
          )}

          <div className="rise rise-2 mt-8">
            <div className="flex items-baseline justify-between">
              <p className="t-heading tabular-nums">
                {claimed} / {PROGRAM_CAP} spots claimed
              </p>
              {!full && (
                <p className="t-small tabular-nums text-text-muted">
                  {PROGRAM_CAP - claimed} left
                </p>
              )}
            </div>
            <div
              className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={PROGRAM_CAP}
              aria-valuenow={claimed}
              aria-label="Spots claimed"
            >
              <div
                className="h-full rounded-full bg-text-primary"
                style={{ width: `${(claimed / PROGRAM_CAP) * 100}%` }}
              />
            </div>
          </div>

          {full && (
            <div className="rise rise-3 mt-8">
              <WaitlistCapture />
            </div>
          )}
        </section>

        {/* Steps */}
        <section className="pb-16">
          <SectionHeader index="01" eyebrow="how it works" title="Three steps to your free year." />
          <div className="mt-7 grid gap-3">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className={`lift rise rise-${i + 1} flex gap-4 rounded-md border border-border bg-surface-1 p-6`}
              >
                <span className="t-mono pt-0.5 text-[var(--accent-strong)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="t-heading">{step.title}</p>
                  <p className="t-small mt-1 leading-relaxed text-text-secondary">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
          {!own && (
            <Link href="/signup" className={`${btnGhost} rise mt-5 inline-block`}>
              Sign up free
            </Link>
          )}
        </section>

        {/* Submission (hidden once the round is full) */}
        {!full && (
          <section id="submit" className="scroll-mt-16 pb-16">
            <SectionHeader
              index="02"
              eyebrow="submit"
              title="Submit your reel."
              body="Posted it? Send us the link and we'll take a look."
            />
            <div className="rise rise-2 mt-7">
              {own?.status === "approved" ? (
                <StatusCard
                  title="You're in."
                  body={
                    own.freeUntil
                      ? `Your free year runs until ${formatDate(own.freeUntil)}.`
                      : "Your free year is active."
                  }
                />
              ) : own?.status === "pending" ? (
                <StatusCard
                  title="Your reel is in review."
                  body="We'll get back to you within 48 hours."
                />
              ) : (
                <>
                  {own?.status === "rejected" && (
                    <p className="t-small mb-3 text-text-secondary">
                      Your last reel didn&apos;t qualify. You can send a new one.
                    </p>
                  )}
                  <SubmissionForm defaultIdentity={own?.username ?? undefined} />
                </>
              )}
            </div>
          </section>
        )}

        {/* An approved creator still sees their status after the round fills. */}
        {full && hasLiveApplication && own && (
          <section className="pb-16">
            <StatusCard
              title={own.status === "approved" ? "You're in." : "The spots filled up first."}
              body={
                own.status === "approved"
                  ? own.freeUntil
                    ? `Your free year runs until ${formatDate(own.freeUntil)}.`
                    : "Your free year is active."
                  : "All 100 were claimed before we got to your reel. Join the waitlist above for the next round."
              }
            />
          </section>
        )}

        <section id="faq" className="scroll-mt-16 pb-16">
          <h2 className="t-title rise">Questions</h2>
          <div className="rise rise-1 mt-5">
            <Faq items={faqItems} />
          </div>
        </section>

        <SiteFooter />
      </main>
    </div>
  );
}

function StatusCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-border bg-surface-1 px-6 py-8 text-center">
      <p className="t-heading">{title}</p>
      <p className="t-small mt-1 text-text-secondary">{body}</p>
    </div>
  );
}
