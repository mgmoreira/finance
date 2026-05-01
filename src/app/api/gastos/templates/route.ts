import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { expenseTemplates, expenseCategories, monthlyBudgets, expenses } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    const templates = await db
      .select({
        id: expenseTemplates.id,
        name: expenseTemplates.name,
        categoryId: expenseTemplates.categoryId,
        isActive: expenseTemplates.isActive,
        categoryName: expenseCategories.name,
        categoryColor: expenseCategories.color,
      })
      .from(expenseTemplates)
      .leftJoin(expenseCategories, eq(expenseTemplates.categoryId, expenseCategories.id))
      .where(eq(expenseTemplates.isActive, 1));

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, categoryId, applyToMonths } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Missing required field: name" }, { status: 400 });
    }

    const [created] = await db
      .insert(expenseTemplates)
      .values({ name, categoryId: categoryId || null })
      .returning();

    // Apply to selected existing months
    if (Array.isArray(applyToMonths) && applyToMonths.length > 0) {
      for (const yearMonth of applyToMonths) {
        const [budget] = await db
          .select()
          .from(monthlyBudgets)
          .where(eq(monthlyBudgets.yearMonth, yearMonth));
        if (budget) {
          await db.insert(expenses).values({
            budgetId: budget.id,
            templateId: created.id,
            name: created.name,
            categoryId: created.categoryId,
            amount: null,
            date: null,
            notes: null,
          });
        }
      }
    }

    return NextResponse.json(created);
  } catch (error) {
    console.error("Failed to create template:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, name, categoryId, isActive } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Missing required field: id" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (categoryId !== undefined) updates.categoryId = categoryId;
    if (isActive !== undefined) updates.isActive = isActive;

    const [updated] = await db
      .update(expenseTemplates)
      .set(updates)
      .where(eq(expenseTemplates.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update template:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // Detach existing expenses from this template (keep them, just unlink)
    await db.update(expenses).set({ templateId: null }).where(eq(expenses.templateId, id));
    await db.delete(expenseTemplates).where(eq(expenseTemplates.id, id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete template:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
