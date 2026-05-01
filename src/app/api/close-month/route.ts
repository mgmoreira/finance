import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, priceCache, species, monthlySnapshots } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  // Vercel cron sends: Authorization: Bearer <CRON_SECRET>
  // Allow unauthenticated in dev (no CRON_SECRET set)
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Compute the month we're closing (previous month)
  const now = new Date();
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const yearMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  // Idempotent: if snapshot already exists, skip
  const existing = await db
    .select()
    .from(monthlySnapshots)
    .where(eq(monthlySnapshots.yearMonth, yearMonth))
    .get();
  if (existing) {
    return NextResponse.json({ ok: true, skipped: true, yearMonth, reason: "snapshot already exists" });
  }

  // ── Compute portfolio value from current priceCache ──
  // (priceCache still has last-month prices if this runs before May's first refresh)
  const allTxns = await db.select().from(transactions);
  const allSpecies = await db.select().from(species);
  const allPrices = await db.select().from(priceCache);

  const speciesMap = new Map(allSpecies.map((s) => [s.ticker, s]));
  const priceMap = new Map(allPrices.map((p) => [p.ticker, p]));

  const anyPrice = allPrices.find((p) => p.ticker !== "__SPY__");
  const mepRate = anyPrice?.exchangeRateMep ?? 0;

  // Aggregate buy/sell quantities per ticker
  const tickerData = new Map<string, { buyQty: number; sellQty: number; buyTotalUsd: number }>();
  for (const tx of allTxns) {
    if (!tickerData.has(tx.ticker)) {
      tickerData.set(tx.ticker, { buyQty: 0, sellQty: 0, buyTotalUsd: 0 });
    }
    const d = tickerData.get(tx.ticker)!;
    if (tx.type === "BUY") { d.buyQty += tx.quantity; d.buyTotalUsd += tx.totalUsd; }
    else { d.sellQty += tx.quantity; }
  }

  // Compute total portfolio value (same formula as calculations.ts)
  let totalValue = 0;
  for (const [ticker, data] of tickerData) {
    const qty = data.buyQty - data.sellQty;
    if (qty <= 0) continue;
    const pc = priceMap.get(ticker);
    const sp = speciesMap.get(ticker);
    const priceArs = pc?.priceArs ?? 0;
    const parity = pc?.parity ?? sp?.parity ?? 1;
    const stockPriceUsd = pc?.priceUsd ?? 0;
    const currentPriceUsd =
      mepRate > 0 && priceArs > 0 ? priceArs / mepRate : parity > 0 ? stockPriceUsd / parity : 0;
    totalValue += qty * currentPriceUsd;
  }

  // ── Compute deposits for the month being closed ──
  const monthDeposits = allTxns
    .filter((tx) => tx.date.startsWith(yearMonth))
    .reduce((sum, tx) => sum + (tx.type === "BUY" ? tx.totalUsd : -tx.totalUsd), 0);

  // ── Get the previous snapshot to compute gain (same logic as calculations.ts) ──
  const allSnapshots = await db
    .select()
    .from(monthlySnapshots)
    .orderBy(monthlySnapshots.yearMonth);
  const prevSnapshot = [...allSnapshots].filter((s) => s.yearMonth < yearMonth).pop();
  const prevValue = prevSnapshot?.portfolioValueUsd ?? 0;

  const gainUsd = totalValue - prevValue - Math.max(0, monthDeposits);
  const gainPct = prevValue > 0 ? (gainUsd / prevValue) * 100 : 0;

  // SPY closing price for the month
  const spyCache = priceMap.get("__SPY__");

  await db.insert(monthlySnapshots).values({
    yearMonth,
    portfolioValueUsd: Math.round(totalValue),
    depositsUsd: Math.round(Math.max(0, monthDeposits)),
    gainUsd: Math.round(gainUsd),
    gainPct: Math.round(gainPct * 100) / 100,
    sp500Value: spyCache?.priceUsd ?? null,
  });

  return NextResponse.json({
    ok: true,
    yearMonth,
    portfolioValueUsd: Math.round(totalValue),
    depositsUsd: Math.round(Math.max(0, monthDeposits)),
    gainUsd: Math.round(gainUsd),
    gainPct: Math.round(gainPct * 100) / 100,
  });
}
