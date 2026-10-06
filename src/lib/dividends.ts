// Pure dividend estimation — safe to import from client and server.

export interface DivEvent {
  exDate: string; // YYYY-MM-DD
  amount: number; // per US share / ADR
}

export interface DivSource {
  ticker: string;
  events: DivEvent[]; // historical ex-dates from Yahoo
  nextExDate: string | null; // confirmed upcoming ex-date, if any
  nextPayDate: string | null; // US pay date for nextExDate
  payLagDays: number; // typical ex-date → US pay date gap for this ticker
}

export interface DivTxn {
  ticker: string;
  type: string;
  quantity: number;
  date: string;
}

export interface DivHolding {
  ticker: string;
  quantity: number; // current CEDEARs
  parity: number;
  stockPriceUsd: number;
  withholdingPct: number;
}

export interface DivPayment {
  ticker: string;
  exDate: string;
  payDate: string; // credited in BYMA
  amountEstimated: boolean; // amount repeated from last year
  dateConfirmed: boolean; // pay date announced by the company
  cedears: number;
  perShare: number;
  gross: number;
  net: number;
}

export interface TickerDividend {
  ticker: string;
  cedears: number;
  parity: number;
  annualPerShare: number;
  grossYieldPct: number;
  withholdingPct: number;
  next12Gross: number;
  next12Net: number;
  sharePct: number; // % of total next-12m net
  next: DivPayment | null;
}

export interface DividendSummary {
  next12Gross: number;
  next12Net: number;
  last12Gross: number;
  last12Net: number;
  netYieldPct: number; // next12Net / stocks value
  byMonth: { month: string; net: number }[];
  upcoming: DivPayment[];
  paid: DivPayment[];
  tickers: TickerDividend[];
}

export const DEFAULT_PAY_LAG_DAYS = 25;
export const CEDEAR_CREDIT_LAG_DAYS = 1; // BYMA credits the day after the US pay date
const DAY_MS = 86400000;

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(date) + days * DAY_MS).toISOString().slice(0, 10);
}

export function addYears(date: string, years: number): string {
  const md = date.slice(5) === "02-29" ? "02-28" : date.slice(5);
  return `${Number(date.slice(0, 4)) + years}-${md}`;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS);
}

// CEDEARs held when the dividend went ex (must be bought before the ex-date)
export function quantityAt(txns: DivTxn[], ticker: string, exDate: string): number {
  let q = 0;
  for (const t of txns) {
    if (t.ticker === ticker && t.date < exDate) q += t.type === "BUY" ? t.quantity : -t.quantity;
  }
  return Math.max(q, 0);
}

// Effective withholding (tax + custody costs), validated against real payments: US ≈ 35%, Brazil ≈ 25%
const WITHHOLDING_BY_TICKER: Record<string, number> = {
  ASML: 20, TSM: 26, BABA: 15, JD: 15, YPF: 7, TGS: 7, CRESY: 7, EWZ: 35,
};
const WITHHOLDING_BY_COUNTRY: Record<string, number> = { EEUU: 35, BRASIL: 25 };

export function defaultWithholding(ticker: string, country: string): number {
  return WITHHOLDING_BY_TICKER[ticker] ?? WITHHOLDING_BY_COUNTRY[country] ?? 35;
}

export interface CandidateEvent {
  exDate: string;
  amount: number;
  amountEstimated: boolean;
  usPayDate: string;
  dateConfirmed: boolean;
}

// Real past events + last year's pattern repeated one year ahead (confirmed next ex-date wins)
export function candidateEvents(src: DivSource, today: string): CandidateEvent[] {
  // Yahoo sometimes moves the ex-date forward while the pay date is still the previous one: ignore those
  const validNextPay = src.nextExDate && src.nextPayDate && src.nextPayDate >= src.nextExDate ? src.nextPayDate : null;
  const confirmedPay = (exDate: string) => exDate === src.nextExDate && validNextPay != null;
  const out: CandidateEvent[] = src.events.map((e) => ({
    exDate: e.exDate,
    amount: e.amount,
    amountEstimated: false,
    usPayDate: confirmedPay(e.exDate) ? validNextPay! : addDays(e.exDate, src.payLagDays),
    dateConfirmed: confirmedPay(e.exDate),
  }));

  const yearAgo = addYears(today, -1);
  const projected = src.events
    .filter((e) => e.exDate > yearAgo && e.exDate <= today)
    .map((e) => ({ exDate: addYears(e.exDate, 1), amount: e.amount }));

  const next = src.nextExDate;
  if (next && next > today && !src.events.some((e) => e.exDate === next)) {
    let best = -1;
    projected.forEach((p, i) => {
      const gap = Math.abs(daysBetween(p.exDate, next));
      if (gap <= 45 && (best < 0 || gap < Math.abs(daysBetween(projected[best].exDate, next)))) best = i;
    });
    const amount = best >= 0 ? projected[best].amount : (src.events.at(-1)?.amount ?? 0);
    if (best >= 0) projected.splice(best, 1);
    out.push({
      exDate: next,
      amount,
      amountEstimated: true,
      usPayDate: validNextPay ?? addDays(next, src.payLagDays),
      dateConfirmed: validNextPay != null,
    });
  }

  for (const p of projected) {
    out.push({
      exDate: p.exDate,
      amount: p.amount,
      amountEstimated: true,
      usPayDate: addDays(p.exDate, src.payLagDays),
      dateConfirmed: false,
    });
  }
  return out;
}

