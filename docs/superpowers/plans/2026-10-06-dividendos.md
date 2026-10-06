# Dividendos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Panel de dividendos estimados en BOLSA (montos, %, calendario, calculadora de meta), dato por acción en el drawer, y aporte real vs escenario en Objetivos.

**Architecture:** Lógica pura en `src/lib/dividends.ts` (testeada), cache de eventos de Yahoo en tabla `dividend_cache` refrescada desde `/api/refresh-prices` (máx. 1 vez/día por ticker), retención editable en `species.withholding_pct`, armado server-side en `src/lib/dividend-data.ts` y panel cliente `src/components/dividends-panel.tsx`.

**Tech Stack:** Next.js 16 App Router, Turso + Drizzle, yahoo-finance2 v3 (`new YahooFinance()`), recharts 3, `tsx --test`.

**Spec:** `docs/superpowers/specs/2026-10-06-dividendos-design.md`

## Global Constraints

- Neto = CEDEARs ÷ paridad × dividendo por acción × (1 − retención/100).
- CEDEARs con derecho = operaciones con `date < exDate`.
- Fecha de pago = pago EEUU + 1 día; pago EEUU = confirmado o `exDate + payLagDays` (default 25).
- Defaults de retención: EEUU 35, BRASIL 25, ASML 20, TSM 26, BABA 15, JD 15, YPF 7, TGS 7, CRESY 7, EWZ 35, resto 35.
- Ventanas por fecha de pago: próximos = (hoy, hoy+1a], pasados = (hoy−1a, hoy].
- El balance (`calculations.ts`) no se toca.
- NUNCA commitear/pushear/deployar sin preguntar (CLAUDE.md). Sin pasos de commit.
- Base única de producción: solo cambios aditivos.
- Montos con `data-money`.

## Review Focus

1. Acción con dividendos pero vendida toda antes del corte → 0 CEDEARs, no genera pago (test Task 1).
2. Fecha 29/02 al proyectar un año → no produce fecha inválida (test Task 1).
3. Rendimiento neto 0 (sin dividendos) → calculadora muestra "—", nunca Infinity (test Task 1 + UI).
4. Retención editada fuera de 0–100 o texto → rechazada por la API con mensaje (Task 3, verificación curl).
5. Yahoo caído durante el refresh → el refresh de precios no falla; queda el cache anterior (Task 2).

---

### Task 1: Motor de dividendos (puro)

**Files:**
- Create: `src/lib/dividends.ts`, `src/lib/dividends.test.ts`
- Modify: `src/lib/goals.ts` (agregar `sumContributions`), `src/lib/goals.test.ts`

**Interfaces — Produces:**
- `DivEvent { exDate: string; amount: number }`
- `DivSource { ticker; events: DivEvent[]; nextExDate: string|null; nextPayDate: string|null; payLagDays: number }`
- `DivTxn { ticker; type; quantity; date }`, `DivHolding { ticker; quantity; parity; stockPriceUsd; withholdingPct }`
- `DivPayment { ticker; exDate; payDate; amountEstimated; dateConfirmed; cedears; perShare; gross; net }`
- `TickerDividend { ticker; cedears; parity; annualPerShare; grossYieldPct; withholdingPct; next12Gross; next12Net; sharePct; next: DivPayment|null }`
- `DividendSummary { next12Gross; next12Net; last12Gross; last12Net; netYieldPct; byMonth: {month; net}[]; upcoming: DivPayment[]; paid: DivPayment[]; tickers: TickerDividend[] }`
- `DEFAULT_PAY_LAG_DAYS`, `addDays`, `addYears`, `daysBetween`, `quantityAt`, `defaultWithholding`, `candidateEvents`, `buildDividendSummary`, `capitalForIncome`
- goals.ts: `ContributionRow { date: string; amountUsd: number|null; amountArs: number; rate: number|null }`, `sumContributions(rows, today): number`

