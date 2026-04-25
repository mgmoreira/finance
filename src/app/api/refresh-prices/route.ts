import { NextResponse } from "next/server";
import { db } from "@/db";
import { priceCache, species, monthlySnapshots } from "@/db/schema";
import { fetchCedears, fetchArgStocks, fetchMep } from "@/lib/data912";
import { fetchQuotes } from "@/lib/yahoo";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    // 1. Get all species tickers
    const allSpecies = await db.select().from(species);
    const tickers = allSpecies.map((s) => s.ticker);

    // 2. Fetch data from APIs in parallel
    const [cedears, argStocks, mep, yahooQuotes] = await Promise.all([
      fetchCedears().catch(() => []),
      fetchArgStocks().catch(() => []),
      fetchMep().catch(() => ({ last: 0 })),
      fetchQuotes(tickers).catch(() => new Map()),
    ]);

    // Map US ticker → BYMA ticker when they differ
    const usToBymaTicker: Record<string, string> = {
      BG: "BNG",
      CRESY: "CRES",
    };

    // Map US ticker → BYMA local ticker for Argentine stocks (not CEDEARs)
    const usToLocalTicker: Record<string, string> = {
      YPF: "YPFD",
      TGS: "TGSU2",
      CRESY: "CRES",
    };

    // Build CEDEAR lookup by ticker
    const cedearMap = new Map<string, { last: number }>();
    for (const c of cedears) {
      cedearMap.set(c.ticker, { last: c.last });
    }

    // Build Argentine stocks lookup by ticker
    const argStockMap = new Map<string, { last: number }>();
    for (const s of argStocks) {
      argStockMap.set(s.ticker, { last: s.last });
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

      // For Argentine stocks not in CEDEARs, look up in arg_stocks
      const localTicker = usToLocalTicker[ticker];
      const argStock = localTicker ? argStockMap.get(localTicker) : undefined;

      const priceUsd = yahoo?.regularMarketPrice ?? 0; // US stock price (reference)
      const priceArs = cedear?.last || argStock?.last || 0; // CEDEAR or local stock price in ARS
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

    // Update sp500Value in current month's snapshot if it exists
    if (spyPrice > 0) {
      await db
        .update(monthlySnapshots)
        .set({ sp500Value: spyPrice })
        .where(eq(monthlySnapshots.yearMonth, currentMonth));
    }

    return NextResponse.json({ ok: true, updated: tickers.length, timestamp: now });
  } catch (error) {
    console.error("Price refresh failed:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
