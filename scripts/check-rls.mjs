import { connect } from "./db.mjs";

const client = await connect();
const { rows } = await client.query(`
  select c.relname as table_name,
         c.relrowsecurity as rls_enabled,
         count(p.polname) as policies
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_policy p on p.polrelid = c.oid
  where n.nspname = 'public' and c.relkind = 'r'
  group by c.relname, c.relrowsecurity
  order by c.relrowsecurity desc, c.relname
`);
for (const r of rows) {
  console.log(
    `${r.rls_enabled ? "RLS " : "--- "} ${r.table_name.padEnd(28)} policies=${r.policies}`,
  );
}
await client.end();