- [ ] **Step 1: Test que falla** — crear `src/lib/dividends.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addYears, addDays, quantityAt, defaultWithholding, candidateEvents, buildDividendSummary, capitalForIncome,
  type DivSource, type DivTxn, type DivHolding,
} from "./dividends";

const TODAY = "2026-10-06";
const r2 = (n: number) => Math.round(n * 100) / 100;

test("addYears maneja 29/02 y addDays cruza meses", () => {
  assert.equal(addYears("2028-02-29", 1), "2029-02-28");
  assert.equal(addYears("2026-09-04", 1), "2027-09-04");
  assert.equal(addDays("2026-09-30", 1), "2026-10-01");
});

test("quantityAt cuenta solo operaciones anteriores a la fecha de corte", () => {
  const txns: DivTxn[] = [
    { ticker: "X", type: "BUY", quantity: 100, date: "2026-01-10" },
    { ticker: "X", type: "BUY", quantity: 50, date: "2026-09-04" }, // mismo día del corte: no cobra
    { ticker: "X", type: "SELL", quantity: 30, date: "2026-05-01" },
    { ticker: "Y", type: "BUY", quantity: 999, date: "2026-01-01" },
  ];
  assert.equal(quantityAt(txns, "X", "2026-09-04"), 70);
  assert.equal(quantityAt(txns, "X", "2026-01-10"), 0);
});

test("defaultWithholding por ticker y país", () => {
  assert.equal(defaultWithholding("PEP", "EEUU"), 35);
  assert.equal(defaultWithholding("VALE", "BRASIL"), 25);
  assert.equal(defaultWithholding("EWZ", "BRASIL"), 35);
  assert.equal(defaultWithholding("ASML", "EUROPA"), 20);
  assert.equal(defaultWithholding("TGS", "ARG"), 7);
  assert.equal(defaultWithholding("ZZZ", "LATINO"), 35);
});

const pep: DivSource = { ticker: "PEP", events: [{ exDate: "2026-09-04", amount: 1.48 }], nextExDate: null, nextPayDate: null, payLagDays: 26 };
const unh: DivSource = { ticker: "UNH", events: [{ exDate: "2026-09-14", amount: 2.32 }], nextExDate: null, nextPayDate: null, payLagDays: 8 };
const pbr: DivSource = { ticker: "PBR", events: [{ exDate: "2026-08-25", amount: 0.53 }], nextExDate: null, nextPayDate: null, payLagDays: 126 };
const txns: DivTxn[] = [
  { ticker: "PEP", type: "BUY", quantity: 305, date: "2025-01-01" },
  { ticker: "UNH", type: "BUY", quantity: 293, date: "2025-01-01" },
  { ticker: "PBR", type: "BUY", quantity: 107, date: "2025-01-01" },
];
const holdings: DivHolding[] = [
  { ticker: "PEP", quantity: 305, parity: 18, stockPriceUsd: 125.77, withholdingPct: 35 },
  { ticker: "UNH", quantity: 293, parity: 33, stockPriceUsd: 375.22, withholdingPct: 35 },
  { ticker: "PBR", quantity: 107, parity: 1, stockPriceUsd: 23.97, withholdingPct: 25 },
];

test("reproduce los cobros reales: PEP 1/10 ≈ 16,27 y UNH 23/9 ≈ 13,37", () => {
  const s = buildDividendSummary([pep, unh], holdings, txns, 50000, TODAY);
  const p = s.paid.find((x) => x.ticker === "PEP")!;
  assert.equal(p.payDate, "2026-10-01");
  assert.equal(r2(p.gross), 25.08);
  assert.equal(r2(p.net), 16.3);
  const u = s.paid.find((x) => x.ticker === "UNH")!;
  assert.equal(u.payDate, "2026-09-23");
  assert.equal(r2(u.net), 13.39);
});

test("PBR: corte en agosto, pago en diciembre → cuenta como próximo, con la cantidad al corte", () => {
  const s = buildDividendSummary([pbr], holdings, txns, 50000, TODAY);
  const p = s.upcoming.find((x) => x.exDate === "2026-08-25")!;
  assert.equal(p.payDate, "2026-12-30");
  assert.equal(p.cedears, 107);
  assert.equal(r2(p.gross), 56.71);
  assert.equal(s.paid.length, 0);
});

test("proyección: repite el último año y la fecha confirmada reemplaza a la proyectada", () => {
  const msft: DivSource = {
    ticker: "MSFT",
    events: [{ exDate: "2025-11-20", amount: 0.91 }, { exDate: "2026-02-19", amount: 0.91 }],
    nextExDate: "2026-11-19", nextPayDate: "2026-12-10", payLagDays: 21,
  };
  const c = candidateEvents(msft, TODAY);
  const future = c.filter((x) => x.exDate > TODAY).map((x) => x.exDate).sort();
  assert.deepEqual(future, ["2026-11-19", "2027-02-19"]);
  const confirmed = c.find((x) => x.exDate === "2026-11-19")!;
  assert.equal(confirmed.usPayDate, "2026-12-10");
  assert.equal(confirmed.dateConfirmed, true);
  assert.equal(confirmed.amountEstimated, true);
});

test("resumen: totales, rendimiento, por mes, % por acción", () => {
  const s = buildDividendSummary([pep, unh, pbr], holdings, txns, 50000, TODAY);
  assert.equal(r2(s.last12Net), r2(16.3 + 13.39 + 0));
  assert.ok(s.next12Net > 0);
  assert.equal(r2(s.netYieldPct), r2((s.next12Net / 50000) * 100));
  assert.equal(s.byMonth[0].month, "2026-10");
  assert.equal(r2(s.byMonth.reduce((a, m) => a + m.net, 0)), r2(s.next12Net));
  const total = s.tickers.reduce((a, t) => a + t.sharePct, 0);
  assert.ok(Math.abs(total - 100) < 0.01);
  const t = s.tickers.find((x) => x.ticker === "PEP")!;
  assert.equal(r2(t.grossYieldPct), r2((1.48 / 125.77) * 100));
});

test("vendida antes del corte → no genera pago", () => {
  const sold: DivTxn[] = [...txns, { ticker: "PEP", type: "SELL", quantity: 305, date: "2026-08-01" }];
  const s = buildDividendSummary([pep], holdings, sold, 50000, TODAY);
  assert.equal(s.paid.length, 0);
});

test("capitalForIncome", () => {
  assert.equal(capitalForIncome(1000, 2), 50000);
  assert.equal(capitalForIncome(1000, 0), null);
});
```

