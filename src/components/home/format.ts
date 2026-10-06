export function fmtUsd(v: number): string {
  return "$" + Math.round(v).toLocaleString("en-US");
}

export function fmtSignedUsd(v: number): string {
  return (v >= 0 ? "+" : "−") + fmtUsd(Math.abs(v));
}

export function fmtPct(v: number): string {
  return (v >= 0 ? "+" : "") + v.toFixed(1) + "%";
}

export function fmtK(v: number): string {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${Math.round(v / 1e3)}k`;
  return `$${Math.round(v)}`;
}

const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

// "2027-03-01" → "MAR 27"
export function fmtCut(date: string): string {
  return `${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(2, 4)}`;
}
