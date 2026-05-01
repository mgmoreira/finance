import { createClient } from "@libsql/client";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf-8");
for (const l of env.split("\n")) { const m = l.match(/^([^#=]+)=(.*)$/); if (m) process.env[m[1].trim()] = m[2].trim(); }

const c = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN! });

async function run() {
  await c.execute({
    sql: "INSERT INTO cash_movements (type, amount, currency, description, date, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    args: ["ADJUSTMENT", 4801, "USD", "Efectivo USD (saldo broker)", "2026-04-19", new Date().toISOString()],
  });
  await c.execute({
    sql: "INSERT INTO cash_movements (type, amount, currency, description, date, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    args: ["ADJUSTMENT", 15164, "USD", "Efectivo USD (saldo broker)", "2026-04-19", new Date().toISOString()],
  });
  const r = await c.execute("SELECT SUM(amount) as total FROM cash_movements WHERE currency = 'USD'");
  console.log("Nuevo saldo USD:", r.rows[0].total);
}
run().catch(console.error);
