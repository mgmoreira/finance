import { NextResponse } from "next/server";
import { db } from "@/db";
import { priceCache } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const spyCache = await db.select().from(priceCache).where(eq(priceCache.ticker, "__SPY__")).get();
  const spyMtdPct =
    spyCache?.sp500MonthStart && spyCache.sp500MonthStart > 0 && spyCache.priceUsd != null
      ? ((spyCache.priceUsd - spyCache.sp500MonthStart) / spyCache.sp500MonthStart) * 100
      : null;
  return NextResponse.json({ spyMtdPct });
}
