// The anon key is public by design — it ships in the browser bundle of every
// Supabase app. What keeps data safe is RLS, not secrecy. This asserts that an
// attacker holding the anon key can neither read nor modify anything.
//
// Table list is enumerated from the database rather than hardcoded, so a table
// added later is covered automatically instead of being silently skipped.
//
// Three layers, because no single one is conclusive:
//   1. structural — RLS enabled on every table in `public`
//   2. structural — no policy grants anon a way in
//   3. empirical  — the anon key actually returns nothing / is refused
// An empty read alone proves little on an empty table, which is why the
// structural checks carry most of the weight.
import { connect, loadEnv } from "./db.mjs";

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};

const client = await connect();
let failures = 0;

// --- 1. RLS enabled on every public table --------------------------------
const { rows: tables } = await client.query(`
  select c.relname as name, c.relrowsecurity as rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
  order by c.relname
`);

console.log(`STRUCTURAL — RLS enabled (${tables.length} tables in public)`);
const noRls = tables.filter((t) => !t.rls);
if (noRls.length) {
  failures += noRls.length;
  for (const t of noRls) console.log(`  FAIL  ${t.name} — RLS DISABLED`);
} else {
  console.log(`  ok    all ${tables.length} tables have RLS enabled`);
}

// --- 2. No policy hands anon a way in ------------------------------------
// A policy with no TO clause applies to PUBLIC (which includes anon). Ours are
// all `using (auth.uid() = ...)`, and auth.uid() is NULL for an anonymous
// caller, so they cannot match — but anything USING (true) would be a hole.
const { rows: policies } = await client.query(`
  select c.relname as table_name,
         p.polname as policy,
         pg_get_expr(p.polqual, p.polrelid) as using_expr
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
  order by c.relname
`);

console.log(`\nSTRUCTURAL — policy review (${policies.length} policies)`);
for (const p of policies) {
  const expr = (p.using_expr ?? "").replace(/\s+/g, " ");
  const unconditional = /^\(?true\)?$/i.test(expr.trim());
  if (unconditional) {
    failures += 1;
    console.log(`  FAIL  ${p.table_name}.${p.policy} — USING (true), open to anon`);
  } else {
    console.log(`  ok    ${p.table_name.padEnd(22)} ${expr.slice(0, 60)}`);
  }
}

// --- 3. Empirical: anon reads every table --------------------------------
console.log(`\nEMPIRICAL — anon read of all ${tables.length} tables`);
for (const t of tables) {
  const res = await fetch(
    `${url}/rest/v1/${encodeURIComponent(t.name)}?select=*&limit=1`,
    { headers },
  );
  const body = await res.text();
  const leaked = res.ok && body.trim() !== "[]";
  if (leaked) {
    failures += 1;
    console.log(`  LEAK  ${t.name.padEnd(24)} ${res.status} ${body.slice(0, 90)}`);
  } else {
    console.log(`  ok    ${t.name.padEnd(24)} ${res.status} ${body.slice(0, 30)}`);
  }
}

// --- 4. Empirical: anon writes -------------------------------------------
// Non-destructive by construction: the inserts use throwaway values and the
// update/delete filters are scoped to an id that does not exist, so a policy
// bug cannot damage real rows while running this.
const NOWHERE = "id=eq.00000000-0000-0000-0000-0000000000ff";
const writes = [
  {
    label: "insert creator",
    method: "POST",
    path: "creators",
    body: { id: "00000000-0000-0000-0000-0000000000ff", username: "attacker" },
  },
  {
    label: "insert product",
    method: "POST",
    path: "products",
    body: { type: "digital_file", name: "pwned", price_cents: 0 },
  },
  { label: "update block", method: "PATCH", path: `blocks?${NOWHERE}`, body: { is_visible: false } },
  { label: "delete product", method: "DELETE", path: `products?${NOWHERE}`, body: null },
];

console.log("\nEMPIRICAL — anon writes");
for (const w of writes) {
  const res = await fetch(`${url}/rest/v1/${w.path}`, {
    method: w.method,
    headers: { ...headers, Prefer: "return=representation" },
    body: w.body ? JSON.stringify(w.body) : undefined,
  });
  const text = await res.text();
  const succeeded = res.ok && text.trim() !== "[]" && text.trim() !== "";
  if (succeeded) {
    failures += 1;
    console.log(`  BREACH ${w.label.padEnd(16)} ${res.status} ${text.slice(0, 90)}`);
  } else {
    console.log(`  ok     ${w.label.padEnd(16)} ${res.status} ${text.slice(0, 50)}`);
  }
}

await client.end();

console.log(
  failures === 0
    ? "\nPASS — RLS on every table, no open policy, anon can neither read nor write."
    : `\nFAIL — ${failures} problem(s) above.`,
);
process.exitCode = failures === 0 ? 0 : 1;
