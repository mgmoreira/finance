import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { wealthSnapshots } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isCutDate } from "@/lib/wealth-input";
import { getCurrentWealth, todayAR } from "@/lib/wealth-data";
import { GET as refreshCedears } from "@/app/api/refresh-prices/route";
import { GET as refreshCrypto } from "@/app/api/crypto/refresh/route";

const round2 = (n: number) => Math.round(n * 100) / 100;

// GET — cron on 1/3 and 1/9: stores today's wealth as an automatic cut (never overwrites)
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const date = todayAR();
  if (!isCutDate(date)) {
    return NextResponse.json({ ok: true, skipped: true, reason: "not a cut date", date });
  }

  const existing = await db.select().from(wealthSnapshots).where(eq(wealthSnapshots.date, date)).get();
  if (existing) {
    return NextResponse.json({ ok: true, skipped: true, reason: "already exists", date });
  }

  // Refresh prices first so the cut doesn't use stale cache; on failure fall back to cached prices
  try { await refreshCedears(); } catch (e) { console.error("wealth snapshot: CEDEAR refresh failed", e); }
  try { await refreshCrypto(); } catch (e) { console.error("wealth snapshot: crypto refresh failed", e); }

  const w = await getCurrentWealth();
  const values = {
    date,
    stocksUsd: round2(w.stocksUsd),
    bondsUsd: round2(w.bondsUsd),
    cryptoUsd: round2(w.cryptoUsd),
    cashUsd: round2(w.cashUsd),
    source: "auto" as const,
    updatedAt: new Date().toISOString(),
  };
  await db.insert(wealthSnapshots).values(values);

  return NextResponse.json({ ok: true, ...values });
}
