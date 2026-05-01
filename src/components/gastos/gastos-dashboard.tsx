"use client";

import { useState, useCallback } from "react";
import type { BudgetDetail, CategoryInfo, TemplateInfo, MonthSummary } from "@/lib/gastos-data";
import { MonthHeader } from "./month-header";
import { ExpenseList } from "./expense-list";
import { TransferModal } from "./transfer-modal";
import { NewMonthModal } from "./new-month-modal";
import { TemplateManager } from "./template-manager";
import { ComparisonCharts } from "./comparison-charts";
import { MonthBreakdownChart } from "./month-breakdown-chart";
import { formatArs } from "@/lib/format";
import type { TransferRow } from "@/lib/gastos-data";

interface ComparisonData {
  byCategory: { category: string; color: string; amounts: Record<string, number> }[];
  byExpense: { name: string; category: string; amounts: Record<string, number> }[];
  monthlyTotals: { yearMonth: string; salary: number; totalSpent: number; totalInvested: number; savings: number; savingsPct: number }[];
  months: string[];
}

interface GastosDashboardProps {
  initialBudget: BudgetDetail | null;
  initialYearMonth: string;
  categories: CategoryInfo[];
  templates: TemplateInfo[];
  allMonths: MonthSummary[];
  comparison: ComparisonData;
}

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function monthLabel(ym: string) {
  const [year, month] = ym.split("-");
  return `${MONTH_NAMES[parseInt(month) - 1]} ${year}`;
}

function nextMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

function prevMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

