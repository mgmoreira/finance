import type { CurrentWealth } from "@/lib/wealth-data";
import { fmtUsd } from "./format";

const CLASSES = [
  { key: "stocksUsd", label: "ACCIONES", color: "#4a9eff" },
  { key: "bondsUsd", label: "BONOS", color: "#a78bfa" },
  { key: "cryptoUsd", label: "CRYPTO", color: "#e8a317" },
  { key: "cashUsd", label: "CASH", color: "#2bb673" },
] as const;

export function WealthHeader({ today }: { today: CurrentWealth }) {
  const pct = (v: number) => (today.total > 0 ? (v / today.total) * 100 : 0);
  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--border)",
        padding: "14px 16px",
        fontFamily: "var(--font-jetbrains, monospace)",
      }}
    >
      <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: 1, fontWeight: 600 }}>PATRIMONIO TOTAL · HOY</div>
      <div style={{ fontSize: 32, fontWeight: 500, marginTop: 4, fontVariantNumeric: "tabular-nums" }} data-money>
        {fmtUsd(today.total)}
      </div>

      <div style={{ display: "flex", height: 8, marginTop: 12, background: "var(--border)" }}>
        {CLASSES.map((c) =>
          today[c.key] > 0 ? (
            <div key={c.key} style={{ width: `${pct(today[c.key])}%`, background: c.color }} title={`${c.label} ${pct(today[c.key]).toFixed(1)}%`} />
          ) : null
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 10,
          marginTop: 12,
          fontSize: 11,
        }}
      >
        {CLASSES.map((c) => (
          <div key={c.key}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9.5, color: "var(--text-dim)", letterSpacing: 0.8 }}>
              <span style={{ width: 8, height: 8, background: c.color, display: "inline-block" }} />
              {c.label}
            </div>
            <div style={{ marginTop: 3, fontVariantNumeric: "tabular-nums" }}>
              <span data-money>{fmtUsd(today[c.key])}</span>
              <span style={{ color: "var(--text-dim)", marginLeft: 6 }}>{pct(today[c.key]).toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
