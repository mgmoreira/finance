import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { budgetId, name, categoryId, amount, date, notes } = await request.json();

    if (!budgetId || !name) {
      return NextResponse.json(
        { error: "Missing required fields: budgetId, name" },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(expenses)
      .values({
        budgetId,
        name,
        categoryId: categoryId || null,
        amount: amount ?? null,
        date: date || null,
        notes: notes || null,
      })
      .returning();

    return NextResponse.json(created);
  } catch (error) {
    console.error("Failed to create expense:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, amount, date, notes, name, categoryId } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Missing required field: id" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (amount !== undefined) updates.amount = amount;
    if (date !== undefined) updates.date = date;
    if (notes !== undefined) updates.notes = notes;
    if (name !== undefined) updates.name = name;
    if (categoryId !== undefined) updates.categoryId = categoryId;

    const [updated] = await db
      .update(expenses)
      .set(updates)
      .where(eq(expenses.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update expense:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing required query param: id" }, { status: 400 });
    }

    await db.delete(expenses).where(eq(expenses.id, Number(id)));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete expense:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