export function GastosDashboard({
  initialBudget,
  initialYearMonth,
  categories,
  templates,
  allMonths,
  comparison,
}: GastosDashboardProps) {
  const [yearMonth, setYearMonth] = useState(initialYearMonth);
  const [budget, setBudget] = useState<BudgetDetail | null>(initialBudget);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showNewMonth, setShowNewMonth] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<TransferRow | null>(null);

  const isFirstTime = allMonths.length === 0 && !budget;
  const hasTemplates = templates.filter((t) => t.isActive).length > 0;

  const fetchBudget = useCallback(async (ym: string) => {
    const res = await fetch(`/api/gastos/budgets?month=${ym}`);
    if (!res.ok) return null;
    const data = await res.json();
    const mp = data.mercadoPago ?? data.mercado_pago ?? null;
    const sal = data.salary ?? 0;
    return {
      id: data.id,
      yearMonth: data.yearMonth ?? data.year_month,
      salary: sal,
      mercadoPago: mp,
      totalSalary: sal + (mp ?? 0),
      exchangeRateUsd: data.exchangeRateUsd ?? data.exchange_rate_usd ?? null,
      expenses: data.expenses ?? [],
      transfers: data.transfers ?? [],
      totalSpent: data.totalSpent ?? 0,
      totalPending: data.totalPending ?? 0,
      totalInvested: data.totalInvested ?? 0,
      totalInvestedUsd: data.totalInvestedUsd ?? null,
      remaining: data.remaining ?? 0,
    } as BudgetDetail;
  }, []);

  async function navigateMonth(ym: string) {
    setLoading(true);
    setYearMonth(ym);
    try {
      const result = await fetchBudget(ym);
      setBudget(result);
    } catch {
      setBudget(null);
    } finally {
      setLoading(false);
    }
  }

  const refreshBudget = useCallback(async () => {
    const result = await fetchBudget(yearMonth);
    if (result) setBudget(result);
  }, [yearMonth, fetchBudget]);

  return (
    <div className="space-y-6">
      {/* First-time onboarding */}
      {isFirstTime && (
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-2">Bienvenido a Gastos</h2>
          <div className="text-sm text-gray-300 space-y-2">
            <p>Para arrancar, seguí estos pasos:</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-400">
              <li className={hasTemplates ? "text-green-400 line-through" : "text-white font-medium"}>
                Creá tus gastos fijos (templates) — ej: Telecentro, Edenor, Netflix
              </li>
              <li className="text-white font-medium">
                Creá el mes actual con tu sueldo neto
              </li>
              <li className="text-gray-400">
                Completá los montos a medida que te lleguen
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* Template manager — always visible on first time, otherwise toggle */}
      {(isFirstTime || showTemplates) && (
        <TemplateManager templates={templates} categories={categories} allMonths={allMonths} />
      )}

      {/* Month content */}
      {budget ? (
        <>
          <MonthHeader
            budgetId={budget.id}
            yearMonth={yearMonth}
            salary={budget.salary}
            mercadoPago={budget.mercadoPago}
            totalSalary={budget.totalSalary}
            exchangeRateUsd={budget.exchangeRateUsd}
            totalSpent={budget.totalSpent}
            totalPending={budget.totalPending}
            totalInvested={budget.totalInvested}
            totalInvestedUsd={budget.totalInvestedUsd}
            remaining={budget.remaining}
            onPrev={() => navigateMonth(prevMonth(yearMonth))}
            onNext={() => navigateMonth(nextMonth(yearMonth))}
            onUpdated={refreshBudget}
          />

          {/* Current month breakdown chart */}
          {budget.expenses.some((e) => e.amount !== null) && (
            <MonthBreakdownChart
              salary={budget.salary}
              expenses={budget.expenses}
              totalInvested={budget.totalInvested}
            />
          )}

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowTransfer(true)}
              className="bg-green-600 hover:bg-green-500 text-sm px-4 py-2 rounded font-medium"
            >
              Enviar a Inversión
            </button>
            {!isFirstTime && (
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="bg-gray-700 hover:bg-gray-600 text-sm px-4 py-2 rounded font-medium"
              >
                {showTemplates ? "Ocultar Templates" : "Gestionar Templates"}
              </button>
            )}
          </div>

          {/* Expense list */}
          <ExpenseList
            expenses={budget.expenses}
            categories={categories}
            budgetId={budget.id}
            onMutate={refreshBudget}
          />

          {/* Transfers made this month */}
          {budget.transfers.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">TRANSFERENCIAS A INVERSIÓN</h3>
              <div className="space-y-2">
                {budget.transfers.map((t: TransferRow) => (
                  <div key={t.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-gray-800/50 group">
                    <div className="flex items-center gap-3">
                      <span className="text-green-400 font-medium" data-money>{formatArs(t.amountArs)}</span>
                      <span className="text-gray-400">→</span>
                      <span className={t.currency === "USD" ? "text-yellow-400" : "text-blue-400"}>
                        {t.currency === "USD"
                          ? `US$ ${t.amountUsd?.toFixed(2) ?? "?"}`
                          : formatArs(t.amountArs)}
                      </span>
                      {t.notes && <span className="text-gray-500 text-xs">({t.notes})</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 text-xs">{t.date}</span>
                      <button
                        onClick={() => setEditingTransfer(t)}
                        className="text-xs text-gray-600 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-gray-900 rounded-lg p-8 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              onClick={() => navigateMonth(prevMonth(yearMonth))}
              className="text-gray-400 hover:text-white px-3 py-1 rounded hover:bg-gray-800 text-lg"
            >
              &lt;
            </button>
            <h2 className="text-xl font-semibold">{monthLabel(yearMonth)}</h2>
            <button
              onClick={() => navigateMonth(nextMonth(yearMonth))}
              className="text-gray-400 hover:text-white px-3 py-1 rounded hover:bg-gray-800 text-lg"
            >
              &gt;
            </button>
          </div>
          {loading ? (
            <p className="text-gray-400">Cargando...</p>
          ) : (
            <>
              <p className="text-gray-400 mb-2">No hay presupuesto para este mes</p>
              {hasTemplates && (
                <p className="text-gray-500 text-xs mb-4">
                  Se van a crear automáticamente {templates.filter((t) => t.isActive).length} gastos fijos desde tus templates
                </p>
              )}
              <button
                onClick={() => setShowNewMonth(true)}
                className="bg-blue-600 hover:bg-blue-500 text-sm px-6 py-2.5 rounded font-medium"
              >
                Crear Mes
              </button>
            </>
          )}
        </div>
      )}

      {/* Comparison section */}
      {comparison.months.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 mb-3">COMPARACIÓN HISTÓRICA</h2>
          <ComparisonCharts
            byCategory={comparison.byCategory}
            byExpense={comparison.byExpense}
            monthlyTotals={comparison.monthlyTotals}
            months={comparison.months}
          />
        </div>
      )}

      {/* Modals */}
      {showTransfer && budget && (
        <TransferModal
          budgetId={budget.id}
          remaining={budget.remaining}
          onClose={() => setShowTransfer(false)}
        />
      )}
      {editingTransfer && budget && (
        <TransferModal
          budgetId={budget.id}
          remaining={budget.remaining}
          existing={editingTransfer}
          onClose={() => { setEditingTransfer(null); refreshBudget(); }}
        />
      )}
      {showNewMonth && (
        <NewMonthModal
          defaultYearMonth={yearMonth}
          onClose={() => setShowNewMonth(false)}
          onCreated={(ym) => navigateMonth(ym)}
        />
      )}
    </div>
  );
}
