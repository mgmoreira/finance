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

const BONUS = JSON.stringify([3333, 6666, 9999, 13333, 16666, 20000]);

// [date, stocks, bonds, crypto, cash] — from the user's spreadsheet
const SNAPSHOTS: [string, number, number, number, number][] = [
  ["2024-03-01", 2315, 13173, 24491, 1100],
  ["2024-09-01", 2965, 15928, 17346, 3168],
  ["2025-03-01", 3619, 18816, 42218.5, 8384],
  ["2025-09-01", 36715, 0, 48350, 17000],
  ["2026-03-01", 71026, 0, 25726, 12626],
  ["2026-09-01", 85116, 0, 24858.53, 31296],
];

// [name, startYear, startValue, rate, contribution, bonusFactor, endYear, color, visible]
const SCENARIOS: [string, number, number, number, number, number, number, string, number][] = [
  ["10%", 2024, 73000, 0.10, 8000, 0, 2047, "#4a9eff", 1],
  ["15%", 2024, 73000, 0.15, 8000, 0, 2041, "#a78bfa", 1],
  ["MELI sin bono", 2025, 108000, 0.10, 25000, 0, 2041, "#7a8189", 0],
  ["MELI 25k + bono", 2025, 108000, 0.10, 25000, 0.67, 2041, "#e8a317", 0],
  ["MELI sin rendimiento", 2025, 108000, 0, 25000, 0.67, 2041, "#e74c3c", 0],
  ["MELI 18k + bono", 2025, 108000, 0.10, 18000, 0.67, 2041, "#f0c674", 1],
];

async function migrate() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS wealth_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      stocks_usd REAL NOT NULL DEFAULT 0,
      bonds_usd REAL NOT NULL DEFAULT 0,
      crypto_usd REAL NOT NULL DEFAULT 0,
      cash_usd REAL NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'manual',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS goal_scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      start_year INTEGER NOT NULL,
      start_value REAL NOT NULL,
      rate REAL NOT NULL,
      contribution REAL NOT NULL,
      bonus_factor REAL NOT NULL DEFAULT 0,
      bonus_schedule TEXT NOT NULL DEFAULT '[]',
      end_year INTEGER NOT NULL,
      color TEXT NOT NULL,
      visible INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);

  const snapCount = Number((await client.execute("SELECT COUNT(*) AS n FROM wealth_snapshots")).rows[0].n);
  if (snapCount === 0) {
    for (const [date, s, b, c, cash] of SNAPSHOTS) {
      await client.execute({
        sql: "INSERT INTO wealth_snapshots (date, stocks_usd, bonds_usd, crypto_usd, cash_usd, source) VALUES (?, ?, ?, ?, ?, 'manual')",
        args: [date, s, b, c, cash],
      });
    }
    console.log(`Seeded ${SNAPSHOTS.length} wealth snapshots`);
  }

  const scenCount = Number((await client.execute("SELECT COUNT(*) AS n FROM goal_scenarios")).rows[0].n);
  if (scenCount === 0) {
    for (const [i, [name, startYear, startValue, rate, contribution, bonusFactor, endYear, color, visible]] of SCENARIOS.entries()) {
      await client.execute({
        sql: `INSERT INTO goal_scenarios (name, start_year, start_value, rate, contribution, bonus_factor, bonus_schedule, end_year, color, visible, sort_order)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [name, startYear, startValue, rate, contribution, bonusFactor, BONUS, endYear, color, visible, i],
      });
    }
    console.log(`Seeded ${SCENARIOS.length} goal scenarios`);
  }

  console.log("Migration complete: wealth_snapshots + goal_scenarios");
}

migrate().catch(console.error);
