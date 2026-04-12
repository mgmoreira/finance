export interface YahooQuote {
  symbol: string;
  regularMarketPrice: number;
  fiftyTwoWeekHigh: number;
  trailingAnnualDividendYield: number | null;
}

// Uses yahoo-finance2 npm package (more reliable than raw API)
// Install: npm install yahoo-finance2

export async function fetchQuotes(tickers: string[]): Promise<Map<string, YahooQuote>> {
  const yahooFinance = (await import("yahoo-finance2")).default;
  const quotes = new Map<string, YahooQuote>();

  // Fetch in batches to avoid rate limits
  const results = await yahooFinance.quote(tickers);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resultArray: any[] = Array.isArray(results) ? results : [results];

  for (const q of resultArray) {
    if (!q.symbol) continue;
    quotes.set(q.symbol, {
      symbol: q.symbol,
      regularMarketPrice: q.regularMarketPrice ?? 0,
      fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? 0,
      trailingAnnualDividendYield: q.trailingAnnualDividendYield ?? null,
    });
  }

  return quotes;
}

export async function fetchSP500Price(): Promise<number> {
  const quotes = await fetchQuotes(["SPY"]);
  return quotes.get("SPY")?.regularMarketPrice ?? 0;
}
