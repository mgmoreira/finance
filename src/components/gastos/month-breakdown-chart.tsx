"use client";

import { useMemo } from "react";
import { formatArs } from "@/lib/format";
import type { ExpenseRow } from "@/lib/gastos-data";

interface MonthBreakdownChartProps {
  salary: number;
  expenses: ExpenseRow[];
  totalInvested: number;
}

export function MonthBreakdownChart({ salary, expenses, totalInvested }: MonthBreakdownChartProps) {
  const segments = useMemo(() => {
    const catMap: Record<string, { name: string; color: string; amount: number }> = {};

    for (const exp of expenses) {
      if (exp.amount === null || exp.amount <= 0) continue;
      const key = exp.categoryName ?? "Sin categoría";
      if (!catMap[key]) {
        catMap[key] = { name: key, color: exp.categoryColor ?? "#7a8189", amount: 0 };
      }
      catMap[key].amount += exp.amount;
    }

    const segs = Object.values(catMap).sort((a, b) => b.amount - a.amount);

    if (totalInvested > 0) {
      segs.push({ name: "Invertido", color: "var(--up)", amount: totalInvested });
    }

    const totalUsed = segs.reduce((s, seg) => s + seg.amount, 0);
    const disponible = Math.max(0, salary - totalUsed);
    if (disponible > 0) {
      segs.push({ name: "Por asignar", color: "var(--accent)", amount: disponible });
    }

    return segs.map((s) => ({ ...s, pct: salary > 0 ? (s.amount / salary) * 100 : 0 }));
  }, [salary, expenses, totalInvested]);

  if (segments.length === 0) return null;

  return (
    <div className="t1-pn">
      <div className="t1-pn__h">
        <b>EN QUÉ SE VA EL SUELDO</b>
        <span>{formatArs(salary)} · cada bloque es una categoría</span>
      </div>
      <div style={{ padding: "12px 12px 0" }}>
        <div className="t1-bar2">
          {segments.map((s, i) => (
            <span
              key={i}
              style={{ width: `${s.pct}%`, background: s.color, minWidth: s.pct > 0 ? 2 : 0 }}
              title={`${s.name}: ${formatArs(s.amount)} (${s.pct.toFixed(1)}%)`}
            />
          ))}
        </div>
      </div>
      <div className="t1-bar2-leg">
        {segments.map((s, i) => (
          <span key={i} className="t1-bar2-leg__i">
            <span style={{ width: 8, height: 8, background: s.color, display: "inline-block" }} />
            <span>{s.name}</span>
            <b>{formatArs(s.amount)}</b>
            <span style={{ color: "var(--text-mute)" }}>· {s.pct.toFixed(1)}%</span>
          </span>
        ))}
      </div>

      {/* Category detail list */}
      <div style={{ borderTop: "1px solid var(--border)" }}>
        {segments.map((s, i) => (
          <div
            key={i}
            className="t1-cat__r"
            style={{ position: "relative" }}
          >
            <span style={{ width: 8, height: 8, background: s.color, flexShrink: 0 }} />
            <span className="t1-cat__n">
              {s.name}
              <span className="t1-cat__pc">{s.pct.toFixed(1)}%</span>
            </span>
            <span className="t1-cat__a" data-money>{formatArs(s.amount)}</span>
            <span
              className="t1-cat__b"
              style={{ background: s.color, width: `${s.pct}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
