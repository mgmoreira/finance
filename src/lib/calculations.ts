import { db } from "@/db";
import { transactions, priceCache, species, monthlySnapshots, cashMovements } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";

export interface Position {
  ticker: string;
  name: string;
  sector: string;
  country: string;
  quantity: number;
  avgPriceUsd: number; // avg CEDEAR price in USD (from transactions)
  currentPriceUsd: number; // current CEDEAR price in USD (= priceArs / mep)
  invested: number;
  currentValue: number;
  pnl: number;
  pnlPct: number;
  portfolioPct: number;
  // US prices (visual reference only, not used for balance)
  avgStockPriceUsd: number; // avg entry US stock price (= avgPriceUsd * parity)
  stockPriceUsd: number; // current US stock price from Yahoo
  ath: number; // US stock ATH from Yahoo
  athDistance: number; // % distance from US stock ATH
  dividendYield: number;
  monthStartPrice: number; // CEDEAR USD price at month start
  monthChangePct: number;
  parity: number;
  priceArs: number; // current CEDEAR price in ARS from data912
}

export interface PortfolioSummary {
  totalValue: number;
  totalInvested: number;
  totalGain: number;
  totalGainPct: number;
  twrPct: number;
  sp500Price: number;
  sp500MonthStart: number;
  sp500MonthChangePct: number;
  positions: Position[];
  byCountry: { country: string; value: number; pct: number }[];
  bySector: { sector: string; value: number; pct: number }[];
  monthlyStats: { yearMonth: string; gainPct: number; gainUsd: number; portfolioValue: number; depositsUsd: number; sp500Value: number | null }[];
  mepRate: number;
  cashBalanceArs: number;
  cashBalanceUsd: number;
  cashBalanceTotal: number;
  lastUpdated: string | null;
}

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  // 1. Get all transactions
  const allTxns = await db.select().from(transactions);

  // 2. Get all species
  const allSpecies = await db.select().from(species);
  const speciesMap = new Map(allSpecies.map((s) => [s.ticker, s]));

  // 3. Get price cache
  const allPrices = await db.select().from(priceCache);
  const priceMap = new Map(allPrices.map((p) => [p.ticker, p]));

  // 4. Get monthly snapshots
  const snapshots = await db.select().from(monthlySnapshots).orderBy(monthlySnapshots.yearMonth);

  // 5. Get cash balances by currency
  const allCashMovements = await db.select().from(cashMovements);
  const cashBalanceUsd = allCashMovements
    .filter((m) => (m.currency ?? "USD") === "USD")
    .reduce((sum, m) => sum + m.amount, 0);
  const cashBalanceArs = allCashMovements
    .filter((m) => m.currency === "ARS")
    .reduce((sum, m) => sum + m.amount, 0);

  // Get MEP rate from price cache
  const anyPriceEntry = allPrices.find((p) => p.ticker !== "__SPY__");
  const mepRate = anyPriceEntry?.exchangeRateMep ?? 0;

  // 5. Calculate positions per ticker
  const tickerData = new Map<string, {
    buyQty: number; sellQty: number;
    buyTotalUsd: number; sellTotalUsd: number;
    buyStockTotalUsd: number; // sum of stockPriceUsd * quantity for BUYs
  }>();

  for (const tx of allTxns) {
    if (!tickerData.has(tx.ticker)) {
      tickerData.set(tx.ticker, { buyQty: 0, sellQty: 0, buyTotalUsd: 0, sellTotalUsd: 0, buyStockTotalUsd: 0 });
    }
    const d = tickerData.get(tx.ticker)!;
    if (tx.type === "BUY") {
      d.buyQty += tx.quantity;
      d.buyTotalUsd += tx.totalUsd;
      d.buyStockTotalUsd += (tx.stockPriceUsd ?? 0) * tx.quantity;
    } else {
      d.sellQty += tx.quantity;
      d.sellTotalUsd += tx.totalUsd;
    }
  }

  const positions: Position[] = [];
  let totalValue = 0;

  for (const [ticker, data] of tickerData) {
    const quantity = data.buyQty - data.sellQty;
    if (quantity <= 0) continue;

    const sp = speciesMap.get(ticker);
    const pc = priceMap.get(ticker);

    const avgPriceUsd = data.buyQty > 0 ? data.buyTotalUsd / data.buyQty : 0;
    const invested = quantity * avgPriceUsd;

    // CEDEAR price in USD = CEDEAR price ARS / dolar MEP
    // Fallback: if no CEDEAR ARS price (e.g. not in data912), use US price / parity
    const priceArs = pc?.priceArs ?? 0;
    const parity = pc?.parity ?? sp?.parity ?? 1;
    const stockPriceUsd = pc?.priceUsd ?? 0;
    const currentPriceUsd = mepRate > 0 && priceArs > 0
      ? priceArs / mepRate
      : parity > 0 ? stockPriceUsd / parity : 0;
    const currentValue = quantity * currentPriceUsd;

    totalValue += currentValue;

    positions.push({
      ticker,
      name: sp?.name ?? ticker,
      sector: sp?.sector ?? "N/A",
      country: sp?.country ?? "N/A",
      quantity,
      avgPriceUsd,
      currentPriceUsd,
      invested,
      currentValue,
      pnl: currentValue - invested,
      pnlPct: invested > 0 ? ((currentValue - invested) / invested) * 100 : 0,
      portfolioPct: 0, // calculated after totalValue is known
      avgStockPriceUsd: data.buyQty > 0 ? data.buyStockTotalUsd / data.buyQty : 0,
      stockPriceUsd,
      ath: pc?.ath ?? 0,
      athDistance: pc?.ath && pc.ath > 0 ? ((pc.ath - stockPriceUsd) / pc.ath) * 100 : 0,
      dividendYield: sp?.dividendYield ?? 0,
      monthStartPrice: pc?.monthStartPrice ?? 0,
      monthChangePct: pc?.monthStartPrice && pc.monthStartPrice > 0
        ? ((currentPriceUsd - pc.monthStartPrice) / pc.monthStartPrice) * 100
        : 0,
      parity,
      priceArs,
    });
  }

  const cashBalanceTotal = cashBalanceUsd + (mepRate > 0 ? cashBalanceArs / mepRate : 0);
  // Cash is shown separately in the header — not included in balance or P&L

  // Calculate portfolio percentages (positions only)
  for (const pos of positions) {
    pos.portfolioPct = totalValue > 0 ? (pos.currentValue / totalValue) * 100 : 0;
  }

  // Sort by portfolio percentage descending (default)
  positions.sort((a, b) => b.portfolioPct - a.portfolioPct);

  const totalInvested = positions.reduce((sum, p) => sum + p.invested, 0);
  const totalGain = totalValue - totalInvested;
  const totalGainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  // By country
  const countryMap = new Map<string, number>();
  for (const pos of positions) {
    countryMap.set(pos.country, (countryMap.get(pos.country) ?? 0) + pos.currentValue);
  }
  const byCountry = [...countryMap.entries()]
    .map(([country, value]) => ({ country, value, pct: totalValue > 0 ? (value / totalValue) * 100 : 0 }))
    .sort((a, b) => b.pct - a.pct);

  // By sector
  const sectorMap = new Map<string, number>();
  for (const pos of positions) {
    sectorMap.set(pos.sector, (sectorMap.get(pos.sector) ?? 0) + pos.currentValue);
  }
  const bySector = [...sectorMap.entries()]
    .map(([sector, value]) => ({ sector, value, pct: totalValue > 0 ? (value / totalValue) * 100 : 0 }))
    .sort((a, b) => b.pct - a.pct);

  // Monthly stats
  const monthlyStats = snapshots.map((s) => ({
    yearMonth: s.yearMonth,
    gainPct: s.gainPct,
    gainUsd: s.gainUsd,
    portfolioValue: s.portfolioValueUsd,
    depositsUsd: s.depositsUsd,
    sp500Value: s.sp500Value ?? null,
  }));

  // S&P500
  const spyCache = priceMap.get("__SPY__");
  const sp500Price = spyCache?.priceUsd ?? 0;

  // Append current month if not already covered by a snapshot
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastSnapshot = monthlyStats[monthlyStats.length - 1];
  if (!lastSnapshot || lastSnapshot.yearMonth < currentYearMonth) {
    // Modified Dietz: gain / (start_value + time_weighted_deposits)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const totalDays = Math.max(1, Math.round((now.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)));
    const currentMonthTxns = allTxns.filter((tx) => tx.date.startsWith(currentYearMonth));

    let currentMonthDeposits = 0;
    let weightedDeposits = 0;
    for (const tx of currentMonthTxns) {
      const txDate = new Date(tx.date + "T12:00:00");
      const daysElapsed = Math.round((txDate.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24));
      const weight = (totalDays - daysElapsed) / totalDays;
      const amount = tx.type === "BUY" ? tx.totalUsd : -tx.totalUsd;
      currentMonthDeposits += amount;
      weightedDeposits += amount * weight;
    }

    const prevPortfolio = lastSnapshot?.portfolioValue ?? 0;
    const currentGainUsd = totalValue - prevPortfolio - currentMonthDeposits;
    const dietzBase = prevPortfolio + weightedDeposits;
    const currentGainPct = dietzBase > 0 ? (currentGainUsd / dietzBase) * 100 : 0;
    monthlyStats.push({
      yearMonth: currentYearMonth,
      gainPct: currentGainPct,
      gainUsd: currentGainUsd,
      portfolioValue: totalValue,
      depositsUsd: Math.max(0, currentMonthDeposits),
      sp500Value: sp500Price > 0 ? sp500Price : null,
    });
  }
  const sp500MonthStart = spyCache?.sp500MonthStart ?? 0;
  const sp500MonthChangePct = sp500MonthStart > 0
    ? ((sp500Price - sp500MonthStart) / sp500MonthStart) * 100
    : 0;

  // TWR: chain-link monthly returns (Modified Dietz per month → chained = approximate TWR)
  const twrPct = (monthlyStats.reduce((acc, s) => acc * (1 + s.gainPct / 100), 1) - 1) * 100;

  // Last updated
  const lastUpdated = anyPriceEntry?.updatedAt ?? null;

  return {
    totalValue,
    totalInvested,
    totalGain,
    totalGainPct,
    twrPct,
    sp500Price,
    sp500MonthStart,
    sp500MonthChangePct,
    positions,
    byCountry,
    bySector,
    monthlyStats,
    mepRate,
    cashBalanceArs,
    cashBalanceUsd,
    cashBalanceTotal,
    lastUpdated,
  };
}

