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
  // Add currency column to cash_movements (default USD for existing rows)
  await client.execute('ALTER TABLE cash_movements ADD COLUMN currency TEXT NOT NULL DEFAULT "USD"').catch(e => {
    if (String(e).includes("duplicate column")) console.log("currency column already exists");
    else throw e;
  });

  await client.execute(`CREATE TABLE IF NOT EXISTS expense_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL
  )`);

  await client.execute(`CREATE TABLE IF NOT EXISTS expense_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER REFERENCES expense_categories(id),
    is_active INTEGER NOT NULL DEFAULT 1
  )`);

  await client.execute(`CREATE TABLE IF NOT EXISTS monthly_budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year_month TEXT NOT NULL UNIQUE,
    salary REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  await client.execute(`CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_id INTEGER NOT NULL REFERENCES monthly_budgets(id),
    template_id INTEGER REFERENCES expense_templates(id),
    name TEXT NOT NULL,
    category_id INTEGER REFERENCES expense_categories(id),
    amount REAL,
    date TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  await client.execute(`CREATE TABLE IF NOT EXISTS investment_transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_id INTEGER NOT NULL REFERENCES monthly_budgets(id),
    amount_ars REAL NOT NULL,
    amount_usd REAL,
    exchange_rate REAL,
    currency TEXT NOT NULL,
    date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  // Seed default categories
  const categories = [
    ["Servicios", "#3b82f6"],
    ["Supermercado", "#22c55e"],
    ["Transporte", "#f59e0b"],
    ["Salud", "#ef4444"],
    ["Ocio", "#a855f7"],
    ["Ropa", "#ec4899"],
    ["Educación", "#06b6d4"],
    ["Hogar", "#f97316"],
    ["Inversión", "#10b981"],
    ["Otros", "#6b7280"],
  ];
  for (const [name, color] of categories) {
    await client.execute({
      sql: "INSERT OR IGNORE INTO expense_categories (name, color) VALUES (?, ?)",
      args: [name, color],
    });
  }

  console.log("Migration complete!");
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log("Tables:", tables.rows.map(r => r.name).join(", "));
  const cats = await client.execute("SELECT * FROM expense_categories");
  console.log("Categories:", cats.rows.length);
}

migrate().catch(console.error);