Agregar a `src/lib/goals.test.ts`:

```ts

test("sumContributions: últimos 12 meses en USD con fallback de tipo de cambio", () => {
  const rows = [
    { date: "2026-08-10", amountUsd: 1000, amountArs: 0, rate: null },
    { date: "2026-04-10", amountUsd: null, amountArs: 1500000, rate: 1500 },
    { date: "2026-01-10", amountUsd: null, amountArs: 300000, rate: null }, // sin cotización → se ignora
    { date: "2025-09-01", amountUsd: 5000, amountArs: 0, rate: null }, // fuera de los 12 meses
  ];
  assert.equal(sumContributions(rows, "2026-10-06"), 2000);
});
```

y sumar `sumContributions` al import de `./goals`.

- [ ] **Step 2: Correr** `npm test` → FAIL (`Cannot find module './dividends'`, `sumContributions` no existe).

- [ ] **Step 3: Implementar** — crear `src/lib/dividends.ts`:

```ts
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
  const confirmedPay = (exDate: string) => exDate === src.nextExDate && src.nextPayDate != null;
  const out: CandidateEvent[] = src.events.map((e) => ({
    exDate: e.exDate,
    amount: e.amount,
    amountEstimated: false,
    usPayDate: confirmedPay(e.exDate) ? src.nextPayDate! : addDays(e.exDate, src.payLagDays),
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
      usPayDate: src.nextPayDate ?? addDays(next, src.payLagDays),
      dateConfirmed: src.nextPayDate != null,
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
```

Agregar al final de `src/lib/goals.ts`:

```ts

export interface ContributionRow {
  date: string;
  amountUsd: number | null;
  amountArs: number;
  rate: number | null; // transfer rate, or the month's budget rate as fallback
}

// USD sent to investments in the last 12 months (rows without any USD value or rate are skipped)
export function sumContributions(rows: ContributionRow[], today: string): number {
  const yearAgo = `${Number(today.slice(0, 4)) - 1}${today.slice(4)}`;
  let total = 0;
  for (const r of rows) {
    if (r.date <= yearAgo || r.date > today) continue;
    if (r.amountUsd != null) total += r.amountUsd;
    else if (r.rate && r.rate > 0) total += r.amountArs / r.rate;
  }
  return total;
}
```

- [ ] **Step 4:** `npm test` → PASS (todos). `npx tsc --noEmit -p .` → OK.

---

### Task 2: Cache de dividendos + retención en la base + refresh

**Files:**
- Modify: `src/db/schema.ts` (tabla `dividendCache`, columna `species.withholdingPct`)
- Create: `src/db/migrate-dividends.ts`, `src/lib/dividend-refresh.ts`
- Modify: `src/app/api/refresh-prices/route.ts` (llamar al refresh antes del bloque "4. Update SPY")

