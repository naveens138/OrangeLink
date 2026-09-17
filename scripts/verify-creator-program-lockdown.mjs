// Proves the Creator Program tables (migration 0018) only expose what they
// should to signed-in creators: their own submission and billing override,
// nothing else, and no way to write either or call the admin functions.
//
// Simulates each creator's session inside a rolled-back transaction
// (role `authenticated` plus their JWT claims), the same thing PostgREST
// does for a real request, so no test accounts are needed.
// Run: node scripts/verify-creator-program-lockdown.mjs
import { connect } from "./db.mjs";

const client = await connect();
let failures = 0;

function check(name, passed, detail = "") {
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) failures++;
}

async function denied(sql, params = []) {
  await client.query("savepoint probe");
  try {
    await client.query(sql, params);
    await client.query("release savepoint probe");
    return false;
  } catch (e) {
    await client.query("rollback to savepoint probe");
    return e.code === "42501";
  }
}

try {
  const { rows: creators } = await client.query(
    "select id from public.creators order by created_at limit 2",
  );
  if (creators.length < 2) throw new Error("Needs at least two creators to compare.");
  const [a, b] = creators.map((c) => c.id);

  // Seed one submission and override for creator A, inside a transaction
  // that is rolled back at the end.
  await client.query("begin");
  await client.query(
    `insert into public.creator_program_submissions (id, creator_id, email, reel_url, status)
     values ('00000000-0000-4000-8000-00000000c0de', $1, 'lockdown-probe@example.com',
             'https://www.instagram.com/reel/LOCKDOWNPROBE', 'rejected')`,
    [a],
  );
  await client.query(
    `insert into public.billing_overrides (creator_id, free_until, reason)
     values ($1, now() + interval '1 year', 'creator_program')
     on conflict (creator_id) do nothing`,
    [a],
  );
  await client.query("savepoint seeded");

  // Switch to each creator's session inside the seeded transaction;
  // rolling back to the savepoint resets the role between them.
  async function probe(creatorId) {
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: creatorId, role: "authenticated" }),
    ]);
    const subs = await client.query(
      "select creator_id from public.creator_program_submissions where email = 'lockdown-probe@example.com'",
    );
    const overrides = await client.query("select creator_id from public.billing_overrides");
    return { subs: subs.rows, overrides: overrides.rows };
  }

  const seenByA = await probe(a);
  check("creator sees own submission", seenByA.subs.length === 1);
  check(
    "creator sees only own billing override",
    seenByA.overrides.length === 1 && seenByA.overrides[0].creator_id === a,
  );

  check(
    "creator cannot grant themselves a free year",
    await denied(
      "update public.billing_overrides set free_until = now() + interval '50 years' where creator_id = $1",
      [a],
    ),
  );
  check(
    "creator cannot approve their own submission",
    await denied("update public.creator_program_submissions set status = 'approved'"),
  );
  check(
    "creator cannot insert submissions directly",
    await denied(
      "insert into public.creator_program_submissions (email, reel_url) values ('x@example.com', 'https://x')",
    ),
  );
  check("creator cannot read the waitlist", await denied("select email from public.creator_program_waitlist"));
  check(
    "creator cannot call approve_program_submission",
    await denied("select * from public.approve_program_submission('00000000-0000-4000-8000-00000000c0de', 'me')"),
  );
  check(
    "creator cannot call resolve_program_identity",
    await denied("select * from public.resolve_program_identity('jane')"),
  );

  await client.query("rollback to savepoint seeded");
  const seenByB = await probe(b);
  check("another creator can't see that submission", seenByB.subs.length === 0);
  check(
    "another creator can't see that override",
    !seenByB.overrides.some((o) => o.creator_id === a),
  );
} finally {
  await client.query("rollback").catch(() => {});
  await client.end();
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
process.exitCode = failures === 0 ? 0 : 1;
