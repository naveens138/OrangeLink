// Proves that a creator's Razorpay credentials cannot be read with the anon
// or authenticated keys — the leak class that migrations 0005 and 0013 both
// had to close (`revoke ... from public` does not remove Supabase's default
// grants to named roles).
//
// Seeds a real vault secret against a throwaway creator, attacks it, then
// cleans up. Run: node scripts/verify-payment-secret-lockdown.mjs
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./db.mjs";

const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const CANARY = "rzp_secret_canary_do_not_leak_9f3a";
let creatorId = null;
let failures = 0;

function check(name, passed, detail = "") {
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) failures++;
}

try {
  // --- seed a disposable creator with a connected payment account ---------
  const email = `paycanary_${Date.now()}@example.com`;
  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email,
    password: "CanaryPassword123!",
    email_confirm: true,
  });
  if (userErr) throw userErr;
  creatorId = created.user.id;

  await admin.from("creators").insert({
    id: creatorId,
    username: `paycanary${Date.now().toString().slice(-8)}`,
    onboarding_completed: true,
  });

  // store_payment_secret is authenticated-only, so seed the vault as the
  // owner would: sign in as the canary and call it.
  const asUser = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { error: signInErr } = await asUser.auth.signInWithPassword({
    email,
    password: "CanaryPassword123!",
  });
  if (signInErr) throw signInErr;

  const { data: secretId, error: storeErr } = await asUser.rpc("store_payment_secret", {
    new_secret: CANARY,
  });
  if (storeErr) throw storeErr;

  await asUser.from("creator_payment_accounts").insert({
    creator_id: creatorId,
    key_id: "rzp_test_canary000000",
    key_secret_id: secretId,
  });

  // --- the actual attacks -------------------------------------------------
  const anonRpc = await anon.rpc("get_creator_payment_credentials", {
    p_creator_id: creatorId,
  });
  const anonLeaked = JSON.stringify(anonRpc.data ?? "").includes(CANARY);
  check(
    "anon cannot decrypt credentials",
    !anonLeaked,
    anonRpc.error ? `blocked: ${anonRpc.error.message}` : "returned no secret",
  );

  const userRpc = await asUser.rpc("get_creator_payment_credentials", {
    p_creator_id: creatorId,
  });
  const userLeaked = JSON.stringify(userRpc.data ?? "").includes(CANARY);
  check(
    "signed-in creator cannot decrypt their own raw credentials",
    !userLeaked,
    userRpc.error ? `blocked: ${userRpc.error.message}` : "returned no secret",
  );

  const anonSelect = await anon.from("creator_payment_accounts").select("*");
  check(
    "anon cannot read the payment accounts table",
    (anonSelect.data?.length ?? 0) === 0,
    `${anonSelect.data?.length ?? 0} rows`,
  );

  // service_role must still work, or payments break entirely.
  const svc = await admin.rpc("get_creator_payment_credentials", {
    p_creator_id: creatorId,
  });
  const svcWorks = JSON.stringify(svc.data ?? "").includes(CANARY);
  check("service_role can still decrypt", svcWorks);
} finally {
  if (creatorId) {
    await admin.from("creators").delete().eq("id", creatorId);
    await admin.auth.admin.deleteUser(creatorId);
  }
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
