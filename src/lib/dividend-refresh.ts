import { db } from "@/db";
import { dividendCache, transactions } from "@/db/schema";
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
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
  let refreshed = 0;

  async function refreshOne(ticker: string) {
    const old = existing.get(ticker);
    try {
      const [chart, summary] = await Promise.all([
        yf.chart(ticker, { period1, events: "div" }),
        yf.quoteSummary(ticker, { modules: ["calendarEvents"] }).catch(() => null),
      ]);
      let events: DivEvent[] = (chart.events?.dividends ?? [])
        .map((d) => ({ exDate: toDate(d.date), amount: d.amount }))
        .sort((a, b) => a.exDate.localeCompare(b.exDate));
      // An empty answer for a ticker that used to have dividends is most likely a Yahoo glitch
      if (events.length === 0 && old && old.events !== "[]") events = JSON.parse(old.events);

      const ce = summary?.calendarEvents;
      const ex = ce?.exDividendDate ? toDate(ce.exDividendDate) : null;
      const pay = ce?.dividendDate ? toDate(ce.dividendDate) : null;
      // Only trust the pay date when it belongs to that ex-date (Yahoo can leave the previous one)
      const validPay = ex && pay && pay >= ex && daysBetween(ex, pay) <= 200 ? pay : null;
      const lag = ex && validPay ? daysBetween(ex, validPay) : (old?.payLagDays ?? DEFAULT_PAY_LAG_DAYS);
      const upcoming = ex != null && ex > today;

      const values = {
        events: JSON.stringify(events),
        nextExDate: upcoming ? ex : null,
        nextPayDate: upcoming ? validPay : null,
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
      // Back off for a day instead of retrying on every price refresh; keep the old data
      const updatedAt = new Date().toISOString();
      await db
        .insert(dividendCache)
        .values({ ticker, updatedAt })
        .onConflictDoUpdate({ target: dividendCache.ticker, set: { updatedAt } })
        .catch(() => {});
    }
  }

  for (let i = 0; i < stale.length; i += 5) {
    await Promise.all(stale.slice(i, i + 5).map(refreshOne));
  }
  return { refreshed };
}

// Tickers currently held (sold-out positions don't need dividend data)
export async function heldTickers(): Promise<string[]> {
  const rows = await db
    .select({ ticker: transactions.ticker, type: transactions.type, quantity: transactions.quantity })
    .from(transactions);
  const q = new Map<string, number>();
  for (const r of rows) q.set(r.ticker, (q.get(r.ticker) ?? 0) + (r.type === "BUY" ? r.quantity : -r.quantity));
  return [...q].filter(([, n]) => n > 0).map(([t]) => t);
}
