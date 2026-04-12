const BASE_URL = "https://data912.com";

export interface CedearLive {
  ticker: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  ratio: number; // parity
}

export interface MepLive {
  bid: number;
  ask: number;
  last: number;
}

export interface HistoricalOHLC {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function fetchCedears(): Promise<CedearLive[]> {
  const res = await fetch(`${BASE_URL}/live/arg_cedears`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`data912 cedears failed: ${res.status}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any[] = await res.json();
  return raw.map((r) => ({
    ticker: r.symbol,
    bid: r.px_bid ?? 0,
    ask: r.px_ask ?? 0,
    last: r.c ?? 0,
    volume: r.v ?? 0,
    ratio: 0, // parity not available from this endpoint; use species table
  }));
}

export async function fetchMep(): Promise<MepLive> {
  const res = await fetch(`${BASE_URL}/live/mep`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`data912 mep failed: ${res.status}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any[] = await res.json();
  // Use AL30 bond (most liquid, standard MEP reference)
  const al30 = raw.find((r) => r.ticker === "AL30");
  if (al30) {
    return { bid: al30.bid, ask: al30.ask, last: al30.mark };
  }
  // Fallback: most liquid bond entry
  const bonds = raw.filter((r) => r.panel === "bonds").sort((a, b) => b.v_usd - a.v_usd);
  if (bonds.length > 0) {
    return { bid: bonds[0].bid, ask: bonds[0].ask, last: bonds[0].mark };
  }
  return { bid: 0, ask: 0, last: 0 };
}

export async function fetchCedearHistory(ticker: string): Promise<HistoricalOHLC[]> {
  const res = await fetch(`${BASE_URL}/historical/cedears/${ticker}`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`data912 history failed for ${ticker}: ${res.status}`);
  return res.json();
}
