import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  monthlyBudgets,
  expenses,
  investmentTransfers,
  expenseCategories,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const monthsParam = request.nextUrl.searchParams.get("months");
    const monthCount = monthsParam ? parseInt(monthsParam, 10) : 6;

    // Get the last N months of budgets
    const budgets = await db
      .select()
      .from(monthlyBudgets)
      .orderBy(desc(monthlyBudgets.yearMonth))
      .limit(monthCount);

    // Reverse so they're in chronological order
    budgets.reverse();

    // Fetch all categories for color lookup
    const categories = await db.select().from(expenseCategories);
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    // For each budget, get expenses and transfers
    const monthData = await Promise.all(
      budgets.map(async (budget) => {
        const expenseRows = await db
          .select()
          .from(expenses)
          .where(eq(expenses.budgetId, budget.id));

        const transfers = await db
          .select()
          .from(investmentTransfers)
          .where(eq(investmentTransfers.budgetId, budget.id));

        const totalSpent = expenseRows
          .filter((e) => e.amount != null)
          .reduce((sum, e) => sum + (e.amount ?? 0), 0);

        const totalInvested = transfers.reduce((sum, t) => sum + t.amountArs, 0);

        const savings = budget.salary - totalSpent - totalInvested;
        const savingsPct = budget.salary > 0 ? (savings / budget.salary) * 100 : 0;

        return {
          yearMonth: budget.yearMonth,
          salary: budget.salary,
          totalSpent,
          totalInvested,
          savings,
          savingsPct,
          expenses: expenseRows,
        };
      })
    );

    // Build byCategory: { category, color, amounts: { "2026-01": number, ... } }
    const byCategoryMap = new Map<
      string,
      { category: string; color: string; amounts: Record<string, number> }
    >();

    for (const md of monthData) {
      for (const exp of md.expenses) {
        if (exp.amount == null) continue;
        const cat = exp.categoryId ? categoryMap.get(exp.categoryId) : null;
        const catName = cat?.name ?? "Sin categoría";
        const catColor = cat?.color ?? "#888888";

        if (!byCategoryMap.has(catName)) {
          byCategoryMap.set(catName, { category: catName, color: catColor, amounts: {} });
        }
        const entry = byCategoryMap.get(catName)!;
        entry.amounts[md.yearMonth] = (entry.amounts[md.yearMonth] ?? 0) + exp.amount;
      }
    }

    // Build byExpense: { name, category, amounts: { "2026-01": number, ... } }
    const byExpenseMap = new Map<
      string,
      { name: string; category: string; amounts: Record<string, number> }
    >();

    for (const md of monthData) {
      for (const exp of md.expenses) {
        if (exp.amount == null) continue;
        const cat = exp.categoryId ? categoryMap.get(exp.categoryId) : null;
        const catName = cat?.name ?? "Sin categoría";
        const key = exp.name;

        if (!byExpenseMap.has(key)) {
          byExpenseMap.set(key, { name: exp.name, category: catName, amounts: {} });
        }
        const entry = byExpenseMap.get(key)!;
        entry.amounts[md.yearMonth] = (entry.amounts[md.yearMonth] ?? 0) + exp.amount;
      }
    }

    // Monthly totals
    const monthlyTotals = monthData.map((md) => ({
      yearMonth: md.yearMonth,
      salary: md.salary,
      totalSpent: md.totalSpent,
      totalInvested: md.totalInvested,
      savings: md.savings,
      savingsPct: md.savingsPct,
    }));

    return NextResponse.json({
      byCategory: [...byCategoryMap.values()],
      byExpense: [...byExpenseMap.values()],
      monthlyTotals,
    });
  } catch (error) {
    console.error("Failed to fetch summary:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
