import { db } from "@/db";
import {
  monthlyBudgets,
  expenses,
  investmentTransfers,
  expenseCategories,
  expenseTemplates,
} from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export interface ExpenseRow {
  id: number;
  budgetId: number;
  templateId: number | null;
  name: string;
  categoryId: number | null;
  categoryName: string | null;
  categoryColor: string | null;
  amount: number | null;
  date: string | null;
  notes: string | null;
}

export interface TransferRow {
  id: number;
  amountArs: number;
  amountUsd: number | null;
  exchangeRate: number | null;
  currency: string;
  date: string;
  notes: string | null;
}

export interface BudgetDetail {
  id: number;
  yearMonth: string;
  salary: number;
  mercadoPago: number | null;
  totalSalary: number;
  exchangeRateUsd: number | null;
  expenses: ExpenseRow[];
  transfers: TransferRow[];
  totalSpent: number;
  totalPending: number;
  totalInvested: number;
  totalInvestedUsd: number | null;
  remaining: number;
}

export interface CategoryInfo {
  id: number;
  name: string;
  color: string;
}

export interface TemplateInfo {
  id: number;
  name: string;
  categoryId: number | null;
  categoryName: string | null;
  categoryColor: string | null;
  isActive: number;
}

export interface MonthSummary {
  yearMonth: string;
  salary: number;
  exchangeRateUsd: number | null;
  totalSpent: number;
  totalInvested: number;
  savings: number;
  savingsPct: number;
}

export async function getCategories(): Promise<CategoryInfo[]> {
  const rows = await db.select().from(expenseCategories).orderBy(expenseCategories.name);
  return rows.map((r) => ({ id: r.id, name: r.name, color: r.color }));
}

export async function getTemplates(): Promise<TemplateInfo[]> {
  const rows = await db
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
    .orderBy(expenseTemplates.name);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    categoryId: r.categoryId,
    categoryName: r.categoryName,
    categoryColor: r.categoryColor,
    isActive: r.isActive,
  }));
}

export async function getBudgetDetail(yearMonth: string): Promise<BudgetDetail | null> {
  const [budget] = await db
    .select()
    .from(monthlyBudgets)
    .where(eq(monthlyBudgets.yearMonth, yearMonth));

  if (!budget) return null;

  const expenseRows = await db
    .select({
      id: expenses.id,
      budgetId: expenses.budgetId,
      templateId: expenses.templateId,
      name: expenses.name,
      categoryId: expenses.categoryId,
      categoryName: expenseCategories.name,
      categoryColor: expenseCategories.color,
      amount: expenses.amount,
      date: expenses.date,
      notes: expenses.notes,
    })
    .from(expenses)
    .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
    .where(eq(expenses.budgetId, budget.id))
    .orderBy(expenses.name);

  const transferRows = await db
    .select()
    .from(investmentTransfers)
    .where(eq(investmentTransfers.budgetId, budget.id))
    .orderBy(desc(investmentTransfers.date));

  const mercadoPago = budget.mercadoPago ?? null;
  const totalSalary = budget.salary + (mercadoPago ?? 0);
  const totalSpent = expenseRows.reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const totalPending = expenseRows.filter((e) => e.amount === null).length;
  const totalInvested = transferRows.reduce((sum, t) => sum + t.amountArs, 0);
  const remaining = totalSalary - totalSpent - totalInvested;

  const rate = budget.exchangeRateUsd;
  const totalInvestedUsd = rate
    ? transferRows.reduce((sum, t) => {
        if (t.amountUsd != null) return sum + t.amountUsd;
        return sum + t.amountArs / rate;
      }, 0)
    : null;

  return {
    id: budget.id,
    yearMonth: budget.yearMonth,
    salary: budget.salary,
    mercadoPago,
    totalSalary,
    exchangeRateUsd: budget.exchangeRateUsd ?? null,
    expenses: expenseRows,
    transfers: transferRows.map((t) => ({
      id: t.id,
      amountArs: t.amountArs,
      amountUsd: t.amountUsd,
      exchangeRate: t.exchangeRate,
      currency: t.currency,
      date: t.date,
      notes: t.notes,
    })),
    totalSpent,
    totalPending,
    totalInvested,
    totalInvestedUsd,
    remaining,
  };
}