**Interfaces — Produces:** `refreshDividendCache(tickers: string[], force?: boolean): Promise<{ refreshed: number }>`; `dividendCache.{ticker, events, nextExDate, nextPayDate, payLagDays, updatedAt}`; `species.withholdingPct`.

- [ ] **Step 1: Schema.** En `src/db/schema.ts`, dentro de `species` agregar después de `dividendYield`:

```ts
  withholdingPct: real("withholding_pct"), // effective dividend withholding %, null = default by country
```

y al final del archivo:

```ts

export const dividendCache = sqliteTable("dividend_cache", {
  ticker: text("ticker").primaryKey(),
  events: text("events").notNull().default("[]"), // JSON [{ exDate, amount }]
  nextExDate: text("next_ex_date"),
  nextPayDate: text("next_pay_date"),
  payLagDays: integer("pay_lag_days").notNull().default(25),
  updatedAt: text("updated_at").notNull(),
});
```

- [ ] **Step 2: Migración** — crear `src/db/migrate-dividends.ts`:

```ts
import { createClient } from "@libsql/client";
import { readFileSync } from "fs";

const envContent = readFileSync(".env.local", "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function migrate() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS dividend_cache (
      ticker TEXT PRIMARY KEY,
      events TEXT NOT NULL DEFAULT '[]',
      next_ex_date TEXT,
      next_pay_date TEXT,
      pay_lag_days INTEGER NOT NULL DEFAULT 25,
      updated_at TEXT NOT NULL
    )
  `);
  const cols = (await client.execute("PRAGMA table_info(species)")).rows.map((r) => r.name);
  if (!cols.includes("withholding_pct")) {
    await client.execute("ALTER TABLE species ADD COLUMN withholding_pct REAL");
    console.log("Added species.withholding_pct");
  }
  console.log("Migration complete: dividend_cache + species.withholding_pct");
}

migrate().catch(console.error);
```

Run: `npx tsx src/db/migrate-dividends.ts` → `Added species.withholding_pct`, `Migration complete...`. Re-run → solo `Migration complete...`.

- [ ] **Step 3: Refresh** — crear `src/lib/dividend-refresh.ts`:

```ts
import { db } from "@/db";
import { dividendCache } from "@/db/schema";
import { DEFAULT_PAY_LAG_DAYS, daysBetween, type DivEvent } from "@/lib/dividends";

const STALE_MS = 24 * 60 * 60 * 1000;
const toDate = (d: Date) => d.toISOString().slice(0, 10);

// Refresh Yahoo dividend history + calendar for tickers whose cache is older than a day
export async function refreshDividendCache(tickers: string[], force = false): Promise<{ refreshed: number }> {
  const existing = new Map((await db.select().from(dividendCache)).map((r) => [r.ticker, r]));
  const now = Date.now();
  const stale = tickers.filter((t) => {
    const row = existing.get(t);
    return force || !row || now - Date.parse(row.updatedAt) > STALE_MS;
  });
  if (stale.length === 0) return { refreshed: 0 };

  const YahooFinance = (await import("yahoo-finance2")).default;
  const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
  const period1 = new Date(now - 2 * 365 * 24 * 60 * 60 * 1000);
  const today = toDate(new Date());
  let refreshed = 0;

  for (const ticker of stale) {
    try {
      const [chart, summary] = await Promise.all([
        yf.chart(ticker, { period1, events: "div" }),
        yf.quoteSummary(ticker, { modules: ["calendarEvents"] }).catch(() => null),
      ]);
      const events: DivEvent[] = (chart.events?.dividends ?? [])
        .map((d) => ({ exDate: toDate(d.date), amount: d.amount }))
        .sort((a, b) => a.exDate.localeCompare(b.exDate));

      const ce = summary?.calendarEvents;
      const ex = ce?.exDividendDate ? toDate(ce.exDividendDate) : null;
      const pay = ce?.dividendDate ? toDate(ce.dividendDate) : null;
      const lag = ex && pay && pay >= ex && daysBetween(ex, pay) <= 200 ? daysBetween(ex, pay) : DEFAULT_PAY_LAG_DAYS;
      const upcoming = ex != null && ex > today;

      const values = {
        events: JSON.stringify(events),
        nextExDate: upcoming ? ex : null,
        nextPayDate: upcoming ? pay : null,
        payLagDays: lag,
        updatedAt: new Date().toISOString(),
      };
      await db
        .insert(dividendCache)
        .values({ ticker, ...values })
        .onConflictDoUpdate({ target: dividendCache.ticker, set: values });
      refreshed++;
    } catch (e) {
      console.error(`dividend refresh failed for ${ticker}`, e);
    }
  }
  return { refreshed };
}
```

- [ ] **Step 4: Engancharlo** — en `src/app/api/refresh-prices/route.ts`:
  - import: `import { refreshDividendCache } from "@/lib/dividend-refresh";`
  - justo antes de `// 4. Update SPY month start separately`:

```ts
    // Dividend history/calendar (Yahoo is slow; only tickers whose cache is > 1 day old)
    await refreshDividendCache(tickers).catch((e) => console.error("Dividend refresh failed:", e));

```

- [ ] **Step 5: Verificar**: `npx tsc --noEmit -p .` OK. Dev server + `curl -s http://localhost:3000/api/refresh-prices` → `{"ok":true,...}`; luego en la base `select ticker, next_ex_date, next_pay_date, pay_lag_days, length(events) from dividend_cache` → PEP lag 26, UNH 8, PBR ~126, AMZN events `[]`.

---

### Task 3: Datos para la página + API de retención

**Files:**
- Create: `src/lib/dividend-data.ts`, `src/app/api/dividends/withholding/route.ts`

**Interfaces:** Consumes `Position` (calculations.ts: `ticker, quantity, parity, stockPriceUsd, country`), `buildDividendSummary`, `defaultWithholding`, `todayAR` (wealth-data.ts). Produces `getDividendSummary(positions: Position[], stocksValue: number): Promise<DividendSummary>`; `PUT /api/dividends/withholding` body `{ ticker: string, withholdingPct: number | null }`.

- [ ] **Step 1** — crear `src/lib/dividend-data.ts`:

```ts
import { db } from "@/db";
import { dividendCache, species, transactions } from "@/db/schema";
import type { Position } from "@/lib/calculations";
import { buildDividendSummary, defaultWithholding, type DividendSummary, type DivSource } from "@/lib/dividends";
import { todayAR } from "@/lib/wealth-data";

export async function getDividendSummary(positions: Position[], stocksValue: number): Promise<DividendSummary> {
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
```

- [ ] **Step 2** — crear `src/app/api/dividends/withholding/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { species } from "@/db/schema";
import { eq } from "drizzle-orm";

// PUT { ticker, withholdingPct } — null resets to the default for the ticker's country
export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const ticker = typeof body?.ticker === "string" ? body.ticker : "";
  const raw = body?.withholdingPct;
  const pct = raw === null ? null : typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
  if (!ticker) return NextResponse.json({ error: "Falta el ticker" }, { status: 400 });
  if (pct !== null && (!Number.isFinite(pct) || pct < 0 || pct > 100)) {
    return NextResponse.json({ error: "La retención tiene que estar entre 0 y 100%" }, { status: 400 });
  }
  const res = await db.update(species).set({ withholdingPct: pct }).where(eq(species.ticker, ticker)).returning();
  if (res.length === 0) return NextResponse.json({ error: "Ticker inexistente" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verificar**: tsc OK; curl:
  - `PUT {"ticker":"PEP","withholdingPct":150}` → 400 "entre 0 y 100%"
  - `PUT {"ticker":"PEP","withholdingPct":"abc"}` → 400
  - `PUT {"ticker":"PEP","withholdingPct":null}` → `{"ok":true}`

---

### Task 4: Panel de dividendos en BOLSA + dato en el drawer

**Files:**
- Create: `src/components/dividends-panel.tsx`
- Modify: `src/app/page.tsx`, `src/components/positions-table.tsx`, `src/components/ticker-drawer.tsx`

**Interfaces:** Consumes `DividendSummary`, `TickerDividend`, `capitalForIncome` (dividends.ts), `PUT /api/dividends/withholding`. Produces `DividendsPanel({ summary, stocksValue })`; `PositionsTable` prop `dividends?: TickerDividend[]`; `TickerDrawer` prop `dividend?: TickerDividend`.

- [ ] **Step 1** — crear `src/components/dividends-panel.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { capitalForIncome, type DividendSummary, type TickerDividend } from "@/lib/dividends";

