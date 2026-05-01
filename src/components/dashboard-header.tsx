import { PortfolioSummary } from "@/lib/calculations";

function fmtUsd(v: number) {
  return "$" + v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtPct(v: number) {
  return (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
}

function computeSpyHypothetical(stats: PortfolioSummary["monthlyStats"]): number | null {
  if (stats.length === 0) return null;
  const first = stats[0];
  if (!first.sp500Value || first.sp500Value <= 0) return null;
  let spyShares = first.portfolioValue / first.sp500Value;
  for (let i = 1; i < stats.length; i++) {
    const s = stats[i];
    if (s.depositsUsd > 0 && s.sp500Value && s.sp500Value > 0) {
      spyShares += s.depositsUsd / s.sp500Value;
    }
  }
  const last = stats[stats.length - 1];
  if (!last.sp500Value) return null;
  return spyShares * last.sp500Value;
}

interface MetricCellProps {
  label: string;
  value: string;
  sub?: string;
  accentColor?: string;
  last?: boolean;
  dataMoney?: boolean;
}

function MetricCell({ label, value, sub, accentColor, last, dataMoney }: MetricCellProps) {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderRight: last ? "none" : "1px solid var(--border)",
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jetbrains, monospace)",
          fontSize: 9.5,
          color: "var(--text-dim)",
          letterSpacing: 1,
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains, monospace)",
          fontSize: 22,
          fontWeight: 500,
          color: accentColor || "var(--text)",
          fontVariantNumeric: "tabular-nums",
        }}
        {...(dataMoney ? { "data-money": true } : {})}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: "var(--font-jetbrains, monospace)",
            fontSize: 10.5,
            color: "var(--text-dim)",
            marginTop: 2,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

export function DashboardHeader({ summary }: { summary: PortfolioSummary }) {
  const gainColor = summary.totalGain >= 0 ? "var(--up)" : "var(--down)";

  const lastMonth = summary.monthlyStats[summary.monthlyStats.length - 1];
  const monthLabel = lastMonth
    ? (() => {
        const [y, mo] = lastMonth.yearMonth.split("-");
        const names = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        return `${names[parseInt(mo) - 1]}-${y.slice(2)}`;
      })()
    : "—";
  const monthGainPct = lastMonth?.gainPct ?? 0;
  const monthColor = monthGainPct >= 0 ? "var(--up)" : "var(--down)";

  const spyHypothetical = computeSpyHypothetical(summary.monthlyStats);
  const outperformUsd = spyHypothetical != null ? summary.totalValue - spyHypothetical : null;
  const outperformPct =
    spyHypothetical != null && spyHypothetical > 0
      ? ((summary.totalValue - spyHypothetical) / spyHypothetical) * 100
      : null;
  const outperformColor =
    outperformPct != null ? (outperformPct >= 0 ? "var(--up)" : "var(--down)") : "var(--text)";

  return (
    <>
      {/* Desktop metric strip */}
      <div
        className="hidden md:block"
        style={{
          background: "var(--panel)",
          borderBottom: "1px solid var(--border-strong)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr 1fr 1fr 1fr 1fr",
            maxWidth: 1600,
            margin: "0 auto",
          }}
        >
          <MetricCell
            label="Balance Total"
            value={fmtUsd(summary.totalValue)}
            sub={"P/L " + fmtUsd(summary.totalGain)}
            accentColor="var(--text)"
            dataMoney
          />
          <MetricCell
            label="Ganancia"
            value={fmtPct(summary.totalGainPct)}
            sub="vs costo base"
            accentColor={gainColor}
          />
          <MetricCell
            label="Aportado"
            value={fmtUsd(summary.totalInvested)}
            sub={`${summary.monthlyStats.length} meses`}
            dataMoney
          />
          <MetricCell
            label="Efectivo"
            value={fmtUsd(summary.cashBalanceUsd)}
            sub={
              summary.totalValue > 0
                ? ((summary.cashBalanceUsd / (summary.totalValue + summary.cashBalanceUsd)) * 100).toFixed(1) + "% del total"
                : "—"
            }
            dataMoney
          />
          <MetricCell
            label={`Mes (${monthLabel})`}
            value={lastMonth ? fmtPct(monthGainPct) : "—"}
            sub={"SPY " + (summary.sp500MonthChangePct >= 0 ? "+" : "") + summary.sp500MonthChangePct.toFixed(2) + "%"}
            accentColor={monthColor}
          />
          <MetricCell
            label="vs S&P 500"
            value={outperformPct != null ? fmtPct(outperformPct) : "—"}
            sub={
              outperformUsd != null
                ? (outperformUsd >= 0 ? "+" : "") + fmtUsd(outperformUsd)
                : "—"
            }
            accentColor={outperformColor}
            last
          />
        </div>
      </div>

      {/* Mobile hero card */}
      <div
        className="md:hidden"
        style={{
          background: "var(--panel)",
          borderBottom: "1px solid var(--border-strong)",
          padding: "14px 16px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains, monospace)",
            fontSize: 10,
            color: "var(--text-dim)",
            letterSpacing: 1,
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Balance Total
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains, monospace)",
            fontSize: 32,
            fontWeight: 500,
            color: "var(--text)",
            fontVariantNumeric: "tabular-nums",
          }}
          data-money
        >
          {fmtUsd(summary.totalValue)}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <span
            style={{
              fontFamily: "var(--font-jetbrains, monospace)",
              fontSize: 12,
              color: gainColor,
              fontWeight: 600,
            }}
          >
            {fmtPct(summary.totalGainPct)}
          </span>
          <span
            style={{
              fontFamily: "var(--font-jetbrains, monospace)",
              fontSize: 12,
              color: gainColor,
            }}
            data-money
          >
            {(summary.totalGain >= 0 ? "+" : "") + fmtUsd(summary.totalGain)}
          </span>
          <span style={{ color: "var(--text-mute)" }}>·</span>
          <span
            style={{
              fontFamily: "var(--font-jetbrains, monospace)",
              fontSize: 12,
              color: "var(--text-dim)",
            }}
          >
            Cash {fmtUsd(summary.cashBalanceUsd)}
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 1,
            marginTop: 12,
            background: "var(--border)",
          }}
        >
          <div style={{ background: "var(--panel)", padding: "8px 10px" }}>
            <div
              style={{
                fontFamily: "var(--font-jetbrains, monospace)",
                fontSize: 9,
                color: "var(--text-dim)",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Aportado
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains, monospace)",
                fontSize: 14,
                fontVariantNumeric: "tabular-nums",
                marginTop: 2,
              }}
              data-money
            >
              {fmtUsd(summary.totalInvested)}
            </div>
          </div>
          <div style={{ background: "var(--panel)", padding: "8px 10px" }}>
            <div
              style={{
                fontFamily: "var(--font-jetbrains, monospace)",
                fontSize: 9,
                color: "var(--text-dim)",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Mes ({monthLabel})
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains, monospace)",
                fontSize: 14,
                color: monthColor,
                fontVariantNumeric: "tabular-nums",
                marginTop: 2,
              }}
            >
              {lastMonth ? fmtPct(monthGainPct) : "—"}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
