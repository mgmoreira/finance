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
  return res.json();
}

export async function fetchMep(): Promise<MepLive> {
  const res = await fetch(`${BASE_URL}/live/mep`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`data912 mep failed: ${res.status}`);
  return res.json();
}

export async function fetchCedearHistory(ticker: string): Promise<HistoricalOHLC[]> {
  const res = await fetch(`${BASE_URL}/historical/cedears/${ticker}`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`data912 history failed for ${ticker}: ${res.status}`);
  return res.json();
}
