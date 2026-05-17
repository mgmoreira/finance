import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cryptoHoldings, cryptoPriceCache, cryptoMonthlySnapshots } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET — cron: runs on 2nd of each month, snapshots previous month-end value
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const yearMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  const existing = await db
    .select()
    .from(cryptoMonthlySnapshots)
    .where(eq(cryptoMonthlySnapshots.yearMonth, yearMonth))
    .get();
  if (existing) {
    return NextResponse.json({ ok: true, skipped: true, yearMonth });
  }

  const [holdings, prices] = await Promise.all([
    db.select().from(cryptoHoldings),
    db.select().from(cryptoPriceCache),
  ]);
  const priceMap = new Map(prices.map((p) => [p.ticker, p.priceUsd]));

  let totalValueUsd = 0;
  let totalInvestedUsd = 0;

  for (const h of holdings) {
    const entryPriceUsd = h.entryPriceUsd ?? h.entryValueUsd / h.quantity;
    const priceUsd = priceMap.get(h.ticker) ?? null;
    totalInvestedUsd += h.quantity * entryPriceUsd;
    if (priceUsd != null && priceUsd > 0) totalValueUsd += h.quantity * priceUsd;
  }

  totalValueUsd = Math.round(totalValueUsd * 100) / 100;
  totalInvestedUsd = Math.round(totalInvestedUsd * 100) / 100;

  await db.insert(cryptoMonthlySnapshots).values({ yearMonth, totalValueUsd, totalInvestedUsd });

  return NextResponse.json({ ok: true, yearMonth, totalValueUsd, totalInvestedUsd });
}

// POST — backfill: fetch Yahoo historical prices for last N months
export async function POST(request: NextRequest) {
  let months = 3;
  try {
    const body = await request.json();
    if (body.months) months = Number(body.months);
  } catch { /* use default */ }

  const holdings = await db.select().from(cryptoHoldings);
  const holdingsWithYahoo = holdings.filter((h) => h.yahooTicker);

  const totalInvestedUsd = Math.round(
    holdings.reduce((sum, h) => {
      const ep = h.entryPriceUsd ?? h.entryValueUsd / h.quantity;
      return sum + h.quantity * ep;
    }, 0) * 100
  ) / 100;

  const YahooFinance = (await import("yahoo-finance2")).default;
  const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

  const now = new Date();
  const results = [];

  for (let i = 1; i <= months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const yearMonth = `${year}-${String(month).padStart(2, "0")}`;
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0); // day 0 of next month = last day of this month

    let totalValueUsd = 0;
    const skippedTickers: string[] = [];

    for (const h of holdingsWithYahoo) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chart: any = await yf.chart(h.yahooTicker!, {
          period1: firstDay,
          period2: lastDay,
          interval: "1d",
        });
        const quotes = (chart.quotes ?? []).filter((q: { close: number | null }) => q.close != null);
        const lastClose = quotes.at(-1)?.close ?? null;
        if (lastClose != null && lastClose > 0) {
          totalValueUsd += h.quantity * lastClose;
        } else {
          skippedTickers.push(h.ticker);
        }
      } catch {
        skippedTickers.push(h.ticker);
      }
    }

    totalValueUsd = Math.round(totalValueUsd * 100) / 100;

    await db
      .insert(cryptoMonthlySnapshots)
      .values({ yearMonth, totalValueUsd, totalInvestedUsd })
      .onConflictDoUpdate({
        target: cryptoMonthlySnapshots.yearMonth,
        set: { totalValueUsd, totalInvestedUsd },
      });

    results.push({ yearMonth, totalValueUsd, totalInvestedUsd, skippedTickers });
  }

  return NextResponse.json({ ok: true, results });
}
