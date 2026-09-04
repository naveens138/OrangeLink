// Confirms the ESP API key vault wrappers are scoped correctly.
//
// Worth a permanent, re-runnable check: migration 0004 first shipped these
// with `revoke ... from public`, which reads as a lockdown but isn't one —
// Supabase's project-wide default privileges grant EXECUTE on every new
// `public` function to anon/authenticated/service_role, and `revoke ...
// from public` only touches the PUBLIC pseudo-role, never those specific
// grants. The result was a real leak: an anon-keyed client could call
// get_esp_api_key(existing_integration_id) and get a creator's decrypted
// ESP API key back in plaintext. Fixed in migration 0005 by revoking from
// the named roles explicitly. This script proves it against a REAL vault
// secret (an empty-table/nonexistent-row test can't tell "correctly
// refused" apart from "coincidentally found nothing").
import { createClient } from "@supabase/supabase-js";
import { connect, loadEnv } from "./db.mjs";

const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

let failures = 0;
function check(label, cond, detail = "") {
  console.log(`  ${cond ? "ok  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures += 1;
}

const pg = await connect();
const { rows: [creator] } = await pg.query("select id from creators limit 1");
if (!creator) {
  console.log("No seeded creator to test against — run scripts/seed.mjs first.");
  process.exit(1);
}

const SECRET_VALUE = `probe-${Date.now()}`;
const { rows: [secret] } = await pg.query(
  "select vault.create_secret($1, null, 'lockdown test') as id",
  [SECRET_VALUE],
);
// mailerlite, not convertkit: the vault wrapper logic being tested here is
// provider-agnostic, and a real convertkit connection may legitimately
// already exist for the seeded creator (creator_id, provider) is unique.
const { rows: [integration] } = await pg.query(
  `insert into esp_integrations (creator_id, provider, api_key_secret_id, list_id)
   values ($1, 'mailerlite', $2, 'probe') returning id`,
  [creator.id, secret.id],
);

console.log("READ — get_esp_api_key against a real secret");
const svc = await admin.rpc("get_esp_api_key", { p_integration_id: integration.id });
check("service_role reads the real decrypted key", svc.data === SECRET_VALUE, JSON.stringify(svc.data));

const anonRead = await anon.rpc("get_esp_api_key", { p_integration_id: integration.id });
check(
  "anon is refused (no data, and not the real secret)",
  anonRead.data !== SECRET_VALUE,
  `data=${JSON.stringify(anonRead.data)} error=${anonRead.error?.message ?? "none"}`,
);

console.log("\nWRITE — anon cannot create or overwrite a secret");
const anonStore = await anon.rpc("store_esp_secret", { new_secret: "attacker-value" });
check("anon store_esp_secret refused", !anonStore.data, anonStore.error?.message ?? "no error returned");

const anonUpdate = await anon.rpc("update_esp_secret", {
  p_secret_id: secret.id,
  new_secret: "attacker-overwrite",
});
check("anon update_esp_secret refused", Boolean(anonUpdate.error), anonUpdate.error?.message ?? "no error returned");

const { rows: [stillOriginal] } = await pg.query(
  "select decrypted_secret from vault.decrypted_secrets where id = $1",
  [secret.id],
);
check(
  "secret value unchanged after the attempted overwrite",
  stillOriginal.decrypted_secret === SECRET_VALUE,
);

await pg.query("delete from esp_integrations where id = $1", [integration.id]);
await pg.query("delete from vault.secrets where id = $1", [secret.id]);
await pg.end();

console.log(failures === 0 ? "\nPASS" : `\nFAIL — ${failures} problem(s) above.`);
process.exitCode = failures === 0 ? 0 : 1;
