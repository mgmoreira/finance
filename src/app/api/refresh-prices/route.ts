import { NextResponse } from "next/server";
import { db } from "@/db";
import { priceCache, species } from "@/db/schema";
import { fetchCedears, fetchMep } from "@/lib/data912";
import { fetchQuotes } from "@/lib/yahoo";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    // 1. Get all species tickers
    const allSpecies = await db.select().from(species);
    const tickers = allSpecies.map((s) => s.ticker);

    // 2. Fetch data from APIs in parallel
    const [cedears, mep, yahooQuotes] = await Promise.all([
      fetchCedears().catch(() => []),
      fetchMep().catch(() => ({ last: 0 })),
      fetchQuotes(tickers).catch(() => new Map()),
    ]);

    // Map US ticker → BYMA ticker when they differ
    const usToBymaTicker: Record<string, string> = {
      BG: "BNG",
      CRESY: "CRES",
    };

    // Build CEDEAR lookup by ticker (using both BYMA and US names)
    const cedearMap = new Map<string, { last: number }>();
    for (const c of cedears) {
      cedearMap.set(c.ticker, { last: c.last });
    }

    // Build species lookup for parity
    const speciesMap = new Map<string, number>();
    for (const s of allSpecies) {
      speciesMap.set(s.ticker, s.parity ?? 1);
    }

    const now = new Date().toISOString();
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    // 3. Update price_cache for each ticker
    for (const ticker of tickers) {
      const yahoo = yahooQuotes.get(ticker);
      // Look up CEDEAR price using BYMA ticker if different from US ticker
      const bymaTicker = usToBymaTicker[ticker] ?? ticker;
      const cedear = cedearMap.get(bymaTicker);

      const priceUsd = yahoo?.regularMarketPrice ?? 0; // US stock price (reference)
      const priceArs = cedear?.last ?? 0; // CEDEAR price in ARS (from data912)
      const parity = speciesMap.get(ticker) ?? 1;

      // CEDEAR price in USD = CEDEAR ARS / MEP
      const cedearPriceUsd = mep.last > 0 && priceArs > 0 ? priceArs / mep.last : 0;

      // Get existing cache to preserve month_start_price
      const existing = await db.select().from(priceCache).where(eq(priceCache.ticker, ticker)).get();

      // month_start_price stores CEDEAR USD price at month start
      let monthStartPrice = existing?.monthStartPrice ?? cedearPriceUsd;
      const existingMonth = existing?.updatedAt?.slice(0, 7);
      if (existingMonth && existingMonth !== currentMonth) {
        // New month — set month start price to current CEDEAR USD price
        monthStartPrice = cedearPriceUsd;
      }

      await db
        .insert(priceCache)
        .values({
          ticker,
          priceUsd,
          priceArs,
          parity,
          exchangeRateMep: mep.last,
          ath: yahoo?.fiftyTwoWeekHigh ?? existing?.ath ?? 0,
          monthStartPrice,
          sp500MonthStart: existing?.sp500MonthStart ?? 0,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: priceCache.ticker,
          set: {
            priceUsd,
            priceArs,
            parity,
            exchangeRateMep: mep.last,
            ath: yahoo?.fiftyTwoWeekHigh ?? existing?.ath ?? 0,
            monthStartPrice,
            updatedAt: now,
          },
        });
    }

    // 4. Update SPY month start separately
    const spyQuote = await fetchQuotes(["SPY"]).catch(() => new Map());
    const spyPrice = spyQuote.get("SPY")?.regularMarketPrice ?? 0;
    const existingSpy = await db.select().from(priceCache).where(eq(priceCache.ticker, "__SPY__")).get();
    const spyMonthStart = existingSpy?.updatedAt?.slice(0, 7) !== currentMonth
      ? spyPrice
      : existingSpy?.monthStartPrice ?? spyPrice;

    await db
      .insert(priceCache)
      .values({
        ticker: "__SPY__",
        priceUsd: spyPrice,
        priceArs: 0,
        parity: 1,
        exchangeRateMep: mep.last,
        ath: 0,
        monthStartPrice: spyMonthStart,
        sp500MonthStart: spyMonthStart,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: priceCache.ticker,
        set: {
          priceUsd: spyPrice,
          monthStartPrice: spyMonthStart,
          sp500MonthStart: spyMonthStart,
          updatedAt: now,
        },
      });

    return NextResponse.json({ ok: true, updated: tickers.length, timestamp: now });
  } catch (error) {
    console.error("Price refresh failed:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
