import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cashMovements } from "@/db/schema";

export async function GET() {
  const movements = await db.select().from(cashMovements).orderBy(cashMovements.date);
  const balanceUsd = movements
    .filter((m) => (m.currency ?? "USD") === "USD")
    .reduce((sum, m) => sum + m.amount, 0);
  const balanceArs = movements
    .filter((m) => m.currency === "ARS")
    .reduce((sum, m) => sum + m.amount, 0);
  return NextResponse.json({ balanceUsd, balanceArs, movements });
}

export async function POST(request: NextRequest) {
  try {
    const { type, amount, description, date, currency = "USD" } = await request.json();

    if (!type || !amount || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["WITHDRAWAL", "ADJUSTMENT"].includes(type)) {
      return NextResponse.json({ error: "Type must be WITHDRAWAL or ADJUSTMENT" }, { status: 400 });
    }

    const finalAmount = type === "WITHDRAWAL" ? -Math.abs(amount) : amount;

    await db.insert(cashMovements).values({
      type,
      amount: finalAmount,
      currency,
      description: description || null,
      date,
    });

    const all = await db.select().from(cashMovements);
    const balanceUsd = all
      .filter((m) => (m.currency ?? "USD") === "USD")
      .reduce((sum, m) => sum + m.amount, 0);
    const balanceArs = all
      .filter((m) => m.currency === "ARS")
      .reduce((sum, m) => sum + m.amount, 0);

    return NextResponse.json({ ok: true, balanceUsd, balanceArs });
  } catch (error) {
    console.error("Cash movement failed:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
