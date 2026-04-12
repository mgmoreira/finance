import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import * as schema from "./schema";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const db = drizzle(client, { schema });

async function backfill() {
  // @ts-expect-error - dynamic import
  const YahooFinance = (await import("yahoo-finance2")).default;
  const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

  const allTxns = await db.select().from(schema.transactions);
  console.log(`Found ${allTxns.length} transactions to backfill`);

  // Group by ticker to batch Yahoo historical queries
  const tickerDates = new Map<string, Set<string>>();
  for (const tx of allTxns) {
    if (!tickerDates.has(tx.ticker)) tickerDates.set(tx.ticker, new Set());
    tickerDates.get(tx.ticker)!.add(tx.date);
  }

  // Fetch historical prices per ticker
  const priceCache = new Map<string, Map<string, number>>(); // ticker -> date -> price

  for (const [ticker, dates] of tickerDates) {
    console.log(`Fetching ${ticker} historical...`);
    const sortedDates = [...dates].sort();
    const startDate = new Date(sortedDates[0]);
    startDate.setDate(startDate.getDate() - 5); // buffer for weekends
    const endDate = new Date(sortedDates[sortedDates.length - 1]);
    endDate.setDate(endDate.getDate() + 2);

    try {
      const history = await yf.chart(ticker, {
        period1: startDate.toISOString().slice(0, 10),
        period2: endDate.toISOString().slice(0, 10),
        interval: "1d",
      });

      const dateMap = new Map<string, number>();
      if (history?.quotes) {
        for (const q of history.quotes) {
          if (q.date && q.close) {
            const d = new Date(q.date).toISOString().slice(0, 10);
            dateMap.set(d, q.close);
          }
        }
      }
      priceCache.set(ticker, dateMap);
      console.log(`  Got ${dateMap.size} days of data`);
    } catch (e) {
      console.log(`  Failed for ${ticker}:`, e instanceof Error ? e.message : e);
      priceCache.set(ticker, new Map());
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 500));
  }

  // Update each transaction
  let updated = 0;
  for (const tx of allTxns) {
    const dateMap = priceCache.get(tx.ticker);
    if (!dateMap) continue;

    // Find exact date or closest previous
    let price = dateMap.get(tx.date);
    if (!price) {
      const sorted = [...dateMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      const before = sorted.filter(([d]) => d <= tx.date);
      if (before.length > 0) {
        price = before[before.length - 1][1];
      }
    }

    if (price) {
      await db
        .update(schema.transactions)
        .set({ stockPriceUsd: Math.round(price * 100) / 100 })
        .where(eq(schema.transactions.id, tx.id));
      updated++;
    } else {
      console.log(`  No price found for ${tx.ticker} on ${tx.date}`);
    }
  }

  console.log(`Updated ${updated}/${allTxns.length} transactions with US stock prices`);

  // Verify a few
  const intc = await db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.ticker, "INTC"));
  console.log("\nINTC transactions:");
  for (const t of intc) {
    console.log(`  ${t.date}: CEDEAR ARS=${t.priceArs}, CEDEAR USD=${t.priceUsd.toFixed(2)}, Stock EEUU=$${t.stockPriceUsd}`);
  }
}

backfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