export async function getAllMonthSummaries(): Promise<MonthSummary[]> {
  const budgets = await db.select().from(monthlyBudgets).orderBy(desc(monthlyBudgets.yearMonth));
  if (budgets.length === 0) return [];

  const budgetIds = budgets.map((b) => b.id);
  const idList = sql.join(budgetIds.map((id) => sql`${id}`), sql`, `);

  // Fetch all expenses and transfers in 2 queries instead of 2N
  const [allExpenses, allTransfers] = await Promise.all([
    db
      .select({ budgetId: expenses.budgetId, amount: expenses.amount })
      .from(expenses)
      .where(sql`${expenses.budgetId} IN (${idList})`),
    db
      .select({ budgetId: investmentTransfers.budgetId, amountArs: investmentTransfers.amountArs })
      .from(investmentTransfers)
      .where(sql`${investmentTransfers.budgetId} IN (${idList})`),
  ]);

  const spentByBudget = new Map<number, number>();
  for (const e of allExpenses) {
    spentByBudget.set(e.budgetId, (spentByBudget.get(e.budgetId) ?? 0) + (e.amount ?? 0));
  }
  const investedByBudget = new Map<number, number>();
  for (const t of allTransfers) {
    investedByBudget.set(t.budgetId, (investedByBudget.get(t.budgetId) ?? 0) + t.amountArs);
  }

  return budgets.map((budget) => {
    const totalSalary = budget.salary + (budget.mercadoPago ?? 0);
    const totalSpent = spentByBudget.get(budget.id) ?? 0;
    const totalInvested = investedByBudget.get(budget.id) ?? 0;
    const savings = totalSalary - totalSpent - totalInvested;
    return {
      yearMonth: budget.yearMonth,
      salary: totalSalary,
      exchangeRateUsd: budget.exchangeRateUsd ?? null,
      totalSpent,
      totalInvested,
      savings,
      savingsPct: totalSalary > 0 ? (savings / totalSalary) * 100 : 0,
    };
  });
}

export async function getComparisonData(monthCount: number = 6) {
  const budgets = await db
    .select()
    .from(monthlyBudgets)
    .orderBy(desc(monthlyBudgets.yearMonth))
    .limit(monthCount);

  if (budgets.length === 0) return { byCategory: [], byExpense: [], monthlyTotals: [], months: [] };

  // Reverse to chronological order
  budgets.reverse();
  const months = budgets.map((b) => b.yearMonth);

  // Get all expenses for these budgets
  const budgetIds = budgets.map((b) => b.id);
  const allExpenses = await db
    .select({
      name: expenses.name,
      amount: expenses.amount,
      categoryId: expenses.categoryId,
      categoryName: expenseCategories.name,
      categoryColor: expenseCategories.color,
      budgetId: expenses.budgetId,
    })
    .from(expenses)
    .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
    .where(sql`${expenses.budgetId} IN (${sql.join(budgetIds.map(id => sql`${id}`), sql`, `)})`);

  // Get all transfers for these budgets
  const allTransfers = await db
    .select()
    .from(investmentTransfers)
    .where(sql`${investmentTransfers.budgetId} IN (${sql.join(budgetIds.map(id => sql`${id}`), sql`, `)})`);

  const budgetMonthMap = new Map(budgets.map((b) => [b.id, b.yearMonth]));

  // By category
  const categoryMap = new Map<string, { color: string; amounts: Record<string, number> }>();
  for (const exp of allExpenses) {
    if (exp.amount === null) continue;
    const catName = exp.categoryName ?? "Sin categoría";
    const catColor = exp.categoryColor ?? "#6b7280";
    const month = budgetMonthMap.get(exp.budgetId)!;

    if (!categoryMap.has(catName)) {
      categoryMap.set(catName, { color: catColor, amounts: {} });
    }
    const entry = categoryMap.get(catName)!;
    entry.amounts[month] = (entry.amounts[month] ?? 0) + exp.amount;
  }
  const byCategory = [...categoryMap.entries()].map(([category, data]) => ({
    category,
    color: data.color,
    amounts: data.amounts,
  }));

  // By expense name
  const expenseMap = new Map<string, { category: string; amounts: Record<string, number> }>();
  for (const exp of allExpenses) {
    if (exp.amount === null) continue;
    const month = budgetMonthMap.get(exp.budgetId)!;
    const catName = exp.categoryName ?? "Sin categoría";

    if (!expenseMap.has(exp.name)) {
      expenseMap.set(exp.name, { category: catName, amounts: {} });
    }
    const entry = expenseMap.get(exp.name)!;
    entry.amounts[month] = (entry.amounts[month] ?? 0) + exp.amount;
  }
  const byExpense = [...expenseMap.entries()].map(([name, data]) => ({
    name,
    category: data.category,
    amounts: data.amounts,
  }));

  // Monthly totals
  const monthlyTotals = budgets.map((budget) => {
    const budgetExpenses = allExpenses.filter((e) => e.budgetId === budget.id);
    const budgetTransfers = allTransfers.filter((t) => t.budgetId === budget.id);
    const totalSpent = budgetExpenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
    const totalInvested = budgetTransfers.reduce((sum, t) => sum + t.amountArs, 0);
    const totalSalary = budget.salary + (budget.mercadoPago ?? 0);
    const savings = totalSalary - totalSpent - totalInvested;
    const rate = budget.exchangeRateUsd;
    const totalInvestedUsd = rate
      ? budgetTransfers.reduce((sum, t) => {
          if (t.amountUsd != null) return sum + t.amountUsd;
          return sum + t.amountArs / rate;
        }, 0)
      : null;
    return {
      yearMonth: budget.yearMonth,
      salary: totalSalary,
      exchangeRateUsd: budget.exchangeRateUsd ?? null,
      totalSpent,
      totalInvested,
      totalInvestedUsd,
      savings,
      savingsPct: totalSalary > 0 ? (savings / totalSalary) * 100 : 0,
    };
  });

  return { byCategory, byExpense, monthlyTotals, months };
}
