import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { priceAlerts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const alerts = await db
    .select()
    .from(priceAlerts)
    .orderBy(desc(priceAlerts.createdAt));
  return NextResponse.json(alerts);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { ticker, condition, targetPrice } = body;

  if (!ticker || !condition || !targetPrice) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (condition !== "above" && condition !== "below") {
    return NextResponse.json({ error: "condition must be above or below" }, { status: 400 });
  }
  if (targetPrice <= 0) {
    return NextResponse.json({ error: "targetPrice must be > 0" }, { status: 400 });
  }

  const [alert] = await db
    .insert(priceAlerts)
    .values({ ticker: ticker.toUpperCase(), condition, targetPrice })
    .returning();

  return NextResponse.json(alert, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.delete(priceAlerts).where(eq(priceAlerts.id, id));
  return NextResponse.json({ ok: true });
}
