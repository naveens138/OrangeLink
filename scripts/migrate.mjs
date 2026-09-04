// Applies any migrations/*.sql not yet recorded in schema_migrations.
// Run after scripts/apply-schema.mjs on a fresh database.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { connect, root } from "./db.mjs";

const dir = path.join(root, "migrations");
const client = await connect();

try {
  await client.query(`
    create table if not exists public.schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `);
  await client.query(
    "alter table public.schema_migrations enable row level security",
  );

  const { rows } = await client.query("select name from public.schema_migrations");
  const applied = new Set(rows.map((r) => r.name));

  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip  ${file} (already applied)`);
      continue;
    }
    const sql = readFileSync(path.join(dir, file), "utf8");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query(
        "insert into public.schema_migrations (name) values ($1)",
        [file],
      );
      await client.query("commit");
      console.log(`ok    ${file}`);
      ran += 1;
    } catch (e) {
      await client.query("rollback");
      console.error(`FAIL  ${file}: ${e.message}`);
      process.exitCode = 1;
      break;
    }
  }
  console.log(`${ran} migration(s) applied`);
} finally {
  await client.end();
}
