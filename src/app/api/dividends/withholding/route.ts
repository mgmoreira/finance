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
