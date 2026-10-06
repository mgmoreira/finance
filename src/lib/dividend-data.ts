import { db } from "@/db";
import { dividendCache, species, transactions } from "@/db/schema";
import type { Position } from "@/lib/calculations";
import { buildDividendSummary, defaultWithholding, type DividendSummary, type DivSource } from "@/lib/dividends";
import { todayAR } from "@/lib/wealth-data";

const EMPTY: DividendSummary = {
  next12Gross: 0, next12Net: 0, last12Gross: 0, last12Net: 0, netYieldPct: 0, byMonth: [], upcoming: [], paid: [], tickers: [],
};

// Never let dividend data break the BOLSA page: on any failure the panel just shows "sin datos"
export async function getDividendSummary(positions: Position[], stocksValue: number): Promise<DividendSummary> {
  try {
    return await buildFromDb(positions, stocksValue);
  } catch (e) {
    console.error("Dividend summary failed:", e);
    return EMPTY;
  }
}

async function buildFromDb(positions: Position[], stocksValue: number): Promise<DividendSummary> {
  const [cache, allSpecies, txns] = await Promise.all([
    db.select().from(dividendCache),
    db.select().from(species),
    db
      .select({ ticker: transactions.ticker, type: transactions.type, quantity: transactions.quantity, date: transactions.date })
      .from(transactions),
  ]);
  const withholding = new Map(allSpecies.map((s) => [s.ticker, s.withholdingPct]));

  const sources: DivSource[] = cache.map((r) => ({
    ticker: r.ticker,
    events: JSON.parse(r.events),
    nextExDate: r.nextExDate,
    nextPayDate: r.nextPayDate,
    payLagDays: r.payLagDays,
  }));
  const holdings = positions.map((p) => ({
    ticker: p.ticker,
    quantity: p.quantity,
    parity: p.parity,
    stockPriceUsd: p.stockPriceUsd,
    withholdingPct: withholding.get(p.ticker) ?? defaultWithholding(p.ticker, p.country),
  }));

  return buildDividendSummary(sources, holdings, txns, stocksValue, todayAR());
}