const MONO = "var(--font-jetbrains, monospace)";
const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const usd = (v: number, d = 0) => "$" + v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const ddmm = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
const monthLabel = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(2, 4)}`;

const TH: React.CSSProperties = { padding: "6px 10px", borderBottom: "1px solid var(--border)", fontWeight: 500, color: "var(--text-mute)", fontSize: 9.5, letterSpacing: 0.8, textAlign: "right", whiteSpace: "nowrap" };
const TD: React.CSSProperties = { padding: "6px 10px", textAlign: "right", whiteSpace: "nowrap" };
const LABEL: React.CSSProperties = { fontSize: 9.5, color: "var(--text-dim)", letterSpacing: 0.8 };
const INPUT: React.CSSProperties = { background: "#1a2030", border: "1px solid #2a3545", color: "var(--text)", fontSize: 11, padding: "3px 6px", fontFamily: MONO, outline: "none" };

export function DividendsPanel({ summary, stocksValue }: { summary: DividendSummary; stocksValue: number }) {
  const [goal, setGoal] = useState("12000");
  const goalNum = Number(goal);
  const needed = Number.isFinite(goalNum) && goalNum > 0 ? capitalForIncome(goalNum, summary.netYieldPct) : null;

  if (summary.tickers.length === 0) {
    return (
      <Section title="DIVIDENDOS">
        <div style={{ padding: 16, textAlign: "center", color: "var(--text-mute)", fontSize: 10, letterSpacing: 1 }}>
          SIN DATOS DE DIVIDENDOS · ACTUALIZÁ PRECIOS PARA CARGARLOS
        </div>
      </Section>
    );
  }

  return (
    <Section title={`DIVIDENDOS · ESTIMADOS · ${summary.tickers.length} ACCIONES`}>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
        <Kpi label="NETO PRÓX. 12 MESES" value={usd(summary.next12Net)} sub={`${summary.netYieldPct.toFixed(2)}% rendimiento neto`} accent />
        <Kpi label="BRUTO PRÓX. 12 MESES" value={usd(summary.next12Gross)} sub={`retención ${summary.next12Gross > 0 ? ((1 - summary.next12Net / summary.next12Gross) * 100).toFixed(0) : 0}%`} />
        <Kpi label="PROMEDIO MENSUAL NETO" value={usd(summary.next12Net / 12)} sub="próximos 12 meses" />
        <Kpi label="COBRADO ÚLT. 12 MESES" value={usd(summary.last12Net)} sub={`bruto ${usd(summary.last12Gross)} · estimado`} />
      </div>

      {/* Monthly bars */}
      <div style={{ padding: "12px 8px 4px", height: 200 }} data-money>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={summary.byMonth.map((m) => ({ ...m, label: monthLabel(m.month) }))} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#1f262e" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#4a5159", fontSize: 10, fontFamily: MONO }} stroke="#2a323b" />
            <YAxis tickFormatter={(v: number) => usd(v)} tick={{ fill: "#4a5159", fontSize: 10, fontFamily: MONO }} stroke="#2a323b" width={48} />
            <Tooltip
              contentStyle={{ backgroundColor: "#0a0e0d", border: "1px solid #2a323b", borderRadius: 0, fontFamily: MONO, fontSize: 11, color: "#d4d6d9" }}
              formatter={(v) => [usd(Number(v), 2), "Neto"]}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />
            <Bar dataKey="net" fill="#2bb673" isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Goal calculator */}
      <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", fontSize: 11.5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={LABEL}>META DE INGRESO ANUAL NETO</span>
          <input style={{ ...INPUT, width: 100, textAlign: "right" }} inputMode="decimal" value={goal} onChange={(e) => setGoal(e.target.value)} />
          <span style={{ color: "var(--text-dim)" }}>= {Number.isFinite(goalNum) && goalNum > 0 ? usd(goalNum / 12) : "—"}/mes</span>
        </div>
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
          <div>
            <div style={LABEL}>CAPITAL NECESARIO · A TU {summary.netYieldPct.toFixed(2)}% NETO</div>
            <div style={{ fontWeight: 600 }} data-money>{needed != null ? usd(needed) : "—"}</div>
          </div>
          <div>
            <div style={LABEL}>TENÉS EN ACCIONES</div>
            <div data-money>{usd(stocksValue)}</div>
          </div>
          <div>
            <div style={LABEL}>TE FALTA SUMAR</div>
            <div style={{ fontWeight: 600, color: "var(--accent)" }} data-money>
              {needed != null ? (needed - stocksValue > 0 ? usd(needed - stocksValue) : "ALCANZADO ✓") : "—"}
            </div>
          </div>
          <div>
            <div style={LABEL}>CON OTRO RENDIMIENTO NETO</div>
            <div style={{ color: "var(--text-dim)", fontSize: 11 }} data-money>
              {[3, 5, 7].map((y) => `${y}%: ${goalNum > 0 ? usd(capitalForIncome(goalNum, y)!) : "—"}`).join(" · ")}
            </div>
          </div>
        </div>
      </div>

      {/* Per ticker */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, fontVariantNumeric: "tabular-nums" }}>
          <thead>
            <tr>
              <th style={{ ...TH, textAlign: "left" }}>TICKER</th>
              <th style={TH}>CEDEARS</th>
              <th style={TH}>DIV/ACC/AÑO</th>
              <th style={TH}>REND. BRUTO</th>
              <th style={TH}>RETENCIÓN</th>
              <th style={TH}>NETO 12M</th>
              <th style={TH}>% DEL TOTAL</th>
              <th style={TH}>PRÓXIMO PAGO</th>
            </tr>
          </thead>
          <tbody>
            {summary.tickers.map((t) => (
              <TickerRow key={t.ticker} t={t} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Upcoming */}
      <div style={{ padding: "10px 14px 12px", borderTop: "1px solid var(--border)" }}>
        <div style={{ ...LABEL, marginBottom: 6 }}>PRÓXIMOS PAGOS</div>
        {summary.upcoming.slice(0, 10).map((p) => (
          <div key={`${p.ticker}-${p.exDate}`} style={{ display: "grid", gridTemplateColumns: "60px 60px 1fr auto", gap: 10, padding: "4px 0", borderBottom: "1px solid var(--border)", fontSize: 11 }}>
            <span style={{ color: "var(--text-dim)" }}>{ddmm(p.payDate)}</span>
            <span style={{ fontWeight: 600 }}>{p.ticker}</span>
            <span style={{ color: "var(--text-mute)", fontSize: 10 }}>
              {p.dateConfirmed ? "fecha confirmada" : "fecha estimada"}
              {p.amountEstimated ? " · monto estimado" : ""}
            </span>
            <span style={{ fontWeight: 600, color: "var(--up)" }} data-money>{usd(p.net, 2)}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function TickerRow({ t }: { t: TickerDividend }) {
  const router = useRouter();
  const [value, setValue] = useState(String(t.withholdingPct));
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (value === String(t.withholdingPct)) return;
    setError(null);
    const res = await fetch("/api/dividends/withholding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker: t.ticker, withholdingPct: value.trim() === "" ? null : value }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Error");
      setValue(String(t.withholdingPct));
      return;
    }
    router.refresh();
  }

  return (
    <tr style={{ borderBottom: "1px solid var(--border)" }}>
      <td style={{ ...TD, textAlign: "left", fontWeight: 600 }}>{t.ticker}</td>
      <td style={{ ...TD, color: "var(--text-dim)" }}>{t.cedears.toLocaleString("en-US")}</td>
      <td style={{ ...TD, color: "var(--text-dim)" }}>{usd(t.annualPerShare, 2)}</td>
      <td style={TD}>{t.grossYieldPct.toFixed(2)}%</td>
      <td style={TD} title={error ?? "Retención efectiva (impuestos + costos). Vacío = default"}>
        <input
          style={{ ...INPUT, width: 44, textAlign: "right", borderColor: error ? "var(--down)" : "#2a3545" }}
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        />
        %
      </td>
      <td style={{ ...TD, fontWeight: 600, color: "var(--up)" }}><span data-money>{usd(t.next12Net, 2)}</span></td>
      <td style={TD}>{t.sharePct.toFixed(1)}%</td>
      <td style={{ ...TD, color: "var(--text-dim)" }}>
        {t.next ? <>{ddmm(t.next.payDate)} · <span data-money>{usd(t.next.net, 2)}</span></> : "—"}
      </td>
    </tr>
  );
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div>
      <div style={LABEL}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 500, marginTop: 2, color: accent ? "var(--up)" : "var(--text)" }} data-money>{value}</div>
      <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 1 }}>{sub}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border)", fontFamily: MONO, color: "var(--text)" }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", color: "var(--accent)", fontSize: 10, letterSpacing: 1, fontWeight: 600 }}>
        {title}
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Página** — en `src/app/page.tsx`:
  - imports: `import { getDividendSummary } from "@/lib/dividend-data";` y `import { DividendsPanel } from "@/components/dividends-panel";`
  - después del `Promise.all`: `const dividends = await getDividendSummary(summary.positions, summary.totalValue);`
  - `PositionsTable` recibe `dividends={dividends.tickers}`
  - después de `</PositionsTable>`/el componente, agregar:

```tsx
        {/* Dividends (estimated) */}
        <DividendsPanel summary={dividends} stocksValue={summary.totalValue} />
