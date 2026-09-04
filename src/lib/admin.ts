/**
 * There's no role/permissions system in this app yet — every existing
 * table's RLS is scoped to `auth.uid() = creator_id`, which has no concept
 * of "platform operator." Introducing a full admin-role system for one
 * feature (payout tracking) would be far more than this needs, so this is
 * deliberately the simplest thing that's actually secure: a fixed
 * allowlist of emails, read from the server only. Never exposed to the
 * client, and never used to grant anything beyond /admin.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}
