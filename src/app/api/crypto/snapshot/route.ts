import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cryptoHoldings, cryptoPriceCache, cryptoMonthlySnapshots } from "@/db/schema";
import { eq } from "drizzle-orm";

type Holding = typeof cryptoHoldings.$inferSelect;

function investedUsd(holdings: Holding[]) {
  return Math.round(
    holdings.reduce((sum, h) => {
      const ep = h.entryPriceUsd ?? h.entryValueUsd / h.quantity;
      return sum + h.quantity * ep;
    }, 0) * 100
  ) / 100;
}

// Value of holdings at the last daily close of the given month (Yahoo history).
// Tickers without Yahoo data fall back to `fallbackPrices` (if given) or are skipped.
async function monthEndValue(
  holdings: Holding[],
  year: number,
  month: number,
  fallbackPrices?: Map<string, number | null>
) {
  const YahooFinance = (await import("yahoo-finance2")).default;
  const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const nextMonth = new Date(Date.UTC(year, month, 1)); // period2 is exclusive

  let totalValueUsd = 0;
  const skippedTickers: string[] = [];

  for (const h of holdings) {
    let price: number | null = null;
    if (h.yahooTicker) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chart: any = await yf.chart(h.yahooTicker, {
          period1: firstDay,
          period2: nextMonth,
          interval: "1d",
        });
        const quotes = (chart.quotes ?? []).filter((q: { close: number | null }) => q.close != null);
        price = quotes.at(-1)?.close ?? null;
      } catch { /* fall through */ }
    }
    if ((price == null || price <= 0) && fallbackPrices) price = fallbackPrices.get(h.ticker) ?? null;
    if (price != null && price > 0) totalValueUsd += h.quantity * price;
    else skippedTickers.push(h.ticker);
  }

  return { totalValueUsd: Math.round(totalValueUsd * 100) / 100, skippedTickers };
}

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
  const year = prevDate.getFullYear();
  const month = prevDate.getMonth() + 1;
  const yearMonth = `${year}-${String(month).padStart(2, "0")}`;

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
  // Cache is only a fallback — it may be stale if nobody refreshed during the month
  const fallback = new Map(prices.map((p) => [p.ticker, p.priceUsd]));

  const { totalValueUsd, skippedTickers } = await monthEndValue(holdings, year, month, fallback);
  const totalInvestedUsd = investedUsd(holdings);

  await db.insert(cryptoMonthlySnapshots).values({ yearMonth, totalValueUsd, totalInvestedUsd });

  return NextResponse.json({ ok: true, yearMonth, totalValueUsd, totalInvestedUsd, skippedTickers });
}

// POST — backfill: recompute last N months from Yahoo month-end closes
export async function POST(request: NextRequest) {
  let months = 3;
  try {
    const body = await request.json();
    if (body.months) months = Number(body.months);
  } catch { /* use default */ }

  const holdings = await db.select().from(cryptoHoldings);
  const totalInvestedUsd = investedUsd(holdings);

  const now = new Date();
  const results = [];

  for (let i = 1; i <= months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const yearMonth = `${year}-${String(month).padStart(2, "0")}`;

    const { totalValueUsd, skippedTickers } = await monthEndValue(holdings, year, month);

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
