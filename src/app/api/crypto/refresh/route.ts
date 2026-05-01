import { NextResponse } from "next/server";
import { db } from "@/db";
import { cryptoHoldings, cryptoPriceCache } from "@/db/schema";

export async function GET() {
  try {
    const holdings = await db.select().from(cryptoHoldings);
    const toFetch = holdings.filter((h) => h.yahooTicker);
    const yahooTickers = toFetch.map((h) => h.yahooTicker!);

    const YahooFinance = (await import("yahoo-finance2")).default;
    const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
    const results = await yf.quote(yahooTickers);
    const arr = Array.isArray(results) ? results : [results];

    const priceByYahoo = new Map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      arr.map((q: any) => [q.symbol, q.regularMarketPrice ?? null])
    );

    const now = new Date().toISOString();

    for (const h of holdings) {
      const priceUsd = h.yahooTicker ? (priceByYahoo.get(h.yahooTicker) ?? null) : null;
      // Sanity check: skip if price is essentially 0 (bad Yahoo data)
      const validPrice = priceUsd != null && priceUsd > 1e-8 ? priceUsd : null;

      await db
        .insert(cryptoPriceCache)
        .values({ ticker: h.ticker, priceUsd: validPrice, updatedAt: now })
        .onConflictDoUpdate({
          target: cryptoPriceCache.ticker,
          set: { priceUsd: validPrice, updatedAt: now },
        });
    }

    return NextResponse.json({ ok: true, updated: holdings.length, timestamp: now });
  } catch (error) {
    console.error("Crypto refresh failed:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
