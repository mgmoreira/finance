"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { formatArs } from "@/lib/format";

function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(ref.current);
    setWidth(ref.current.clientWidth);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

interface CategoryData {
  category: string;
  color: string;
  amounts: Record<string, number>;
}

interface ExpenseData {
  name: string;
  category: string;
  amounts: Record<string, number>;
}

interface MonthTotal {
  yearMonth: string;
  salary: number;
  exchangeRateUsd?: number | null;
  totalSpent: number;
  totalInvested: number;
  totalInvestedUsd?: number | null;
  savings: number;
  savingsPct: number;
}

interface ComparisonChartsProps {
  byCategory: CategoryData[];
  byExpense: ExpenseData[];
  monthlyTotals: MonthTotal[];
  months: string[];
}

function formatMonthShort(ym: string) {
  const [year, month] = ym.split("-");
  const m = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${m[parseInt(month) - 1]} ${year.slice(2)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ArsTooltipFormatter(value: any) {
  return formatArs(Number(value));
}

const STACKED_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#14b8a6", "#06b6d4", "#3b82f6", "#8b5cf6", "#a855f7",
  "#ec4899", "#f43f5e",
];

const tooltipStyle = { backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 };
const labelStyle = { color: "#d1d5db" };
const axisTick = { fill: "#9ca3af", fontSize: 12 };
function tickFmt(v: number) { return `$${(v / 1000).toFixed(0)}k`; }

export function ComparisonCharts({
  byCategory,
  byExpense,
  monthlyTotals,
  months,
}: ComparisonChartsProps) {
  const [view, setView] = useState<"categories" | "detail">("categories");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const c1 = useContainerWidth();
  const c2 = useContainerWidth();
  const c3 = useContainerWidth();
  const c4 = useContainerWidth();

  const categoryNames = useMemo(
    () => [...new Set(byCategory.map((c) => c.category))].sort(),
    [byCategory]
  );

  const categoryChartData = useMemo(() => {
    return months.map((month) => {
      const row: Record<string, string | number> = { month: formatMonthShort(month) };
      for (const cat of byCategory) {
        if (filter !== "all" && cat.category !== filter) continue;
        row[cat.category] = cat.amounts[month] ?? 0;
      }
      return row;
    });
  }, [months, byCategory, filter]);

  const detailExpenses = useMemo(() => {
    if (!selectedCategory) return byExpense;
    return byExpense.filter((e) => e.category === selectedCategory);
  }, [byExpense, selectedCategory]);

  const detailChartData = useMemo(() => {
    return months.map((month) => {
      const row: Record<string, string | number> = { month: formatMonthShort(month) };
      for (const exp of detailExpenses) {
        row[exp.name] = exp.amounts[month] ?? 0;
      }
      return row;
    });
  }, [months, detailExpenses]);

  const detailColors = [
    "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7",
    "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#14b8a6",
  ];

  const totalsData = useMemo(() => {
    return monthlyTotals.map((m) => ({
      month: formatMonthShort(m.yearMonth),
      Gastos: m.totalSpent,
      Inversión: m.totalInvested,
      Sobrante: Math.max(0, m.savings),
    }));
  }, [monthlyTotals]);

  const { incomeBreakdownData, topExpenseKeys } = useMemo(() => {
    const expenseTotals = new Map<string, number>();
    for (const exp of byExpense) {
      const total = Object.values(exp.amounts).reduce((s, v) => s + v, 0);
      expenseTotals.set(exp.name, total);
    }
    const sorted = [...expenseTotals.entries()].sort((a, b) => b[1] - a[1]);
    const TOP_N = 8;
    const topKeys = sorted.slice(0, TOP_N).map(([name]) => name);
    const hasOthers = sorted.length > TOP_N;

    const data = months.map((month) => {
      const mt = monthlyTotals.find((m) => m.yearMonth === month);
      const salary = mt?.salary ?? 0;
      const invested = mt?.totalInvested ?? 0;

      const row: Record<string, string | number> = {
        month: formatMonthShort(month),
        _salary: salary,
      };

      let topTotal = 0;
      for (const key of topKeys) {
        const exp = byExpense.find((e) => e.name === key);
        const val = exp?.amounts[month] ?? 0;
        row[key] = val;
        topTotal += val;
      }

      if (hasOthers) {
        const allSpent = mt?.totalSpent ?? 0;
        row["_otros"] = Math.max(0, allSpent - topTotal);
      }

      row["_inversion"] = invested;

      const usedTotal = (mt?.totalSpent ?? 0) + invested;
      row["_disponible"] = Math.max(0, salary - usedTotal);

      return row;
    });

    const keys = [...topKeys];
    if (hasOthers) keys.push("_otros");
    keys.push("_inversion", "_disponible");

    return { incomeBreakdownData: data, topExpenseKeys: keys };
  }, [months, monthlyTotals, byExpense]);

  function getKeyLabel(key: string) {
    if (key === "_otros") return "Otros gastos";
    if (key === "_inversion") return "Inversión";
    if (key === "_disponible") return "Disponible";
    return key;
  }

  function getKeyColor(key: string, idx: number) {
    if (key === "_otros") return "#6b7280";
    if (key === "_inversion") return "#22c55e";
    if (key === "_disponible") return "#1e3a5f";
    return STACKED_COLORS[idx % STACKED_COLORS.length];
  }

  if (months.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 text-center text-gray-500">
        Cargá al menos 2 meses para ver comparaciones
      </div>
    );
  }

  const avgSalary = monthlyTotals.length > 0
    ? monthlyTotals.reduce((s, m) => s + m.salary, 0) / monthlyTotals.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Monthly totals summary table */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">RESUMEN POR MES</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-left border-b border-gray-800">
                <th className="py-2 px-2">Mes</th>
                <th className="py-2 px-2 text-right">Sueldo</th>
                <th className="py-2 px-2 text-right text-yellow-500">Sueldo USD</th>
                <th className="py-2 px-2 text-right">Gastado</th>
                <th className="py-2 px-2 text-right">Invertido</th>
                <th className="py-2 px-2 text-right text-yellow-500">Invertido USD</th>
                <th className="py-2 px-2 text-right text-green-400">% Invertido</th>
                <th className="py-2 px-2 text-right">Sobrante</th>
              </tr>
            </thead>
            <tbody>
              {monthlyTotals.map((m) => {
                const investedPct = m.salary > 0 ? (m.totalInvested / m.salary) * 100 : 0;
                const salaryUsd = m.exchangeRateUsd ? m.salary / m.exchangeRateUsd : null;
                return (
                <tr key={m.yearMonth} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-2 px-2 font-medium">{formatMonthShort(m.yearMonth)}</td>
                  <td className="py-2 px-2 text-right" data-money>{formatArs(m.salary)}</td>
                  <td className="py-2 px-2 text-right text-yellow-400">
                    {salaryUsd != null ? `US$ ${Math.round(salaryUsd).toLocaleString("es-AR")}` : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="py-2 px-2 text-right text-red-400" data-money>{formatArs(m.totalSpent)}</td>
                  <td className="py-2 px-2 text-right text-green-400" data-money>{formatArs(m.totalInvested)}</td>
                  <td className="py-2 px-2 text-right text-yellow-400">
                    {m.totalInvestedUsd != null ? `US$ ${Math.round(m.totalInvestedUsd).toLocaleString("es-AR")}` : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="py-2 px-2 text-right text-green-400 font-semibold">
                    {investedPct.toFixed(1)}%
                  </td>
                  <td className={`py-2 px-2 text-right ${m.savings >= 0 ? "text-gray-400" : "text-red-400"}`} data-money>
                    {formatArs(m.savings)}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Income breakdown stacked bar */}
      {incomeBreakdownData.length >= 1 && (
        <div className="bg-gray-900 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-1">EN QUÉ SE VA EL SUELDO</h3>
          <p className="text-xs text-gray-500 mb-3">Cada barra es tu sueldo, desglosado por gasto</p>
          <div ref={c1.ref} style={{ width: "100%" }}>
            {c1.width > 0 && (
              <BarChart width={c1.width} height={450} data={incomeBreakdownData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" tick={axisTick} />
                <YAxis tick={axisTick} tickFormatter={tickFmt} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={labelStyle}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => [
                    formatArs(Number(value)),
                    getKeyLabel(String(name)),
                  ]}
                />
                <Legend formatter={(value: string) => getKeyLabel(value)} />
                <ReferenceLine y={avgSalary} stroke="#9ca3af" strokeDasharray="3 3" label={{ value: "Sueldo prom.", fill: "#9ca3af", fontSize: 11 }} />
                {topExpenseKeys.map((key, i) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    name={key}
                    stackId="income"
                    fill={getKeyColor(key, i)}
                    radius={key === "_disponible" ? [2, 2, 0, 0] : undefined}
                  />
                ))}
              </BarChart>
            )}
          </div>
        </div>
      )}

      {/* Totals bar chart (side by side) */}
      {totalsData.length >= 1 && (
        <div className="bg-gray-900 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">DISTRIBUCIÓN MENSUAL</h3>
          <div ref={c2.ref} style={{ width: "100%" }}>
            {c2.width > 0 && (
              <BarChart width={c2.width} height={300} data={totalsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" tick={axisTick} />
                <YAxis tick={axisTick} tickFormatter={tickFmt} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} formatter={ArsTooltipFormatter} />
                <Legend />
                <Bar dataKey="Gastos" fill="#ef4444" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Inversión" fill="#22c55e" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Sobrante" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              </BarChart>
            )}
          </div>
        </div>
      )}

      {/* Category comparison */}
      <div className="bg-gray-900 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-400">
              {view === "categories" ? "POR CATEGORÍA" : `DETALLE: ${selectedCategory ?? "TODOS"}`}
            </h3>
            {view === "detail" && (
              <button
                onClick={() => { setView("categories"); setSelectedCategory(null); }}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Volver
              </button>
            )}
          </div>
          {view === "categories" && (
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
            >
              <option value="all">Todas las categorías</option>
              {categoryNames.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}
        </div>

        <div ref={c3.ref} style={{ width: "100%" }}>
          {c3.width > 0 && view === "categories" && (
            <>
              <BarChart width={c3.width} height={350} data={categoryChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" tick={axisTick} />
                <YAxis tick={axisTick} tickFormatter={tickFmt} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} formatter={ArsTooltipFormatter} />
                <Legend />
                {byCategory
                  .filter((c) => filter === "all" || c.category === filter)
                  .map((cat) => (
                    <Bar
                      key={cat.category}
                      dataKey={cat.category}
                      fill={cat.color}
                      radius={[2, 2, 0, 0]}
                      cursor="pointer"
                      onClick={() => {
                        setSelectedCategory(cat.category);
                        setView("detail");
                      }}
                    />
                  ))}
              </BarChart>
              <p className="text-xs text-gray-500 mt-2">Click en una categoría del gráfico para ver el detalle</p>
            </>
          )}
          {c3.width > 0 && view === "detail" && (
            <BarChart width={c3.width} height={350} data={detailChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" tick={axisTick} />
              <YAxis tick={axisTick} tickFormatter={tickFmt} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} formatter={ArsTooltipFormatter} />
              <Legend />
              {detailExpenses.map((exp, i) => (
                <Bar
                  key={exp.name}
                  dataKey={exp.name}
                  fill={detailColors[i % detailColors.length]}
                  radius={[2, 2, 0, 0]}
                />
              ))}
            </BarChart>
          )}
        </div>
      </div>

      {/* Savings rate line chart */}
      {monthlyTotals.length >= 2 && (
        <div className="bg-gray-900 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-1">TASA DE AHORRO MENSUAL</h3>
          <p className="text-xs text-gray-500 mb-3">% del sueldo invertido por mes</p>
          <div ref={c4.ref} style={{ width: "100%" }}>
            {c4.width > 0 && (
              <LineChart
                width={c4.width}
                height={220}
                data={monthlyTotals.map((m) => ({
                  month: formatMonthShort(m.yearMonth),
                  pct: m.salary > 0 ? parseFloat(((m.totalInvested / m.salary) * 100).toFixed(1)) : 0,
                  monto: m.totalInvested,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" tick={axisTick} />
                <YAxis tick={axisTick} tickFormatter={(v) => `${v}%`} domain={[0, "auto"]} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={labelStyle}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => {
                    if (name === "pct") return [`${value}%`, "% Invertido"];
                    return [formatArs(Number(value)), "Monto"];
                  }}
                />
                <ReferenceLine y={20} stroke="#374151" strokeDasharray="4 2" label={{ value: "20%", fill: "#6b7280", fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="pct"
                  stroke="#22c55e"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#22c55e" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            )}
          </div>
        </div>
      )}

      {/* Current month category donut */}
      {(() => {
        const latestMonth = months[months.length - 1];
        const catData = byCategory
          .map((cat) => ({
            name: cat.category,
            value: cat.amounts[latestMonth] ?? 0,
            color: cat.color,
          }))
          .filter((d) => d.value > 0);
        const total = catData.reduce((s, d) => s + d.value, 0);
        if (catData.length === 0 || total === 0) return null;
        return (
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-1">
              MES ACTUAL — POR CATEGORÍA
              <span className="text-gray-600 font-normal ml-2">{formatMonthShort(latestMonth)}</span>
            </h3>
            <p className="text-xs text-gray-500 mb-3">Total: {formatArs(total)}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
              <PieChart width={180} height={180}>
                <Pie
                  data={catData}
                  cx={85}
                  cy={85}
                  innerRadius={52}
                  outerRadius={80}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {catData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={labelStyle}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => [
                    `${formatArs(Number(value))} (${total > 0 ? ((Number(value) / total) * 100).toFixed(1) : 0}%)`,
                    String(name),
                  ]}
                />
              </PieChart>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                {catData.map((cat) => (
                  <div key={cat.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: cat.color, flexShrink: 0 }} />
                    <span style={{ color: "#9ca3af" }}>{cat.name}</span>
                    <strong style={{ color: "#d1d5db", marginLeft: "auto", paddingLeft: 16 }}>
                      {total > 0 ? ((cat.value / total) * 100).toFixed(1) : 0}%
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
