"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from "recharts";

interface MonthlySnapshot {
  yearMonth: string;
  gainPct: number;
  gainUsd: number;
  portfolioValue: number;
  depositsUsd: number;
  sp500Value: number | null;
}

interface Props {
  snapshots: MonthlySnapshot[];
}

function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    observer.observe(ref.current);
    setWidth(ref.current.clientWidth);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

function formatMonthShort(ym: string) {
  const [year, month] = ym.split("-");
  const names = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${names[parseInt(month) - 1]} ${year.slice(2)}`;
}

function fmtUsd(v: number) {
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function tickFmtUsd(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
  return `$${v.toFixed(0)}`;
}

const tooltipStyle = { backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 };
const labelStyle = { color: "#d1d5db" };
const axisTick = { fill: "#9ca3af", fontSize: 11 };

export function PortfolioCharts({ snapshots }: Props) {
  const c1 = useContainerWidth();
  const c2 = useContainerWidth();

  const evolutionData = useMemo(() => {
    if (snapshots.length === 0) return [];
    const firstDeposit = snapshots[0].depositsUsd;
    const firstSp500 = snapshots[0].sp500Value;
    return snapshots.map((s) => {
      const sp500Indexed =
        firstSp500 && firstSp500 > 0 && s.sp500Value
          ? (s.sp500Value / firstSp500) * firstDeposit
          : null;
      return {
        month: formatMonthShort(s.yearMonth),
        portfolio: s.portfolioValue,
        depositos: s.depositsUsd,
        sp500: sp500Indexed,
        gananciaUsd: s.portfolioValue - s.depositsUsd,
        gananciaPct: s.depositsUsd > 0
          ? ((s.portfolioValue - s.depositsUsd) / s.depositsUsd) * 100
          : 0,
      };
    });
  }, [snapshots]);

  const gainData = useMemo(() => {
    return snapshots.map((s, i) => {
      const prevNetWorth = i === 0 ? 0 : snapshots[i - 1].portfolioValue - snapshots[i - 1].depositsUsd;
      const currNetWorth = s.portfolioValue - s.depositsUsd;
      const delta = currNetWorth - prevNetWorth;
      return {
        month: formatMonthShort(s.yearMonth),
        gain: delta,
      };
    });
  }, [snapshots]);

  if (snapshots.length < 2) return null;

  return (
    <div className="space-y-4">
      {/* Chart 1: Portfolio Evolution */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-1">EVOLUCIÓN DEL PORTFOLIO</h3>
        <p className="text-xs text-gray-500 mb-3">S&P500 indexado al primer depósito para comparación relativa</p>
        <div ref={c1.ref} style={{ width: "100%" }}>
          {c1.width > 0 && (
            <LineChart width={c1.width} height={280} data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" tick={axisTick} />
              <YAxis tick={axisTick} tickFormatter={tickFmtUsd} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = evolutionData.find((e) => e.month === label);
                  return (
                    <div style={{ ...tooltipStyle, padding: "10px 14px", fontSize: 12 }}>
                      <p style={{ color: "#d1d5db", fontWeight: 600, marginBottom: 6 }}>{label}</p>
                      {payload.map((p) => (
                        <div key={p.dataKey as string} style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 3 }}>
                          <span style={{ color: p.color }}>
                            {p.dataKey === "portfolio" ? "Portfolio" : p.dataKey === "depositos" ? "Depósitos" : "S&P500"}
                          </span>
                          <strong style={{ color: "#e5e7eb" }}>{fmtUsd(Number(p.value))}</strong>
                        </div>
                      ))}
                      {d && (
                        <div style={{ borderTop: "1px solid #374151", paddingTop: 6, marginTop: 4, display: "flex", justifyContent: "space-between", gap: 16 }}>
                          <span style={{ color: "#6b7280" }}>Ganancia</span>
                          <strong style={{ color: d.gananciaUsd >= 0 ? "#22c55e" : "#ef4444" }}>
                            {d.gananciaUsd >= 0 ? "+" : ""}{fmtUsd(d.gananciaUsd)} ({d.gananciaPct >= 0 ? "+" : ""}{d.gananciaPct.toFixed(1)}%)
                          </strong>
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <Legend
                formatter={(value) =>
                  value === "portfolio" ? "Portfolio" : value === "depositos" ? "Depósitos" : "S&P500"
                }
              />
              <Line type="monotone" dataKey="portfolio" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: "#3b82f6" }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="depositos" stroke="#6b7280" strokeWidth={2} strokeDasharray="8 4" dot={false} />
              <Line type="monotone" dataKey="sp500" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />
            </LineChart>
          )}
        </div>
      </div>

      {/* Chart 2: Monthly Gain Bars */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-1">GANANCIA MENSUAL</h3>
        <p className="text-xs text-gray-500 mb-3">Variación del patrimonio neto (excluye nuevos depósitos)</p>
        <div ref={c2.ref} style={{ width: "100%" }}>
          {c2.width > 0 && (
            <BarChart width={c2.width} height={220} data={gainData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" tick={axisTick} />
              <YAxis tick={axisTick} tickFormatter={(v) => `${v >= 0 ? "+" : ""}${tickFmtUsd(v)}`} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={labelStyle}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => {
                  const v = Number(value ?? 0);
                  return [`${v >= 0 ? "+" : ""}${fmtUsd(v)}`, "Ganancia"] as [string, string];
                }}
              />
              <ReferenceLine y={0} stroke="#6b7280" strokeWidth={1} />
              <Bar dataKey="gain" radius={[3, 3, 0, 0]}>
                {gainData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.gain >= 0 ? "#22c55e" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          )}
        </div>
      </div>
    </div>
  );
}
