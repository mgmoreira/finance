"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
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

const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MONTH_SHORT = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];

function monthLabel(ym: string) {
  const [year, month] = ym.split("-");
  return `${MONTH_NAMES[parseInt(month) - 1]} ${year}`;
}

function monthShort(ym: string) {
  const [year, month] = ym.split("-");
  return `${MONTH_SHORT[parseInt(month) - 1]} ${year.slice(2)}`;
}

function nextMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

function prevMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

const T1_CSS = `
.t1-period { display: flex; align-items: stretch; border-bottom: 1px solid var(--border-strong); background: var(--panel); overflow-x: auto; scrollbar-width: none; }
.t1-period::-webkit-scrollbar { display: none; }
.t1-period__lbl { color: var(--text-dim); font-size: 10px; letter-spacing: 0.1em; align-self: center; padding: 10px 14px; border-right: 1px solid var(--border-strong); flex-shrink: 0; }
.t1-mp { flex: 0 0 auto; padding: 8px 12px; cursor: pointer; border-right: 1px solid var(--border-strong); display: flex; flex-direction: column; gap: 3px; min-width: 82px; transition: background .12s; }
.t1-mp:hover { background: var(--panel-alt); }
.t1-mp.on { background: #1a1a12; box-shadow: inset 0 -2px 0 var(--accent); }
.t1-mp__n { font-size: 9px; color: var(--text-dim); letter-spacing: 0.1em; }
.t1-mp.on .t1-mp__n { color: var(--accent); }
.t1-mp__v { font-size: 10px; color: var(--text); }
.t1-mp__b { height: 2px; background: var(--border-strong); position: relative; overflow: hidden; margin-top: 2px; }
.t1-mp__b > span { position: absolute; inset: 0 auto 0 0; background: var(--up); }
.t1-mp.warn .t1-mp__b > span { background: var(--accent); }

.t1-tabs { display: flex; padding: 0 14px; border-bottom: 1px solid var(--border-strong); background: var(--panel); }
.t1-tab { padding: 8px 14px; background: transparent; border: 0; color: var(--text-dim); font-family: var(--font-mono); letter-spacing: 0.08em; font-size: 10px; border-bottom: 2px solid transparent; margin-bottom: -1px; cursor: pointer; transition: color .12s; }
.t1-tab:hover { color: var(--text); }
.t1-tab.on { color: var(--text); border-bottom-color: var(--accent); }

.t1-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid var(--border-strong); }
@media (max-width: 680px) { .t1-stat-grid { grid-template-columns: repeat(2, 1fr); } }
.t1-stat { padding: 10px 14px 12px; border-right: 1px solid var(--border-strong); background: var(--panel); display: flex; flex-direction: column; gap: 4px; }
.t1-stat:last-child { border-right: 0; }
.t1-stat__l { font-size: 9px; color: var(--text-dim); letter-spacing: 0.12em; display: flex; align-items: center; gap: 6px; }
.t1-stat__l::before { content: ''; width: 5px; height: 5px; background: var(--text-dim); flex-shrink: 0; }
.t1-stat.pos .t1-stat__l::before { background: var(--up); }
.t1-stat.neg .t1-stat__l::before { background: var(--down); }
.t1-stat.warn .t1-stat__l::before { background: var(--accent); }
.t1-stat.neutral .t1-stat__l::before { background: var(--blue); }
.t1-stat__v { font-size: 17px; font-weight: 600; color: #e8dfb8; letter-spacing: -0.01em; }
.t1-stat__s { font-size: 9px; color: var(--text-dim); line-height: 1.4; }
.t1-stat__bar { height: 2px; background: var(--border-strong); margin-top: auto; position: relative; overflow: hidden; }
.t1-stat__bar > span { position: absolute; inset: 0 auto 0 0; }
.t1-stat .t1-stat__bar > span { background: var(--text-dim); }
.t1-stat.pos .t1-stat__bar > span { background: var(--up); }
.t1-stat.neg .t1-stat__bar > span { background: var(--down); }
.t1-stat.warn .t1-stat__bar > span { background: var(--accent); }
.t1-stat.neutral .t1-stat__bar > span { background: var(--blue); }

.t1-pn { border: 1px solid var(--border-strong); background: var(--bg); }
.t1-pn__h { padding: 8px 12px; border-bottom: 1px solid var(--border-strong); display: flex; justify-content: space-between; align-items: center; background: var(--panel); font-size: 10px; letter-spacing: 0.08em; color: var(--text-dim); gap: 10px; flex-wrap: wrap; }
.t1-pn__h b { color: var(--text); font-weight: 700; }
.t1-pn__h select { background: var(--panel-alt); border: 1px solid var(--border-strong); color: var(--text); font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.04em; padding: 3px 8px; }

.t1-bar2 { display: flex; height: 24px; }
.t1-bar2 > span { transition: filter .12s; }
.t1-bar2 > span:hover { filter: brightness(1.3); }
.t1-bar2-leg { display: flex; flex-wrap: wrap; gap: 8px 16px; padding: 10px 12px 12px; font-size: 10px; color: var(--text-dim); }
.t1-bar2-leg__i { display: flex; align-items: center; gap: 5px; }
.t1-bar2-leg b { color: var(--text); font-weight: 500; }

.t1-tbl { width: 100%; border-collapse: collapse; font-size: 11px; font-family: var(--font-mono); }
.t1-tbl th { text-align: left; padding: 6px 10px; font-weight: 600; font-size: 9px; letter-spacing: 0.1em; color: var(--text-dim); background: var(--panel-alt); border-bottom: 1px solid var(--border-strong); position: sticky; top: 0; }
.t1-tbl th.r, .t1-tbl td.r { text-align: right; }
.t1-tbl td { padding: 0 10px; height: 27px; border-bottom: 1px solid var(--border); color: var(--text-dim); }
.t1-tbl tr:hover td { background: var(--panel); color: var(--text); }
.t1-tbl tfoot td { background: var(--panel); color: var(--text); font-weight: 600; padding: 8px 10px; border-top: 1px solid var(--accent); }
.t1-tbl .t1-fix td:first-child { border-left: 2px solid var(--text-mute); padding-left: 8px; }
.t1-tbl .t1-var td:first-child { border-left: 2px solid var(--accent); padding-left: 8px; }
.t1-tbl .t1-pend td { color: var(--accent); }
.t1-tbl .t1-pend td:first-child { border-left: 2px solid var(--accent); padding-left: 8px; }
.t1-tbl .t1-edit td { background: var(--panel-alt) !important; }
.pill { font-size: 9px; padding: 1px 5px; letter-spacing: 0.04em; font-family: var(--font-mono); }
.pill.paid { background: rgba(43,182,115,0.12); color: var(--up); }
.pill.pend { background: rgba(232,163,23,0.12); color: var(--accent); }

.t1-cat__r { padding: 8px 12px; display: grid; grid-template-columns: 10px 1fr auto; gap: 8px; align-items: center; font-size: 11px; border-bottom: 1px solid var(--border); position: relative; }
.t1-cat__r:last-child { border-bottom: 0; }
.t1-cat__n { color: var(--text); }
.t1-cat__pc { color: var(--text-dim); font-size: 10px; margin-left: 4px; }
.t1-cat__a { color: #e8dfb8; font-weight: 600; font-size: 11px; }
.t1-cat__b { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; opacity: 0.25; }

.t1-btn { background: var(--panel); border: 1px solid var(--border-strong); color: var(--text); padding: 5px 10px; font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.06em; cursor: pointer; transition: background .12s; }
.t1-btn:hover { background: var(--panel-alt); }
.t1-btn.accent { background: var(--accent); border-color: var(--accent); color: #0a0e0d; font-weight: 600; }
.t1-btn.accent:hover { filter: brightness(1.1); }
.t1-btn.success { background: var(--up); border-color: var(--up); color: #0a0e0d; font-weight: 600; }
.t1-btn.success:hover { filter: brightness(1.1); }
.t1-btn.danger { color: var(--down); }
.t1-btn.danger:hover { background: rgba(231,76,60,0.1); border-color: var(--down); }
.t1-inp { background: var(--panel-alt); border: 1px solid var(--border-strong); color: var(--text); font-family: var(--font-mono); font-size: 11px; padding: 4px 8px; outline: none; }
.t1-inp:focus { border-color: var(--accent); }

.t1-section-hdr { font-size: 9px; color: var(--text-dim); letter-spacing: 0.14em; padding: 8px 0 4px; border-top: 1px solid var(--border); }

.t1-transfer-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; border-bottom: 1px solid var(--border); font-size: 11px; }
.t1-transfer-row:hover { background: var(--panel); }
.t1-transfer-row:last-child { border-bottom: 0; }
`;

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
  const [loading, setLoading] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<TransferRow | null>(null);
  const [activeTab, setActiveTab] = useState<"mes" | "historico" | "recurrentes">("historico");
  const [triggerAdd, setTriggerAdd] = useState(0);

  const periodRef = useRef<HTMLDivElement>(null);
  const activeBtnRef = useRef<HTMLDivElement>(null);

  const sortedMonths = useMemo(
    () => [...allMonths].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth)),
    [allMonths]
  );

  useEffect(() => {
    activeBtnRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [yearMonth]);

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
    setActiveTab("mes");
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
    <div style={{ fontFamily: "var(--font-mono)" }}>
      <style>{T1_CSS}</style>

      {/* ── Period strip ── */}
      <div className="t1-period" ref={periodRef}>
        <span className="t1-period__lbl">PERÍODOS</span>
        {sortedMonths.map((m) => {
          const rate = m.salary > 0 ? m.totalInvested / m.salary : 0;
          const isActive = m.yearMonth === yearMonth;
          return (
            <div
              key={m.yearMonth}
              ref={isActive ? activeBtnRef : undefined}
              className={`t1-mp${isActive ? " on" : ""}${rate > 0 && rate < 0.3 ? " warn" : ""}`}
              onClick={() => navigateMonth(m.yearMonth)}
            >
              <span className="t1-mp__n">{monthShort(m.yearMonth)}</span>
              <span className="t1-mp__v">{formatArs(m.totalSpent)}</span>
              <span className="t1-mp__b">
                <span style={{ width: `${Math.min(rate, 1) * 100}%` }} />
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Tabs ── */}
      <div className="t1-tabs">
        <button className={`t1-tab${activeTab === "mes" ? " on" : ""}`} onClick={() => setActiveTab("mes")}>
          ◐ MES
        </button>
        <button className={`t1-tab${activeTab === "historico" ? " on" : ""}`} onClick={() => setActiveTab("historico")}>
          ◫ HISTÓRICO
        </button>
        <button className={`t1-tab${activeTab === "recurrentes" ? " on" : ""}`} onClick={() => setActiveTab("recurrentes")}>
          ↻ RECURRENTES
        </button>
      </div>

      {/* ── Content ── */}
      <div className="page-wrap" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>

        {/* ══ MES TAB ══ */}
        {activeTab === "mes" && (
          <>
            {/* Month title + actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.1em" }}>
                  PRESUPUESTO · {budget ? "EN CURSO" : "SIN PRESUPUESTO"}
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 600, margin: "4px 0 0", color: "#e8dfb8", letterSpacing: "-0.01em" }}>
                  {monthLabel(yearMonth).toUpperCase()}
                  {budget && (
                    <span style={{ color: "var(--text-dim)", fontWeight: 400, fontSize: 13 }}>
                      {" "}· {budget.expenses.filter((e) => e.amount !== null).length} MOV
                    </span>
                  )}
                </h1>
              </div>
              {budget && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button className="t1-btn" onClick={() => setTriggerAdd((t) => t + 1)}>
                    + GASTO
                  </button>
                  <button className="t1-btn" onClick={() => setActiveTab("recurrentes")}>
                    ↻ RECURRENTES
                  </button>
                  {budget.remaining > 0 && (
                    <button className="t1-btn success" onClick={() => setShowTransfer(true)}>
                      ⚡ INVERTIR SOBRANTE
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Stats */}
            {budget && (
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
            )}

            {/* Stacked bar breakdown */}
            {budget && budget.expenses.some((e) => e.amount !== null) && (
              <MonthBreakdownChart
                salary={budget.totalSalary}
                expenses={budget.expenses}
                totalInvested={budget.totalInvested}
              />
            )}

            {/* Expense list */}
            {budget && (
              <ExpenseList
                expenses={budget.expenses}
                categories={categories}
                budgetId={budget.id}
                onMutate={refreshBudget}
                triggerAdd={triggerAdd}
              />
            )}

            {/* Transfers section */}
            {budget && budget.transfers.length > 0 && (
              <div className="t1-pn">
                <div className="t1-pn__h">
                  <b>TRANSFERENCIAS A INVERSIÓN</b>
                  <span>{budget.transfers.length} operación{budget.transfers.length !== 1 ? "es" : ""} · {formatArs(budget.transfers.reduce((s, t) => s + t.amountArs, 0))}</span>
                </div>
                <div>
                  {budget.transfers.map((t: TransferRow) => (
                    <div key={t.id} className="t1-transfer-row">
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ color: "var(--up)", fontWeight: 600 }} data-money>
                          {formatArs(t.amountArs)}
                        </span>
                        <span style={{ color: "var(--text-dim)" }}>→</span>
                        <span style={{ color: t.currency === "USD" ? "var(--accent)" : "var(--blue)" }}>
                          {t.currency === "USD"
                            ? `US$ ${t.amountUsd?.toFixed(2) ?? "?"}`
                            : formatArs(t.amountArs)}
                        </span>
                        {t.notes && (
                          <span style={{ color: "var(--text-mute)", fontSize: 10 }}>({t.notes})</span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ color: "var(--text-dim)", fontSize: 10 }}>{t.date}</span>
                        <button
                          className="t1-btn"
                          style={{ padding: "2px 7px", fontSize: 9 }}
                          onClick={() => setEditingTransfer(t)}
                        >
                          EDITAR
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No budget state */}
            {!budget && !loading && (
              <div className="t1-pn" style={{ padding: "40px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.14em", marginBottom: 12 }}>
                  SIN PRESUPUESTO PARA ESTE MES
                </div>
                {hasTemplates && (
                  <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 16 }}>
                    Se crearán automáticamente {templates.filter((t) => t.isActive).length} gastos fijos desde tus recurrentes
                  </div>
                )}
                <button className="t1-btn accent" onClick={() => setShowNewMonth(true)}>
                  CREAR MES
                </button>
              </div>
            )}

            {loading && (
              <div style={{ padding: 20, textAlign: "center", color: "var(--text-dim)", fontSize: 11, letterSpacing: "0.1em" }}>
                CARGANDO...
              </div>
            )}
          </>
        )}

        {/* ══ HISTÓRICO TAB ══ */}
        {activeTab === "historico" && (
          <>
            {comparison.months.length > 0 ? (
              <ComparisonCharts
                byCategory={comparison.byCategory}
                byExpense={comparison.byExpense}
                monthlyTotals={comparison.monthlyTotals}
                months={comparison.months}
                onMonthClick={(ym) => navigateMonth(ym)}
              />
            ) : (
              <div className="t1-pn" style={{ padding: 40, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.1em" }}>
                  CARGÁ AL MENOS 2 MESES PARA VER COMPARACIONES
                </div>
              </div>
            )}
          </>
        )}

        {/* ══ RECURRENTES TAB ══ */}
        {activeTab === "recurrentes" && (
          <TemplateManager
            templates={templates}
            categories={categories}
            allMonths={allMonths}
          />
        )}
      </div>

      {/* ── Modals ── */}
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
