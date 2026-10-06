import { createClient } from "@libsql/client";
import { readFileSync } from "fs";

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
    CREATE TABLE IF NOT EXISTS dividend_cache (
      ticker TEXT PRIMARY KEY,
      events TEXT NOT NULL DEFAULT '[]',
      next_ex_date TEXT,
      next_pay_date TEXT,
      pay_lag_days INTEGER NOT NULL DEFAULT 25,
      updated_at TEXT NOT NULL
    )
  `);
  const cols = (await client.execute("PRAGMA table_info(species)")).rows.map((r) => r.name);
  if (!cols.includes("withholding_pct")) {
    await client.execute("ALTER TABLE species ADD COLUMN withholding_pct REAL");
    console.log("Added species.withholding_pct");
  }
  console.log("Migration complete: dividend_cache + species.withholding_pct");
}

migrate().catch(console.error);
