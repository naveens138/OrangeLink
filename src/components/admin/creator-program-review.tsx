"use client";

import { useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { approveSubmission, rejectSubmission } from "@/app/admin/creator-program/actions";

export interface ReviewSubmission {
  id: string;
  email: string;
  reelUrl: string;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  username: string | null;
  freeUntil: string | null;
}

const TABS = ["pending", "approved", "rejected"] as const;

const STATUS_STYLE: Record<ReviewSubmission["status"], string> = {
  pending: "bg-surface-2 text-text-secondary",
  approved: "bg-success/15 text-success",
  rejected: "bg-danger/10 text-danger",
};

export function CreatorProgramReview({
  initialSubmissions,
  initialApproved,
  cap,
  waitlistCount,
}: {
  initialSubmissions: ReviewSubmission[];
  initialApproved: number;
  cap: number;
  waitlistCount: number;
}) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [approved, setApproved] = useState(initialApproved);
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [, startTransition] = useTransition();

  const counts = Object.fromEntries(
    TABS.map((t) => [t, submissions.filter((s) => s.status === t).length]),
  ) as Record<(typeof TABS)[number], number>;
  const shown = submissions.filter((s) => s.status === tab);
  const full = approved >= cap;

  function review(id: string, action: "approve" | "reject") {
    setBusyId(id);
    setErrors((e) => ({ ...e, [id]: "" }));
    startTransition(async () => {
      const result = action === "approve" ? await approveSubmission(id) : await rejectSubmission(id);
      setBusyId(null);
      if (!result.ok) {
        setErrors((e) => ({ ...e, [id]: result.error }));
        return;
      }
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, status: result.status, reviewedAt: new Date().toISOString(), freeUntil: result.freeUntil ?? s.freeUntil }
            : s,
        ),
      );
      if (result.status === "approved") setApproved((n) => n + 1);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Spots claimed", value: `${Math.min(approved, cap)} / ${cap}` },
          { label: "Pending", value: counts.pending },
          { label: "Rejected", value: counts.rejected },
          { label: "Waitlist", value: waitlistCount },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <p className="font-mono text-label uppercase tracking-[0.1em] text-text-muted">{s.label}</p>
            <p className="mt-2 font-mono text-h3 text-text-primary">{s.value}</p>
          </Card>
        ))}
      </div>

      {full && (
        <p className="text-small text-text-secondary">
          All {cap} spots are claimed. New submissions are closed and the public page shows the
          waitlist. Reject anything still pending.
        </p>
      )}

      <div className="flex gap-1.5">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full px-3 py-1 text-small capitalize transition-colors",
              tab === t ? "bg-text-primary text-white" : "text-text-secondary hover:bg-surface-2",
            )}
          >
            {t} <span className="tabular-nums opacity-70">{counts[t]}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-md border border-dashed border-border-strong px-6 py-12 text-center text-body text-text-secondary">
          Nothing {tab}.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((s) => (
            <Card key={s.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-body font-medium text-text-primary">
                    {s.username ? `@${s.username}` : s.email}
                  </p>
                  <span className={cn("rounded-full px-2 py-0.5 text-[12px] font-medium capitalize", STATUS_STYLE[s.status])}>
                    {s.status}
                  </span>
                  {!s.username && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[12px] text-text-muted">
                      No account yet
                    </span>
                  )}
                </div>
                {s.username && <p className="text-small text-text-muted">{s.email}</p>}
                <a
                  href={s.reelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex max-w-full items-center gap-1 break-all text-small text-text-primary underline underline-offset-2"
                >
                  {s.reelUrl}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
                {s.note && <p className="mt-2 whitespace-pre-wrap text-small text-text-secondary">{s.note}</p>}
                <p className="mt-2 text-[12px] text-text-muted">
                  Submitted {formatDate(s.submittedAt)}
                  {s.reviewedAt && ` · Reviewed ${formatDate(s.reviewedAt)}${s.reviewedBy ? ` by ${s.reviewedBy}` : ""}`}
                  {s.status === "approved" && s.freeUntil && ` · Free until ${formatDate(s.freeUntil)}`}
                </p>
                {errors[s.id] && <p className="mt-2 text-small text-danger">{errors[s.id]}</p>}
              </div>

              {s.status === "pending" && (
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyId === s.id}
                    onClick={() => review(s.id, "reject")}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    disabled={busyId === s.id || full}
                    onClick={() => review(s.id, "approve")}
                  >
                    {busyId === s.id ? "Saving…" : "Approve"}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
