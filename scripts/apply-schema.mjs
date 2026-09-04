// Applies schema.sql to the database in DATABASE_URL.
// Idempotent enough to re-run on a fresh/empty database; it is NOT a
// migration tool — for a database with data, write a targeted migration.
import { readFileSync } from "node:fs";
import path from "node:path";
import { connect, root } from "./db.mjs";

const sql = readFileSync(path.join(root, "schema.sql"), "utf8");
const client = await connect();

try {
  await client.query(sql);
  console.log("schema.sql applied");

  const { rows } = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name
  `);
  console.log(`${rows.length} tables in public:`);
  console.log(rows.map((r) => `  ${r.table_name}`).join("\n"));
} catch (e) {
  console.error("FAILED:", e.message);
  if (e.position) {
    const pos = Number(e.position);
    console.error("near:", JSON.stringify(sql.slice(Math.max(0, pos - 120), pos + 120)));
  }
  process.exitCode = 1;
} finally {
  await client.end();
}
