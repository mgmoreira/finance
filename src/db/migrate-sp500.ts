// Run: npx tsx src/db/migrate-sp500.ts
// Backfills sp500Value in monthly_snapshots using SPY monthly closing prices from Yahoo Finance.

import { readFileSync } from "fs";
const envContent = readFileSync(".env.local", "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { monthlySnapshots } from "./schema";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const db = drizzle(client, { schema });

async function main() {
  const YahooFinance = (await import("yahoo-finance2")).default;
  const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

  // Fetch SPY monthly data Jul 2025 – Apr 2026
  const historical = await yf.historical("SPY", {
    period1: "2025-07-01",
    period2: "2026-04-30",
    interval: "1mo",
  });

  // Build map: "YYYY-MM" → closing price (last day of that month)
  const spyByMonth = new Map<string, number>();
  for (const bar of historical) {
    const d = new Date(bar.date);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    spyByMonth.set(ym, bar.close);
  }

  console.log("SPY monthly prices fetched:", Object.fromEntries(spyByMonth));

  const snapshots = await db.select().from(monthlySnapshots);
  for (const snap of snapshots) {
    const price = spyByMonth.get(snap.yearMonth);
    if (price == null) {
      console.log(`  No SPY data for ${snap.yearMonth}, skipping`);
      continue;
    }
    await db
      .update(monthlySnapshots)
      .set({ sp500Value: price })
      .where(eq(monthlySnapshots.yearMonth, snap.yearMonth));
    console.log(`  Updated ${snap.yearMonth}: SPY = ${price}`);
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