export interface InvestmentByDate {
  date: string;
  totalUsd: number;
  accumulated: number;
  tickers: string[];
}

export async function getInvestmentsByDate(): Promise<{ byDate: InvestmentByDate[]; byMonth: { month: string; totalUsd: number }[] }> {
  const allTxns = await db
    .select()
    .from(transactions)
    .orderBy(transactions.date);

  const dateMap = new Map<string, { totalUsd: number; tickers: Set<string> }>();

  for (const tx of allTxns) {
    if (tx.type !== "BUY") continue;
    if (!dateMap.has(tx.date)) {
      dateMap.set(tx.date, { totalUsd: 0, tickers: new Set() });
    }
    const d = dateMap.get(tx.date)!;
    d.totalUsd += tx.totalUsd;
    d.tickers.add(tx.ticker);
  }

  let accumulated = 0;
  const byDate: InvestmentByDate[] = [];
  const monthMap = new Map<string, number>();

  for (const [date, data] of dateMap) {
    accumulated += data.totalUsd;
    byDate.push({
      date,
      totalUsd: data.totalUsd,
      accumulated,
      tickers: [...data.tickers],
    });

    const month = date.slice(0, 7);
    monthMap.set(month, (monthMap.get(month) ?? 0) + data.totalUsd);
  }

  const byMonth = [...monthMap.entries()]
    .map(([month, totalUsd]) => ({ month, totalUsd }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return { byDate, byMonth };
}

export interface RealizedSell {
  id: number;
  date: string;
  ticker: string;
  name: string;
  quantity: number;
  avgCostUsd: number;
  sellPriceUsd: number;
  realizedGainUsd: number;
  realizedGainPct: number;
}

export interface TickerRealizedSummary {
  ticker: string;
  name: string;
  sells: RealizedSell[];
  totalReceivedUsd: number;
  totalCostUsd: number;
  totalGainUsd: number;
  totalGainPct: number;
}

export interface RealizedPnlData {
  byTicker: TickerRealizedSummary[];
  allSells: RealizedSell[];
  totalGainUsd: number;
}

export async function getRealizedPnl(): Promise<RealizedPnlData> {
  const allTxns = await db.select().from(transactions).orderBy(transactions.date);
  const allSpecies = await db.select().from(species);
  const speciesMap = new Map(allSpecies.map((s) => [s.ticker, s]));

  // Track avg cost per ticker as transactions are processed chronologically
  const state = new Map<string, { qty: number; avgCostUsd: number }>();
  const allSells: RealizedSell[] = [];

  for (const tx of allTxns) {
    const s = state.get(tx.ticker) ?? { qty: 0, avgCostUsd: 0 };
    if (tx.type === "BUY") {
      const newQty = s.qty + tx.quantity;
      state.set(tx.ticker, {
        qty: newQty,
        avgCostUsd: newQty > 0 ? (s.qty * s.avgCostUsd + tx.quantity * tx.priceUsd) / newQty : 0,
      });
    } else {
      const gain = tx.quantity * (tx.priceUsd - s.avgCostUsd);
      allSells.push({
        id: tx.id,
        date: tx.date,
        ticker: tx.ticker,
        name: speciesMap.get(tx.ticker)?.name ?? tx.ticker,
        quantity: tx.quantity,
        avgCostUsd: s.avgCostUsd,
        sellPriceUsd: tx.priceUsd,
        realizedGainUsd: gain,
        realizedGainPct: s.avgCostUsd > 0 ? ((tx.priceUsd - s.avgCostUsd) / s.avgCostUsd) * 100 : 0,
      });
      state.set(tx.ticker, { qty: Math.max(0, s.qty - tx.quantity), avgCostUsd: s.avgCostUsd });
    }
  }

  // Summarize by ticker
  const byTickerMap = new Map<string, TickerRealizedSummary>();
  for (const sell of allSells) {
    if (!byTickerMap.has(sell.ticker)) {
      byTickerMap.set(sell.ticker, {
        ticker: sell.ticker,
        name: sell.name,
        sells: [],
        totalReceivedUsd: 0,
        totalCostUsd: 0,
        totalGainUsd: 0,
        totalGainPct: 0,
      });
    }
    const summary = byTickerMap.get(sell.ticker)!;
    summary.sells.push(sell);
    summary.totalReceivedUsd += sell.quantity * sell.sellPriceUsd;
    summary.totalCostUsd += sell.quantity * sell.avgCostUsd;
    summary.totalGainUsd += sell.realizedGainUsd;
  }
  for (const t of byTickerMap.values()) {
    t.totalGainPct = t.totalCostUsd > 0 ? (t.totalGainUsd / t.totalCostUsd) * 100 : 0;
  }

  const byTicker = [...byTickerMap.values()].sort((a, b) => b.totalGainUsd - a.totalGainUsd);
  const totalGainUsd = allSells.reduce((sum, s) => sum + s.realizedGainUsd, 0);

  return { byTicker, allSells, totalGainUsd };
}

export interface TransactionRow {
  id: number;
  ticker: string;
  type: string;
  quantity: number;
  priceArs: number;
  priceUsd: number;
  totalUsd: number;
  exchangeRate: number;
  stockPriceUsd: number | null;
  date: string;
  currency: string;
}

export async function getAllTransactions(): Promise<TransactionRow[]> {
  const rows = await db
    .select()
    .from(transactions)
    .orderBy(desc(transactions.date));

  return rows.map((r) => ({
    id: r.id,
    ticker: r.ticker,
    type: r.type,
    quantity: r.quantity,
    priceArs: r.priceArs,
    priceUsd: r.priceUsd,
    totalUsd: r.totalUsd,
    exchangeRate: r.exchangeRate,
    stockPriceUsd: r.stockPriceUsd,
    date: r.date,
    currency: r.currency,
  }));
}
