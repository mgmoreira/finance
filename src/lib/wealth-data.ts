import { db } from "@/db";
import { wealthSnapshots, goalScenarios, investmentTransfers, monthlyBudgets } from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { getPortfolioSummary } from "@/lib/calculations";
import { getCryptoSummary } from "@/lib/crypto-data";
import { partsTotal, sumContributions, type Scenario, type WealthParts } from "@/lib/goals";

export interface WealthSnapshot extends WealthParts {
  id: number;
  date: string;
  source: "auto" | "manual";
  total: number;
}

export interface CurrentWealth extends WealthParts {
  date: string;
  total: number;
}

export interface WealthOverview {
  today: CurrentWealth;
  snapshots: WealthSnapshot[];
  scenarios: Scenario[];
  contributions12m: number;
}

// Today's date in Argentina as YYYY-MM-DD
export function todayAR(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
}

export async function getWealthSnapshots(): Promise<WealthSnapshot[]> {
  const rows = await db.select().from(wealthSnapshots).orderBy(asc(wealthSnapshots.date));
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    stocksUsd: r.stocksUsd,
    bondsUsd: r.bondsUsd,
    cryptoUsd: r.cryptoUsd,
    cashUsd: r.cashUsd,
    source: r.source,
    total: partsTotal(r),
  }));
}

export async function getScenarios(): Promise<Scenario[]> {
  const rows = await db.select().from(goalScenarios).orderBy(asc(goalScenarios.sortOrder), asc(goalScenarios.id));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    startYear: r.startYear,
    startValue: r.startValue,
    rate: r.rate,
    contribution: r.contribution,
    bonusFactor: r.bonusFactor,
    bonusSchedule: JSON.parse(r.bonusSchedule) as number[],
    endYear: r.endYear,
    color: r.color,
    visible: r.visible === 1,
    sortOrder: r.sortOrder,
  }));
}

// Live value: CEDEARs (MEP model) + crypto + cash; bonds aren't tracked, so take the latest cut's value
export async function getCurrentWealth(): Promise<CurrentWealth> {
  const [portfolio, crypto, lastCut] = await Promise.all([
    getPortfolioSummary(),
    getCryptoSummary(),
    db.select().from(wealthSnapshots).orderBy(desc(wealthSnapshots.date)).limit(1).get(),
  ]);
  const parts: WealthParts = {
    stocksUsd: portfolio.totalValue,
    bondsUsd: lastCut?.bondsUsd ?? 0,
    cryptoUsd: crypto.totalValue,
    cashUsd: portfolio.cashBalanceTotal,
  };
  return { date: todayAR(), ...parts, total: partsTotal(parts) };
}

// USD sent to investments (GASTOS transfers) in the last 12 months
export async function getContributions12m(): Promise<number> {
  const rows = await db
    .select({
      date: investmentTransfers.date,
      amountUsd: investmentTransfers.amountUsd,
      amountArs: investmentTransfers.amountArs,
      transferRate: investmentTransfers.exchangeRate,
      budgetRate: monthlyBudgets.exchangeRateUsd,
    })
    .from(investmentTransfers)
    .leftJoin(monthlyBudgets, eq(investmentTransfers.budgetId, monthlyBudgets.id));
  return sumContributions(
    rows.map((r) => ({ date: r.date, amountUsd: r.amountUsd, amountArs: r.amountArs, rate: r.transferRate ?? r.budgetRate })),
    todayAR()
  );
}

export async function getWealthOverview(): Promise<WealthOverview> {
  const [today, snapshots, scenarios, contributions12m] = await Promise.all([
    getCurrentWealth(),
    getWealthSnapshots(),
    getScenarios(),
    getContributions12m(),
  ]);
  return { today, snapshots, scenarios, contributions12m };
}
