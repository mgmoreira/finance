"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine,
} from "recharts";
import { formatArs } from "@/lib/format";

// ── Shared recharts Bloomberg theme ──────────────────────────────────
const GRID_COLOR = "#2a323b";
const TICK_STYLE = { fill: "#7a8189", fontSize: 10, fontFamily: "var(--font-mono)" };
const TOOLTIP_STYLE = {
  contentStyle: { background: "#11151a", border: "1px solid #2a323b", borderRadius: 2, fontFamily: "var(--font-mono)", fontSize: 11 },
  labelStyle: { color: "#d4d6d9" },
  cursor: { fill: "rgba(255,255,255,0.03)" },
};
function tickFmt(v: number) { return `${(v / 1e6).toFixed(1)}M`; }
function tickFmtPct(v: number) { return `${v}%`; }

function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    ro.observe(ref.current);
    setWidth(ref.current.clientWidth);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

function formatMonthShort(ym: string) {
  const [year, month] = ym.split("-");
  const m = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return `${m[parseInt(month) - 1]} ${year.slice(2)}`;
}

// ── Props ──────────────────────────────────────────────────────────────
interface CategoryData { category: string; color: string; amounts: Record<string, number>; }
interface ExpenseData { name: string; category: string; amounts: Record<string, number>; }
interface MonthTotal {
  yearMonth: string; salary: number; totalSpent: number; totalInvested: number;
  savings: number; savingsPct: number;
  exchangeRateUsd?: number | null; totalInvestedUsd?: number | null;
}
interface ComparisonChartsProps {
  byCategory: CategoryData[];
  byExpense: ExpenseData[];
  monthlyTotals: MonthTotal[];
  months: string[];
  onMonthClick?: (yearMonth: string) => void;
}

const STACKED_COLORS = [
  "#c25450","#5a82c4","#7ba85a","#d4a04a","#8a6fc4","#c46f9c","#7a7066",
  "#c9a04a","#4a9eff","#a78bfa","#2bb673","#e74c3c",
];