const byPayDate = (a: DivPayment, b: DivPayment) => a.payDate.localeCompare(b.payDate);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function buildDividendSummary(
  sources: DivSource[],
  holdings: DivHolding[],
  txns: DivTxn[],
  stocksValue: number,
  today: string
): DividendSummary {
  const yearAgo = addYears(today, -1);
  const yearAhead = addYears(today, 1);
  const holdingMap = new Map(holdings.map((h) => [h.ticker, h]));
  const upcoming: DivPayment[] = [];
  const paid: DivPayment[] = [];
  const tickers: TickerDividend[] = [];

  for (const src of sources) {
    const h = holdingMap.get(src.ticker);
    if (!h || h.parity <= 0) continue;
    const mineUpcoming: DivPayment[] = [];

    for (const c of candidateEvents(src, today)) {
      const payDate = addDays(c.usPayDate, CEDEAR_CREDIT_LAG_DAYS);
      const isPast = payDate <= today;
      if (isPast ? payDate <= yearAgo : payDate > yearAhead) continue;
      const cedears = c.exDate <= today ? quantityAt(txns, src.ticker, c.exDate) : h.quantity;
      if (cedears <= 0) continue;
      const gross = (cedears / h.parity) * c.amount;
      const payment: DivPayment = {
        ticker: src.ticker,
        exDate: c.exDate,
        payDate,
        amountEstimated: c.amountEstimated,
        dateConfirmed: c.dateConfirmed,
        cedears,
        perShare: c.amount,
        gross,
        net: gross * (1 - h.withholdingPct / 100),
      };
      if (isPast) paid.push(payment);
      else {
        upcoming.push(payment);
        mineUpcoming.push(payment);
      }
    }

    const annualPerShare = sum(src.events.filter((e) => e.exDate > yearAgo && e.exDate <= today).map((e) => e.amount));
    if (annualPerShare === 0 && mineUpcoming.length === 0) continue;
    mineUpcoming.sort(byPayDate);
    tickers.push({
      ticker: src.ticker,
      cedears: h.quantity,
      parity: h.parity,
      annualPerShare,
      grossYieldPct: h.stockPriceUsd > 0 ? (annualPerShare / h.stockPriceUsd) * 100 : 0,
      withholdingPct: h.withholdingPct,
      next12Gross: sum(mineUpcoming.map((p) => p.gross)),
      next12Net: sum(mineUpcoming.map((p) => p.net)),
      sharePct: 0,
      next: mineUpcoming[0] ?? null,
    });
  }

  upcoming.sort(byPayDate);
  paid.sort(byPayDate);
  const next12Net = sum(upcoming.map((p) => p.net));
  for (const t of tickers) t.sharePct = next12Net > 0 ? (t.next12Net / next12Net) * 100 : 0;
  tickers.sort((a, b) => b.next12Net - a.next12Net);

  // One bucket per month from the current month through the month a year ahead
  const byMonth: { month: string; net: number }[] = [];
  for (let d = `${today.slice(0, 7)}-01`; d.slice(0, 7) <= yearAhead.slice(0, 7); d = addMonths(d, 1)) {
    const month = d.slice(0, 7);
    byMonth.push({ month, net: sum(upcoming.filter((p) => p.payDate.startsWith(month)).map((p) => p.net)) });
  }

  return {
    next12Gross: sum(upcoming.map((p) => p.gross)),
    next12Net,
    last12Gross: sum(paid.map((p) => p.gross)),
    last12Net: sum(paid.map((p) => p.net)),
    netYieldPct: stocksValue > 0 ? (next12Net / stocksValue) * 100 : 0,
    byMonth,
    upcoming,
    paid,
    tickers,
  };
}

function addMonths(firstOfMonth: string, n: number): string {
  const y = Number(firstOfMonth.slice(0, 4));
  const m = Number(firstOfMonth.slice(5, 7)) - 1 + n;
  return `${y + Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, "0")}-01`;
}

// Capital needed to earn `annualNet` per year at a given net yield
export function capitalForIncome(annualNet: number, netYieldPct: number): number | null {
  return netYieldPct > 0 ? annualNet / (netYieldPct / 100) : null;
}
