"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { formatArs } from "@/lib/format";
import type { ExpenseRow } from "@/lib/gastos-data";

interface MonthBreakdownChartProps {
  salary: number;
  expenses: ExpenseRow[];
  totalInvested: number;
}

const COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6", "#8b5cf6",
  "#a855f7", "#ec4899", "#f43f5e",
];

export function MonthBreakdownChart({ salary, expenses, totalInvested }: MonthBreakdownChartProps) {
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

  const { segments, chartData } = useMemo(() => {
    const completed = expenses
      .filter((e) => e.amount !== null && e.amount > 0)
      .sort((a, b) => b.amount! - a.amount!);

    const TOP_N = 8;
    const top = completed.slice(0, TOP_N);
    const rest = completed.slice(TOP_N);
    const restTotal = rest.reduce((sum, e) => sum + e.amount!, 0);

    const segs: { key: string; label: string; amount: number; color: string; pct: number }[] = [];
    top.forEach((e, i) => {
      segs.push({
        key: `exp_${e.id}`,
        label: e.name,
        amount: e.amount!,
        color: COLORS[i % COLORS.length],
        pct: salary > 0 ? (e.amount! / salary) * 100 : 0,
      });
    });
    if (restTotal > 0) {
      segs.push({
        key: "otros",
        label: "Otros gastos",
        amount: restTotal,
        color: "#6b7280",
        pct: salary > 0 ? (restTotal / salary) * 100 : 0,
      });
    }
    if (totalInvested > 0) {
      segs.push({
        key: "inversion",
        label: "Inversión",
        amount: totalInvested,
        color: "#22c55e",
        pct: salary > 0 ? (totalInvested / salary) * 100 : 0,
      });
    }

    const totalUsed = segs.reduce((s, seg) => s + seg.amount, 0);
    const disponible = Math.max(0, salary - totalUsed);
    if (disponible > 0) {
      segs.push({
        key: "disponible",
        label: "Disponible",
        amount: disponible,
        color: "#1e3a5f",
        pct: salary > 0 ? (disponible / salary) * 100 : 0,
      });
    }

    const row: Record<string, string | number> = { name: "Sueldo" };
    for (const seg of segs) {
      row[seg.key] = seg.amount;
    }

    return { segments: segs, chartData: [row] };
  }, [salary, expenses, totalInvested]);

  if (segments.length === 0) return null;

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">DESGLOSE DEL SUELDO</h3>

      <div ref={ref} style={{ width: "100%" }}>
        {width > 0 && (
          <BarChart width={width} height={56} data={chartData} layout="vertical" barSize={36}>
            <XAxis type="number" hide domain={[0, salary]} />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip
              contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
              labelStyle={{ color: "#d1d5db" }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => {
                const seg = segments.find((s) => s.key === name);
                return [formatArs(Number(value)), seg?.label ?? name];
              }}
            />
            {segments.map((seg) => (
              <Bar key={seg.key} dataKey={seg.key} stackId="salary" fill={seg.color} radius={0}>
                <Cell fill={seg.color} />
              </Bar>
            ))}
          </BarChart>
        )}
      </div>

      {/* Legend with amounts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2 mt-3">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center gap-2 text-sm">
            <span
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-gray-300 truncate">{seg.label}</span>
            <span className="text-gray-500 ml-auto text-xs whitespace-nowrap">
              {seg.pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
