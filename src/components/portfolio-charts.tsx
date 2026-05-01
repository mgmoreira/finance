"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
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

const GRID_COLOR = "#1f262e";
const AXIS_TICK = { fill: "#4a5159", fontSize: 10, fontFamily: "var(--font-jetbrains, monospace)" };
const TOOLTIP_STYLE = {
  backgroundColor: "#0a0e0d",
  border: "1px solid #2a323b",
  borderRadius: 0,
  fontFamily: "var(--font-jetbrains, monospace)",
  fontSize: 11,
  color: "#d4d6d9",
};
const LABEL_STYLE = { color: "#7a8189" };

function PanelWrapper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
          fontFamily: "var(--font-jetbrains, monospace)",
          color: "var(--accent)",
          fontSize: 10,
          letterSpacing: 1,
          fontWeight: 600,
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

export function PortfolioCharts({ snapshots }: Props) {
  const evolutionData = useMemo(() => {
    if (snapshots.length === 0) return [];
    const first = snapshots[0];
    let spyShares =
      first.sp500Value && first.sp500Value > 0
        ? first.portfolioValue / first.sp500Value
        : 0;
    let cumulativeDeposits = first.portfolioValue;
    return snapshots.map((s, i) => {
      if (i > 0) {
        cumulativeDeposits += s.depositsUsd;
        if (s.depositsUsd > 0 && s.sp500Value && s.sp500Value > 0) {
          spyShares += s.depositsUsd / s.sp500Value;
        }
      }
      const spyValue = s.sp500Value && spyShares > 0 ? spyShares * s.sp500Value : null;
      return {
        month: formatMonthShort(s.yearMonth),
        portfolio: s.portfolioValue,
        sp500: spyValue,
        depositos: cumulativeDeposits,
      };
    });
  }, [snapshots]);

  const gainData = useMemo(() => {
    return snapshots.map((s) => ({
      month: formatMonthShort(s.yearMonth),
      gainPct: s.gainPct,
      gainUsd: s.gainUsd,
    }));
  }, [snapshots]);

  if (snapshots.length < 2) return null;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Evolution chart */}
      <PanelWrapper title="MI CARTERA VS S&P 500 · mismo dinero cada mes">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={evolutionData}>
            <CartesianGrid strokeDasharray="2 3" stroke={GRID_COLOR} />
            <XAxis dataKey="month" tick={AXIS_TICK} />
            <YAxis tick={AXIS_TICK} tickFormatter={tickFmtUsd} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={LABEL_STYLE}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = evolutionData.find((e) => e.month === label);
                if (!d) return null;
                const portfolioGain = d.portfolio - d.depositos;
                const spyGain = d.sp500 != null ? d.sp500 - d.depositos : null;
                const diff = d.sp500 != null ? d.portfolio - d.sp500 : null;
                return (
                  <div style={{ ...TOOLTIP_STYLE, padding: "8px 12px" }}>
                    <p style={{ color: "#d4d6d9", fontWeight: 600, marginBottom: 6, margin: "0 0 6px" }}>{label}</p>
                    <Row label="Mi cartera" value={fmtUsd(d.portfolio)} color="#2bb673" />
                    {d.sp500 != null && <Row label="S&P500" value={fmtUsd(d.sp500)} color="#4a9eff" />}
                    <Row label="Invertido" value={fmtUsd(d.depositos)} color="#4a5159" />
                    <div style={{ borderTop: "1px solid #1f262e", paddingTop: 5, marginTop: 5 }}>
                      <Row
                        label="Gan. cartera"
                        value={(portfolioGain >= 0 ? "+" : "") + fmtUsd(portfolioGain)}
                        color={portfolioGain >= 0 ? "#2bb673" : "#e74c3c"}
                      />
                      {spyGain != null && (
                        <Row
                          label="Gan. S&P500"
                          value={(spyGain >= 0 ? "+" : "") + fmtUsd(spyGain)}
                          color={spyGain >= 0 ? "#2bb673" : "#e74c3c"}
                        />
                      )}
                      {diff != null && (
                        <Row
                          label="Ventaja"
                          value={(diff >= 0 ? "+" : "") + fmtUsd(diff)}
                          color={diff >= 0 ? "#2bb673" : "#e74c3c"}
                        />
                      )}
                    </div>
                  </div>
                );
              }}
            />
            <Line type="monotone" dataKey="depositos" stroke="#2a323b" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
            <Line type="monotone" dataKey="portfolio" stroke="#2bb673" strokeWidth={2} dot={{ r: 3, fill: "#2bb673" }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="sp500" stroke="#4a9eff" strokeWidth={1.8} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </PanelWrapper>

      {/* Monthly gain bars */}
      <PanelWrapper title="GANANCIA MENSUAL · % portfolio">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={gainData}>
            <CartesianGrid strokeDasharray="2 3" stroke={GRID_COLOR} />
            <XAxis dataKey="month" tick={AXIS_TICK} />
            <YAxis
              tick={AXIS_TICK}
              tickFormatter={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={LABEL_STYLE}
              itemStyle={{ color: "#d4d6d9" }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, _name: any, props: any) => {
                const pct = Number(value ?? 0);
                const usd = props?.payload?.gainUsd ?? 0;
                return [
                  `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}% (${pct >= 0 ? "+" : ""}${fmtUsd(usd)})`,
                  "Ganancia",
                ] as [string, string];
              }}
            />
            <ReferenceLine y={0} stroke="#2a323b" strokeWidth={1} />
            <Bar
              dataKey="gainPct"
              isAnimationActive={false}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              shape={(props: any) => {
                const { x, y, width, height, value } = props;
                const color = Number(value) >= 0 ? "#2bb673" : "#e74c3c";
                const barY = height < 0 ? y + height : y;
                return (
                  <rect
                    x={x + 1}
                    y={barY}
                    width={Math.max(width - 2, 1)}
                    height={Math.abs(height)}
                    fill={color}
                  />
                );
              }}
            >
              {gainData.map((d, i) => (
                <Cell key={i} fill={d.gainPct >= 0 ? "#2bb673" : "#e74c3c"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </PanelWrapper>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 2 }}>
      <span style={{ color: "#7a8189" }}>{label}</span>
      <strong style={{ color }}>{value}</strong>
    </div>
  );
}
