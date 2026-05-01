import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { investmentTransfers, monthlyBudgets, cashMovements } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { fetchMep } from "@/lib/data912";

export async function PUT(request: NextRequest) {
  try {
    const { id, amountArs, amountUsd, currency, date, notes } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (amountArs != null) updates.amountArs = amountArs;
    if (currency != null) updates.currency = currency;
    if (date != null) updates.date = date;
    if (notes !== undefined) updates.notes = notes || null;

    if (currency === "USD" && amountUsd != null) {
      updates.amountUsd = amountUsd;
      updates.exchangeRate = amountArs != null ? amountArs / amountUsd : null;
    } else if (currency === "USD" && amountArs != null) {
      const mep = await fetchMep();
      if (mep.last) {
        updates.exchangeRate = mep.last;
        updates.amountUsd = amountArs / mep.last;
      }
    } else if (currency === "ARS") {
      updates.amountUsd = null;
      updates.exchangeRate = null;
    }

    const [updated] = await db
      .update(investmentTransfers)
      .set(updates)
      .where(eq(investmentTransfers.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update transfer:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // Fetch transfer + budget before deleting to reverse the cash movement
    const transfer = await db
      .select({ date: investmentTransfers.date, currency: investmentTransfers.currency, budgetId: investmentTransfers.budgetId })
      .from(investmentTransfers)
      .where(eq(investmentTransfers.id, id))
      .get();

    if (transfer) {
      const budget = await db
        .select({ yearMonth: monthlyBudgets.yearMonth })
        .from(monthlyBudgets)
        .where(eq(monthlyBudgets.id, transfer.budgetId))
        .get();

      if (budget) {
        await db.delete(cashMovements).where(
          and(
            eq(cashMovements.description, `Ahorro mes ${budget.yearMonth}`),
            eq(cashMovements.date, transfer.date),
            eq(cashMovements.currency, transfer.currency),
          )
        );
      }
    }

    await db.delete(investmentTransfers).where(eq(investmentTransfers.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete transfer:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { budgetId, amountArs, amountUsd, currency, date, notes, virtual } = await request.json();

    if (!budgetId || amountArs == null || !currency || !date) {
      return NextResponse.json(
        { error: "Missing required fields: budgetId, amountArs, currency, date" },
        { status: 400 }
      );
    }

    // Get the budget to find yearMonth
    const [budget] = await db
      .select()
      .from(monthlyBudgets)
      .where(eq(monthlyBudgets.id, budgetId));

    if (!budget) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    let finalAmountUsd: number | null = null;
    let exchangeRate: number | null = null;

    if (currency === "USD") {
      if (amountUsd != null) {
        // User provided USD amount, calculate exchange rate
        finalAmountUsd = amountUsd;
        exchangeRate = amountArs / amountUsd;
      } else {
        // Fetch MEP rate and calculate USD amount
        const mep = await fetchMep();
        if (!mep.last) {
          return NextResponse.json({ error: "Could not fetch MEP rate" }, { status: 500 });
        }
        exchangeRate = mep.last;
        finalAmountUsd = amountArs / mep.last;
      }
    }
    // If currency="ARS", amountUsd and exchangeRate stay null

    // Insert investment transfer
    const [transfer] = await db
      .insert(investmentTransfers)
      .values({
        budgetId,
        amountArs,
        amountUsd: finalAmountUsd,
        exchangeRate,
        currency,
        date,
        notes: notes || null,
      })
      .returning();

    // Insert corresponding cash movement (skip if virtual — already sent in the past)
    if (!virtual) {
      const cashAmount = currency === "USD" ? finalAmountUsd! : amountArs;
      await db.insert(cashMovements).values({
        type: "ADJUSTMENT",
        amount: cashAmount,
        currency,
        description: `Ahorro mes ${budget.yearMonth}`,
        date,
      });
    }

    return NextResponse.json(transfer);
  } catch (error) {
    console.error("Failed to create transfer:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
