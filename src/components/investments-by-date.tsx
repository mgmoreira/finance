"use client";

import { InvestmentByDate } from "@/lib/calculations";
import { formatUsd, formatDate, formatMonth } from "@/lib/format";

interface Props {
  byDate: InvestmentByDate[];
  byMonth: { month: string; totalUsd: number }[];
}

const mono: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains, monospace)",
};

export function InvestmentsByDate({ byDate, byMonth }: Props) {
  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
      {/* Panel title */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span
          style={{
            ...mono,
            color: "var(--accent)",
            fontSize: 10,
            letterSpacing: 1,
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          APORTES POR FECHA
        </span>
        {/* Monthly chips */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {byMonth.map((m) => (
            <span
              key={m.month}
              style={{
                ...mono,
                fontSize: 10,
                color: "var(--text-dim)",
                background: "transparent",
                border: "1px solid var(--border)",
                padding: "2px 8px",
                whiteSpace: "nowrap",
              }}
            >
              {formatMonth(m.month)}{" "}
              <span style={{ color: "var(--accent)" }} data-money>
                {formatUsd(m.totalUsd)}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", maxHeight: 280, overflowY: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            ...mono,
            fontSize: 11,
            fontVariantNumeric: "tabular-nums",
            color: "var(--text)",
          }}
        >
          <thead style={{ position: "sticky", top: 0, background: "var(--panel)" }}>
            <tr>
              {["FECHA", "TOTAL USD", "ACUMULADO", "TICKERS"].map((h, i) => (
                <th
                  key={h}
                  style={{
                    textAlign: i === 0 || i === 3 ? "left" : "right",
                    padding: "7px 12px",
                    borderBottom: "1px solid var(--border)",
                    fontWeight: 500,
                    color: "var(--text-mute)",
                    fontSize: 9.5,
                    letterSpacing: 0.8,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...byDate].reverse().map((row) => (
              <tr
                key={row.date}
                style={{ borderBottom: "1px solid var(--border)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--panel-alt)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <td style={{ padding: "6px 12px", color: "var(--text-dim)" }}>
                  {formatDate(row.date)}
                </td>
                <td style={{ padding: "6px 12px", textAlign: "right" }}>
                  <span data-money>{formatUsd(row.totalUsd)}</span>
                </td>
                <td style={{ padding: "6px 12px", textAlign: "right", color: "var(--text-dim)" }}>
                  <span data-money>{formatUsd(row.accumulated)}</span>
                </td>
                <td style={{ padding: "6px 12px", color: "var(--text-mute)", fontSize: 10 }}>
                  {row.tickers.join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
