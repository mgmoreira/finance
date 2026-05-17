import { createClient } from "@libsql/client";
import { readFileSync } from "fs";

// Parse .env.local manually
const envContent = readFileSync(".env.local", "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function migrate() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS crypto_monthly_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year_month TEXT NOT NULL UNIQUE,
      total_value_usd REAL NOT NULL,
      total_invested_usd REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  console.log("Migration complete: crypto_monthly_snapshots created");
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log("Tables:", tables.rows.map((r) => r.name).join(", "));
}

migrate().catch(console.error);