```

- [ ] **Step 3: PositionsTable** — en `src/components/positions-table.tsx`:
  - `import type { TickerDividend } from "@/lib/dividends";`
  - Props: agregar `dividends?: TickerDividend[];` y desestructurar `dividends`.
  - En `<TickerDrawer`, agregar prop `dividend={selected ? dividends?.find((d) => d.ticker === selected.ticker) : undefined}`.

- [ ] **Step 4: Drawer** — en `src/components/ticker-drawer.tsx`:
  - `import type { TickerDividend } from "@/lib/dividends";`
  - Props: `dividend?: TickerDividend;` y desestructurar.
  - Reemplazar el bloque `...(position.dividendYield > 0 ? [["Dividendo", ...]] : [])` por:

```ts
    ...(dividend
      ? ([
          ["Div. neto/año", `$${dividend.next12Net.toFixed(2)} · ${dividend.grossYieldPct.toFixed(2)}% bruto`],
          ["Próx. dividendo", dividend.next ? `${dividend.next.payDate.slice(8, 10)}/${dividend.next.payDate.slice(5, 7)} · $${dividend.next.net.toFixed(2)}` : "—"],
        ] as [string, string][])
      : []),
```

- [ ] **Step 5: Verificar**: tsc OK; `curl -s localhost:3000/ | grep -o "DIVIDENDOS · ESTIMADOS\|META DE INGRESO ANUAL NETO\|PRÓXIMOS PAGOS"` → los 3. Mostrar neto 12m / rendimiento para sanity check (~USD 600–800 neto, PEP y UNH en la lista).

---

### Task 5: Aporte real vs escenario en Objetivos

**Files:**
- Modify: `src/lib/wealth-data.ts`, `src/components/home/scenario-cards.tsx`, `src/components/home/home-dashboard.tsx`

**Interfaces:** Consumes `sumContributions`, `ContributionRow` (goals.ts). Produces `WealthOverview.contributions12m: number`; `ScenarioCards` prop `contributions12m: number`.

- [ ] **Step 1** — `wealth-data.ts`:
  - imports: agregar `investmentTransfers, monthlyBudgets` al import de schema, `eq` de drizzle-orm, y `sumContributions` de goals.
  - `WealthOverview` agrega `contributions12m: number;`
  - nueva función:

```ts
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
```

  - `getWealthOverview` agrega `getContributions12m()` al `Promise.all` y devuelve `contributions12m`.

- [ ] **Step 2** — `scenario-cards.tsx`: prop `contributions12m: number`; al final de cada tarjeta:

```tsx
            <div style={LABEL}>APORTE / AÑO</div>
            <div>
              <span style={{ color: "var(--text-dim)" }}>escenario </span>
              <span data-money>{fmtUsd(s.contribution)}</span>
              <span style={{ color: "var(--text-dim)" }}> · real 12m </span>
              <span data-money style={{ color: contributions12m >= s.contribution ? "var(--up)" : "var(--down)", fontWeight: 600 }}>
                {fmtUsd(contributions12m)}
              </span>
            </div>
```

- [ ] **Step 3** — `home-dashboard.tsx`: `<ScenarioCards scenarios={scenarios} today={today} contributions12m={overview.contributions12m} />`.

- [ ] **Step 4: Verificar**: tsc OK; `npm test` OK; `/objetivos` muestra "APORTE / AÑO".

---

### Task 6: Verificación final

- [ ] `npm test && npx tsc --noEmit -p .` → verde.
- [ ] `npx next build` OK (con dev server frenado).
- [ ] CLAUDE.md: en "Key Files" agregar `src/lib/dividends.ts — Estimación de dividendos (pura, testeada)` y `src/lib/dividend-refresh.ts — Cache Yahoo de dividendos (1/día, desde refresh-prices)`; sección "Dividendos": retención efectiva EEUU 35% / Brasil 25% validada con cobros reales, editable en `species.withholding_pct`; pago BYMA = pago EEUU + 1 día.
- [ ] Levantar localhost y preguntar al usuario antes de commit/deploy.
