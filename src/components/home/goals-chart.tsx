"use client";

import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, ReferenceLine } from "recharts";
import { projectToGoal, BIRTH_YEAR, GOAL, type Scenario } from "@/lib/goals";
import type { CurrentWealth, WealthSnapshot } from "@/lib/wealth-data";
import { Panel, BTN_STYLE } from "./panel";
import { fmtUsd, fmtK } from "./format";

const AXIS_TICK = { fill: "#4a5159", fontSize: 10, fontFamily: "var(--font-jetbrains, monospace)" };
const TOOLTIP_STYLE = {
  backgroundColor: "#0a0e0d",
  border: "1px solid #2a323b",
  borderRadius: 0,
  fontFamily: "var(--font-jetbrains, monospace)",
  fontSize: 11,
  color: "#d4d6d9",
};
const REAL_COLOR = "#2bb673";

interface Props {
  scenarios: Scenario[];
  snapshots: WealthSnapshot[];
  today: CurrentWealth;
}

export function GoalsChart({ scenarios, snapshots, today }: Props) {
  const [log, setLog] = useState(true);

  const series = useMemo(
    () =>
      scenarios
        .filter((s) => s.visible)
        .map((s) => ({
          s,
          data: projectToGoal(s)
            .map((p) => ({ t: Date.parse(p.date), value: p.value }))
            .filter((p) => !log || p.value > 0), // log scale can't plot <= 0
        })),
    [scenarios, log]
  );

  const real = useMemo(
    () =>
      [
        ...snapshots.map((s) => ({ t: Date.parse(s.date), value: s.total })),
        { t: Date.parse(today.date), value: today.total },
      ].sort((a, b) => a.t - b.t),
    [snapshots, today]
  );

  const ticks = useMemo(() => {
    const all = [...real.map((p) => p.t), ...series.flatMap((x) => x.data.map((p) => p.t))];
    const minY = new Date(Math.min(...all)).getUTCFullYear();
    const maxY = new Date(Math.max(...all)).getUTCFullYear();
    const out: number[] = [];
    for (let y = minY; y <= maxY; y += 2) out.push(Date.UTC(y, 2, 1));
    return out;
  }, [real, series]);

  return (
    <Panel
      title="OBJETIVOS VS REAL"
      right={
        <button onClick={() => setLog((l) => !l)} style={{ ...BTN_STYLE, color: log ? "var(--accent)" : "var(--text-dim)" }}>
          {log ? "ESCALA LOG" : "ESCALA LINEAL"}
        </button>
      }
    >
      <div style={{ padding: "12px 8px 4px", height: 340 }} data-money>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
            <CartesianGrid stroke="#1f262e" vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              ticks={ticks}
              tickFormatter={(t: number) => {
                const y = new Date(t).getUTCFullYear();
                return `${y} · ${y - BIRTH_YEAR}`;
              }}
              tick={AXIS_TICK}
              stroke="#2a323b"
              allowDuplicatedCategory={false}
            />
            <YAxis
              type="number"
              scale={log ? "log" : "linear"}
              domain={log ? ["auto", "auto"] : [0, "auto"]}
              allowDataOverflow
              tickFormatter={fmtK}
              tick={AXIS_TICK}
              stroke="#2a323b"
              width={56}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelFormatter={(t) => new Date(Number(t)).toISOString().slice(0, 10)}
              formatter={(v) => fmtUsd(Number(v))}
            />
            {series.map(({ s, data }) => (
              <Line
                key={s.id}
                data={data}
                dataKey="value"
                name={s.name}
                stroke={s.color}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                isAnimationActive={false}
              />
            ))}
            <Line
              data={real}
              dataKey="value"
              name="Real"
              stroke={REAL_COLOR}
              strokeWidth={2.5}
              dot={{ r: 3, fill: REAL_COLOR }}
              isAnimationActive={false}
            />
            <ReferenceLine
              y={GOAL}
              stroke="var(--accent)"
              strokeDasharray="6 4"
              label={{ value: "META $1M", position: "insideTopLeft", fill: "#e8a317", fontSize: 10, fontFamily: "var(--font-jetbrains, monospace)" }}
            />
            <ReferenceDot
              x={Date.parse(today.date)}
              y={today.total}
              r={6}
              fill={REAL_COLOR}
              stroke="#0a0e0d"
              strokeWidth={2}
              label={{ value: "HOY", position: "top", fill: REAL_COLOR, fontSize: 10, fontFamily: "var(--font-jetbrains, monospace)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, padding: "6px 14px 12px", fontSize: 10, color: "var(--text-dim)" }}>
        <Legend color={REAL_COLOR} label="REAL" solid />
        {series.map(({ s }) => (
          <Legend key={s.id} color={s.color} label={s.name} />
        ))}
      </div>
    </Panel>
  );
}

function Legend({ color, label, solid }: { color: string; label: string; solid?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 16, borderTop: `2px ${solid ? "solid" : "dashed"} ${color}`, display: "inline-block" }} />
      {label}
    </span>
  );
}