// ── Savings rate: horizontal bars (SVG) ──────────────────────────────
function SavingsRateChart({ monthlyTotals }: { monthlyTotals: MonthTotal[] }) {
  const TARGET = 0.4;
  const MAX_RATE = 0.7;
  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 7 }}>
      {monthlyTotals.map((m) => {
        const rate = m.salary > 0 ? m.totalInvested / m.salary : 0;
        const fillPct = Math.min(rate / MAX_RATE, 1) * 100;
        const targetPct = (TARGET / MAX_RATE) * 100;
        const ok = rate >= TARGET;
        return (
          <div key={m.yearMonth} style={{ display: "grid", gridTemplateColumns: "58px 1fr 56px", gap: 10, alignItems: "center", fontSize: 11, fontFamily: "var(--font-mono)" }}>
            <span style={{ color: "var(--text-dim)", letterSpacing: "0.06em", fontSize: 10 }}>
              {formatMonthShort(m.yearMonth).toUpperCase()}
            </span>
            <span style={{ height: 14, background: "var(--panel-alt)", position: "relative", display: "block" }}>
              <span style={{ position: "absolute", inset: 0, width: `${fillPct}%`, background: ok ? "var(--up)" : "var(--accent)", right: "auto" }} />
              <span style={{ position: "absolute", top: -3, bottom: -3, width: 1, left: `${targetPct}%`, background: "#e8dfb8", opacity: 0.6 }} />
            </span>
            <span style={{ color: ok ? "var(--up)" : "var(--text)", textAlign: "right", fontWeight: 600 }}>
              {rate ? `${(rate * 100).toFixed(1)}%` : "—"}
            </span>
          </div>
        );
      })}
      <div style={{ marginTop: 4, fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.1em" }}>
        ─── LÍNEA META {(TARGET * 100).toFixed(0)}%
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────
export function ComparisonCharts({ byCategory, byExpense, monthlyTotals, months, onMonthClick }: ComparisonChartsProps) {
  const [catFilter, setCatFilter] = useState<string>("all");
  const [catView, setCatView] = useState<"categories" | "detail">("categories");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const c1 = useContainerWidth();
  const c2 = useContainerWidth();
  const c3 = useContainerWidth();
  const c4 = useContainerWidth();

  // ── Derived data ──
  const categoryNames = useMemo(() => [...new Set(byCategory.map((c) => c.category))].sort(), [byCategory]);

  const categoryChartData = useMemo(() => months.map((month) => {
    const row: Record<string, string | number> = { month: formatMonthShort(month) };
    for (const cat of byCategory) {
      if (catFilter !== "all" && cat.category !== catFilter) continue;
      row[cat.category] = cat.amounts[month] ?? 0;
    }
    return row;
  }), [months, byCategory, catFilter]);

  const detailExpenses = useMemo(() => {
    if (!selectedCategory) return byExpense;
    return byExpense.filter((e) => e.category === selectedCategory);
  }, [byExpense, selectedCategory]);

  const detailChartData = useMemo(() => months.map((month) => {
    const row: Record<string, string | number> = { month: formatMonthShort(month) };
    for (const exp of detailExpenses) row[exp.name] = exp.amounts[month] ?? 0;
    return row;
  }), [months, detailExpenses]);

  // Income breakdown stacked bar
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
      const row: Record<string, string | number> = { month: formatMonthShort(month), _salary: salary };
      let topTotal = 0;
      for (const key of topKeys) {
        const exp = byExpense.find((e) => e.name === key);
        const val = exp?.amounts[month] ?? 0;
        row[key] = val;
        topTotal += val;
      }
      if (hasOthers) row["_otros"] = Math.max(0, (mt?.totalSpent ?? 0) - topTotal);
      row["_inversion"] = invested;
      row["_disponible"] = Math.max(0, salary - (mt?.totalSpent ?? 0) - invested);
      return row;
    });

    const keys = [...topKeys];
    if (hasOthers) keys.push("_otros");
    keys.push("_inversion", "_disponible");
    return { incomeBreakdownData: data, topExpenseKeys: keys };
  }, [months, monthlyTotals, byExpense]);

  function keyLabel(k: string) {
    if (k === "_otros") return "Otros gastos";
    if (k === "_inversion") return "Inversión";
    if (k === "_disponible") return "Disponible";
    return k;
  }
  function keyColor(k: string, i: number) {
    if (k === "_otros") return "#7a8189";
    if (k === "_inversion") return "#2bb673";
    if (k === "_disponible") return "#1e3a5f";
    return STACKED_COLORS[i % STACKED_COLORS.length];
  }

  const avgSalary = monthlyTotals.length > 0
    ? monthlyTotals.reduce((s, m) => s + m.salary, 0) / monthlyTotals.length
    : 0;

  // Current month donut (SVG)
  const donutData = useMemo(() => {
    const latestMonth = months[months.length - 1];
    if (!latestMonth) return [];
    return byCategory
      .map((cat) => ({ name: cat.category, value: cat.amounts[latestMonth] ?? 0, color: cat.color }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [months, byCategory]);

  const donutTotal = donutData.reduce((s, d) => s + d.value, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ── Historical table ── */}
      <div className="t1-pn">
        <div className="t1-pn__h"><b>RESUMEN POR MES</b><span>Click en una fila para abrir el mes</span></div>
        <div style={{ overflowX: "auto" }}>
          <table className="t1-tbl">
            <thead>
              <tr>
                <th>MES</th>
                <th className="r">SUELDO</th>
                <th className="r" style={{ color: "var(--accent)" }}>USD</th>
                <th className="r">GASTADO</th>
                <th className="r">INVERTIDO</th>
                <th className="r" style={{ color: "var(--accent)" }}>USD</th>
                <th className="r" style={{ color: "var(--up)" }}>% INV</th>
                <th className="r">SOBRANTE</th>
              </tr>
            </thead>
            <tbody>
              {monthlyTotals.map((m) => {
                const investedPct = m.salary > 0 ? (m.totalInvested / m.salary) * 100 : 0;
                const salaryUsd = m.exchangeRateUsd ? m.salary / m.exchangeRateUsd : null;
                const clickable = !!onMonthClick;
                return (
                  <tr
                    key={m.yearMonth}
                    style={{ cursor: clickable ? "pointer" : undefined }}
                    onClick={clickable ? () => onMonthClick(m.yearMonth) : undefined}
                    title={clickable ? "Click para abrir este mes" : undefined}
                  >
                    <td style={{ fontWeight: 500 }}>{formatMonthShort(m.yearMonth).toUpperCase()}</td>
                    <td className="r" data-money>{formatArs(m.salary)}</td>
                    <td className="r" style={{ color: "var(--accent)" }}>
                      {salaryUsd != null ? `US$ ${Math.round(salaryUsd).toLocaleString("es-AR")}` : "—"}
                    </td>
                    <td className="r" style={{ color: "var(--down)" }} data-money>{formatArs(m.totalSpent)}</td>
                    <td className="r" style={{ color: "var(--up)" }} data-money>{formatArs(m.totalInvested)}</td>
                    <td className="r" style={{ color: "var(--accent)" }}>
                      {m.totalInvestedUsd != null ? `US$ ${Math.round(m.totalInvestedUsd).toLocaleString("es-AR")}` : "—"}
                    </td>
                    <td className="r" style={{ color: investedPct >= 40 ? "var(--up)" : "var(--text)", fontWeight: 600 }}>
                      {investedPct.toFixed(1)}%
                    </td>
                    <td className={`r${m.savings >= 0 ? "" : " neg"}`} data-money>{formatArs(m.savings)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Evolución del sueldo (stacked) ── */}
      {incomeBreakdownData.length >= 1 && (
        <div className="t1-pn">
          <div className="t1-pn__h">
            <b>EVOLUCIÓN DEL SUELDO</b>
            <span>Cada barra es el sueldo del mes desglosado por gasto</span>
          </div>
          <div ref={c1.ref} style={{ padding: 12 }}>
            {c1.width > 0 && (
              <BarChart width={c1.width} height={260} data={incomeBreakdownData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="month" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={TICK_STYLE} tickFormatter={tickFmt} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: unknown, name: unknown) => [formatArs(Number(v)), keyLabel(String(name))]} />
                <Legend formatter={(v: string) => keyLabel(v)} wrapperStyle={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#7a8189" }} />
                <ReferenceLine y={avgSalary} stroke="#4a5159" strokeDasharray="3 3" label={{ value: "Sueldo prom.", fill: "#4a5159", fontSize: 9, fontFamily: "var(--font-mono)" }} />
                {topExpenseKeys.map((key, i) => (
                  <Bar key={key} dataKey={key} name={key} stackId="s" fill={keyColor(key, i)} radius={key === "_disponible" ? [2, 2, 0, 0] : undefined} />
                ))}
              </BarChart>
            )}
          </div>
        </div>
      )}

      {/* ── Distribution & Savings side by side ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 12 }}>
        {/* Distribution monthly with category filter */}
        <div className="t1-pn">
          <div className="t1-pn__h">
            <b>DISTRIBUCIÓN MENSUAL</b>
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              <option value="all">TODAS LAS CATEGORÍAS</option>
              {categoryNames.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
            </select>
          </div>
          <div ref={c2.ref} style={{ padding: "12px 12px 8px" }}>
            {c2.width > 0 && (
              <BarChart width={c2.width} height={200} data={categoryChartData} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="month" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={TICK_STYLE} tickFormatter={tickFmt} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: unknown, name: unknown) => [formatArs(Number(v)), String(name)]} />
                {byCategory
                  .filter((c) => catFilter === "all" || c.category === catFilter)
                  .map((cat) => (
                    <Bar key={cat.category} dataKey={cat.category} fill={cat.color} radius={[2, 2, 0, 0]}
                      cursor="pointer"
                      onClick={() => { setSelectedCategory(cat.category); setCatView("detail"); }}
                    />
                  ))}
              </BarChart>
            )}
          </div>
        </div>

        {/* Savings rate bars */}
        <div className="t1-pn">
          <div className="t1-pn__h">
            <b>TASA DE AHORRO</b>
            <span>% del sueldo invertido por mes</span>
          </div>
          <SavingsRateChart monthlyTotals={monthlyTotals} />
        </div>
      </div>

      {/* ── Category detail drill (when selected) ── */}
      {catView === "detail" && selectedCategory && (
        <div className="t1-pn">
          <div className="t1-pn__h">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <b>DETALLE: {selectedCategory.toUpperCase()}</b>
              <button
                style={{ fontSize: 9, color: "var(--blue)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}
                onClick={() => { setCatView("categories"); setSelectedCategory(null); }}
              >
                ← VOLVER
              </button>
            </div>
          </div>
          <div ref={c3.ref} style={{ padding: "12px 12px 8px" }}>
            {c3.width > 0 && (
              <BarChart width={c3.width} height={220} data={detailChartData} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="month" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={TICK_STYLE} tickFormatter={tickFmt} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: unknown) => [formatArs(Number(v))]} />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#7a8189" }} />
                {detailExpenses.map((exp, i) => (
                  <Bar key={exp.name} dataKey={exp.name} fill={STACKED_COLORS[i % STACKED_COLORS.length]} radius={[2, 2, 0, 0]} />
                ))}
              </BarChart>
            )}
          </div>
        </div>
      )}

      {/* ── Current month donut (SVG) + category detail ── */}
      {donutData.length > 0 && donutTotal > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* Donut */}
          <div className="t1-pn">
            <div className="t1-pn__h">
              <b>MES ACTUAL — POR CATEGORÍA</b>
              <span>{formatMonthShort(months[months.length - 1]).toUpperCase()} · {formatArs(donutTotal)}</span>
            </div>
            <DonutChart data={donutData} total={donutTotal} />
          </div>

          {/* Category breakdown list */}
          <div className="t1-pn">
            <div className="t1-pn__h">
              <b>POR CATEGORÍA — DETALLE</b>
              <span>{formatArs(donutTotal)}</span>
            </div>
            <div>
              {donutData.map((d) => (
                <div key={d.name} className="t1-cat__r">
                  <span style={{ width: 8, height: 8, background: d.color, flexShrink: 0 }} />
                  <span className="t1-cat__n">
                    {d.name}
                    <span className="t1-cat__pc">{donutTotal > 0 ? ((d.value / donutTotal) * 100).toFixed(1) : 0}%</span>
                  </span>
                  <span className="t1-cat__a" data-money>{formatArs(d.value)}</span>
                  <span className="t1-cat__b" style={{ background: d.color, width: `${donutTotal > 0 ? (d.value / donutTotal) * 100 : 0}%` }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Savings rate line chart ── */}
      {monthlyTotals.length >= 2 && (
        <div className="t1-pn">
          <div className="t1-pn__h">
            <b>TASA DE AHORRO MENSUAL</b>
            <span>% del sueldo invertido por mes</span>
          </div>
          <div ref={c4.ref} style={{ padding: "12px 12px 8px" }}>
            {c4.width > 0 && (
              <LineChart
                width={c4.width}
                height={180}
                data={monthlyTotals.map((m) => ({
                  month: formatMonthShort(m.yearMonth),
                  pct: m.salary > 0 ? parseFloat(((m.totalInvested / m.salary) * 100).toFixed(1)) : 0,
                  monto: m.totalInvested,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="month" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={TICK_STYLE} tickFormatter={tickFmtPct} axisLine={false} tickLine={false} domain={[0, "auto"]} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(v: unknown, name: unknown) => {
                    if (name === "pct") return [`${v}%`, "% Invertido"];
                    return [formatArs(Number(v)), "Monto"];
                  }}
                />
                <ReferenceLine y={40} stroke="#4a5159" strokeDasharray="4 2" label={{ value: "40%", fill: "#4a5159", fontSize: 9, fontFamily: "var(--font-mono)" }} />
                <Line
                  type="monotone"
                  dataKey="pct"
                  stroke="var(--up)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--up)", strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </LineChart>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── SVG Donut ──────────────────────────────────────────────────────────
function DonutChart({ data, total }: { data: { name: string; value: number; color: string }[]; total: number }) {
  const SIZE = 160;
  const R = SIZE / 2 - 12;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const CIRC = 2 * Math.PI * R;
  let acc = 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 12 }}>
      <svg width={SIZE} height={SIZE} style={{ flexShrink: 0 }}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--panel-alt)" strokeWidth="14" />
        {data.map((d, i) => {
          if (!d.value) return null;
          const frac = d.value / total;
          const dash = frac * CIRC;
          const off = -acc * CIRC;
          acc += frac;
          return (
            <circle key={i} cx={CX} cy={CY} r={R} fill="none"
              stroke={d.color} strokeWidth="14"
              strokeDasharray={`${dash} ${CIRC - dash}`}
              strokeDashoffset={off}
              transform={`rotate(-90 ${CX} ${CY})`}
            />
          );
        })}
        <text x={CX} y={CY - 6} textAnchor="middle" fontSize="9" fill="var(--text-dim)" fontFamily="var(--font-mono)" letterSpacing="0.1em">TOTAL</text>
        <text x={CX} y={CY + 12} textAnchor="middle" fontSize="12" fontWeight="600" fill="#e8dfb8" fontFamily="var(--font-mono)">
          {`$${(total / 1e6).toFixed(1)}M`}
        </text>
      </svg>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5, fontSize: 10, fontFamily: "var(--font-mono)" }}>
        {data.map((d) => (
          <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, background: d.color, flexShrink: 0 }} />
            <span style={{ color: "var(--text)", flex: 1 }}>{d.name}</span>
            <span style={{ color: "var(--text-dim)" }}>{total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%</span>
            <span style={{ color: "#e8dfb8", minWidth: 80, textAlign: "right" }} data-money>{formatArs(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
