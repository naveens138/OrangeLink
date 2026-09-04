// Shared Postgres connection for the scripts in this folder.
// Reads DATABASE_URL from .env.local. These scripts are developer tooling —
// the app itself never connects to Postgres directly, it goes through the
// Supabase clients in src/lib/supabase.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function loadEnv() {
  const env = {};
  let raw;
  try {
    raw = readFileSync(path.join(root, ".env.local"), "utf8");
  } catch {
    throw new Error(".env.local not found — copy .env.local.example and fill it in.");
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return env;
}

export async function connect() {
  const { DATABASE_URL } = loadEnv();
  if (!DATABASE_URL) throw new Error("DATABASE_URL missing from .env.local");
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });
  await client.connect();
  return client;
}

export { root };
