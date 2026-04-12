import { NextRequest, NextResponse } from "next/server";
import { fetchCedearHistory } from "@/lib/data912";

// Map US ticker → BYMA ticker when they differ
const usToBymaTicker: Record<string, string> = {
  BG: "BNG",
  CRESY: "CRES",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker");
  const date = searchParams.get("date");

  if (!ticker || !date) {
    return NextResponse.json({ error: "Missing ticker or date" }, { status: 400 });
  }

  try {
    const bymaTicker = usToBymaTicker[ticker] ?? ticker;
    const history = await fetchCedearHistory(bymaTicker);

    // Find exact date or closest previous date
    const sorted = history.sort((a, b) => a.date.localeCompare(b.date));
    let match = sorted.find((h) => h.date === date);
    if (!match) {
      // Find closest date before the target
      const before = sorted.filter((h) => h.date <= date);
      match = before.length > 0 ? before[before.length - 1] : undefined;
    }

    if (match) {
      return NextResponse.json({ priceArs: match.close, date: match.date });
    }

    return NextResponse.json({ priceArs: null, date: null });
  } catch {
    return NextResponse.json({ priceArs: null, date: null });
  }
}
