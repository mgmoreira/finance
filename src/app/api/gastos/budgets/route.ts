import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  monthlyBudgets,
  expenses,
  investmentTransfers,
  expenseTemplates,
  expenseCategories,
} from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const month = request.nextUrl.searchParams.get("month");

    if (month) {
      // Single month with full details
      const [budget] = await db
        .select()
        .from(monthlyBudgets)
        .where(eq(monthlyBudgets.yearMonth, month));

      if (!budget) {
        return NextResponse.json({ error: "Budget not found" }, { status: 404 });
      }

      const expenseRows = await db
        .select({
          id: expenses.id,
          budgetId: expenses.budgetId,
          templateId: expenses.templateId,
          name: expenses.name,
          categoryId: expenses.categoryId,
          amount: expenses.amount,
          date: expenses.date,
          notes: expenses.notes,
          createdAt: expenses.createdAt,
          categoryName: expenseCategories.name,
          categoryColor: expenseCategories.color,
        })
        .from(expenses)
        .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
        .where(eq(expenses.budgetId, budget.id));

      const transfers = await db
        .select()
        .from(investmentTransfers)
        .where(eq(investmentTransfers.budgetId, budget.id));

      const totalSpent = expenseRows
        .filter((e) => e.amount != null)
        .reduce((sum, e) => sum + (e.amount ?? 0), 0);

      const totalPending = expenseRows.filter((e) => e.amount == null).length;

      const totalInvested = transfers.reduce((sum, t) => sum + t.amountArs, 0);
      const totalSalary = budget.salary + (budget.mercadoPago ?? 0);
      const remaining = totalSalary - totalSpent - totalInvested;

      const rate = budget.exchangeRateUsd;
      const totalInvestedUsd = rate
        ? transfers.reduce((sum, t) => {
            if (t.amountUsd != null) return sum + t.amountUsd;
            return sum + t.amountArs / rate;
          }, 0)
        : null;

      return NextResponse.json({
        ...budget,
        expenses: expenseRows,
        transfers,
        totalSpent,
        totalPending,
        totalInvested,
        totalInvestedUsd,
        remaining,
      });
    }

    // List all months with summary totals
    const budgets = await db
      .select()
      .from(monthlyBudgets)
      .orderBy(desc(monthlyBudgets.yearMonth));

    const summaries = await Promise.all(
      budgets.map(async (budget) => {
        const expenseRows = await db
          .select({ amount: expenses.amount })
          .from(expenses)
          .where(eq(expenses.budgetId, budget.id));

        const transfers = await db
          .select({ amountArs: investmentTransfers.amountArs })
          .from(investmentTransfers)
          .where(eq(investmentTransfers.budgetId, budget.id));

        const totalSpent = expenseRows
          .filter((e) => e.amount != null)
          .reduce((sum, e) => sum + (e.amount ?? 0), 0);

        const totalPending = expenseRows.filter((e) => e.amount == null).length;

        const totalInvested = transfers.reduce((sum, t) => sum + t.amountArs, 0);

        const remaining = budget.salary - totalSpent - totalInvested;

        return {
          ...budget,
          totalSpent,
          totalPending,
          totalInvested,
          remaining,
        };
      })
    );

    return NextResponse.json(summaries);
  } catch (error) {
    console.error("Failed to fetch budgets:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { yearMonth, salary, mercadoPago, exchangeRateUsd } = await request.json();

    if (!yearMonth || salary == null) {
      return NextResponse.json(
        { error: "Missing required fields: yearMonth, salary" },
        { status: 400 }
      );
    }

    // Create the budget
    const [budget] = await db
      .insert(monthlyBudgets)
      .values({ yearMonth, salary, mercadoPago: mercadoPago || null, exchangeRateUsd: exchangeRateUsd || null })
      .returning();

    // Fetch active templates and auto-generate expenses
    const templates = await db
      .select()
      .from(expenseTemplates)
      .where(eq(expenseTemplates.isActive, 1));

    if (templates.length > 0) {
      await db.insert(expenses).values(
        templates.map((t) => ({
          budgetId: budget.id,
          templateId: t.id,
          name: t.name,
          categoryId: t.categoryId,
          amount: null,
          date: null,
          notes: null,
        }))
      );
    }

    // Auto-add "Beneficio" expense with mercadoPago amount under Supermercado category
    if (mercadoPago) {
      const [superCat] = await db
        .select({ id: expenseCategories.id })
        .from(expenseCategories)
        .where(eq(expenseCategories.name, "Supermercado"));

      await db.insert(expenses).values({
        budgetId: budget.id,
        templateId: null,
        name: "Beneficio",
        categoryId: superCat?.id ?? null,
        amount: mercadoPago,
        date: null,
        notes: null,
      });
    }

    // Return the created budget with its expenses
    const createdExpenses = await db
      .select()
      .from(expenses)
      .where(eq(expenses.budgetId, budget.id));

    return NextResponse.json({ ...budget, expenses: createdExpenses });
  } catch (error) {
    console.error("Failed to create budget:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, salary, mercadoPago, exchangeRateUsd } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (salary != null) updates.salary = salary;
    if (mercadoPago !== undefined) updates.mercadoPago = mercadoPago || null;
    if (exchangeRateUsd !== undefined) updates.exchangeRateUsd = exchangeRateUsd || null;

    const [updated] = await db
      .update(monthlyBudgets)
      .set(updates)
      .where(eq(monthlyBudgets.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update budget:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
