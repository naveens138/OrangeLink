import { createServiceRoleClient } from "@/lib/supabase/server";
import { getApprovedCount, PROGRAM_CAP } from "@/lib/creator-program";
import {
  CreatorProgramReview,
  type ReviewSubmission,
} from "@/components/admin/creator-program-review";

export default async function AdminCreatorProgramPage() {
  const supabase = createServiceRoleClient();
  const [approved, { data: rows, error }, { count: waitlistCount }] = await Promise.all([
    getApprovedCount(),
    supabase
      .from("creator_program_submissions")
      .select(
        "id, email, reel_url, note, status, submitted_at, reviewed_at, reviewed_by, creator_id, creators(username), billing_overrides:creators(billing_overrides(free_until))",
      )
      .order("submitted_at", { ascending: true })
      .limit(500),
    supabase.from("creator_program_waitlist").select("id", { count: "exact", head: true }),
  ]);
  if (error) throw new Error(error.message);

  type Row = {
    id: string;
    email: string;
    reel_url: string;
    note: string | null;
    status: ReviewSubmission["status"];
    submitted_at: string;
    reviewed_at: string | null;
    reviewed_by: string | null;
    creator_id: string | null;
    creators: { username: string } | null;
    billing_overrides: { billing_overrides: { free_until: string } | null } | null;
  };

  const submissions: ReviewSubmission[] = ((rows ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    email: r.email,
    reelUrl: r.reel_url,
    note: r.note,
    status: r.status,
    submittedAt: r.submitted_at,
    reviewedAt: r.reviewed_at,
    reviewedBy: r.reviewed_by,
    username: r.creators?.username ?? null,
    freeUntil: r.billing_overrides?.billing_overrides?.free_until ?? null,
  }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-h2">Creator Program</h1>
        <p className="mt-1 text-body text-text-secondary">
          Review reels. Approving one gives that creator a free year, up to {PROGRAM_CAP} in
          total.
        </p>
      </div>

      <CreatorProgramReview
        initialSubmissions={submissions}
        initialApproved={approved}
        cap={PROGRAM_CAP}
        waitlistCount={waitlistCount ?? 0}
      />
    </div>
  );
}
