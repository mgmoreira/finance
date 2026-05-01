import { db } from "@/db";
import { cryptoHoldings, cryptoPriceCache } from "@/db/schema";

export interface CryptoPosition {
  ticker: string;
  name: string;
  yahooTicker: string | null;
  quantity: number;
  entryPriceUsd: number;
  invested: number; // quantity * entryPriceUsd
  entryDate: string;
  priceUsd: number | null;
  currentValue: number | null;
  pnl: number | null;
  pnlPct: number | null;
  portfolioPct: number;
  updatedAt: string | null;
}

export interface CryptoSummary {
  totalValue: number;
  totalInvested: number;
  totalPnl: number;
  totalPnlPct: number;
  positions: CryptoPosition[];
  lastUpdated: string | null;
}

export async function getCryptoSummary(): Promise<CryptoSummary> {
  const holdings = await db.select().from(cryptoHoldings);
  const prices = await db.select().from(cryptoPriceCache);
  const priceMap = new Map(prices.map((p) => [p.ticker, p]));

  let totalValue = 0;
  let totalInvested = 0;

  const positions: CryptoPosition[] = holdings.map((h) => {
    const pc = priceMap.get(h.ticker);
    const priceUsd = pc?.priceUsd ?? null;
    const entryPriceUsd = h.entryPriceUsd ?? (h.entryValueUsd / h.quantity);
    const invested = h.quantity * entryPriceUsd;
    const currentValue = priceUsd != null ? h.quantity * priceUsd : null;
    if (currentValue != null) totalValue += currentValue;
    totalInvested += invested;
    const pnl = currentValue != null ? currentValue - invested : null;
    const pnlPct = pnl != null && invested > 0 ? (pnl / invested) * 100 : null;

    return {
      ticker: h.ticker,
      name: h.name,
      yahooTicker: h.yahooTicker,
      quantity: h.quantity,
      entryPriceUsd,
      invested,
      entryDate: h.entryDate,
      priceUsd,
      currentValue,
      pnl,
      pnlPct,
      portfolioPct: 0,
      updatedAt: pc?.updatedAt ?? null,
    };
  });

  for (const p of positions) {
    p.portfolioPct = totalValue > 0 && p.currentValue != null
      ? (p.currentValue / totalValue) * 100
      : 0;
  }

  positions.sort((a, b) => (b.currentValue ?? 0) - (a.currentValue ?? 0));

  const totalPnl = totalValue - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const lastUpdated = prices.length > 0
    ? prices.reduce((latest, p) => (p.updatedAt ?? "") > latest ? (p.updatedAt ?? "") : latest, "")
    : null;

  return { totalValue, totalInvested, totalPnl, totalPnlPct, positions, lastUpdated };
}
