"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { capitalForIncome, type DividendSummary, type TickerDividend } from "@/lib/dividends";

const MONO = "var(--font-jetbrains, monospace)";
const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const usd = (v: number, d = 0) => "$" + v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const ddmm = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
const monthLabel = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(2, 4)}`;

const TH: React.CSSProperties = { padding: "6px 10px", borderBottom: "1px solid var(--border)", fontWeight: 500, color: "var(--text-mute)", fontSize: 9.5, letterSpacing: 0.8, textAlign: "right", whiteSpace: "nowrap" };
const TD: React.CSSProperties = { padding: "6px 10px", textAlign: "right", whiteSpace: "nowrap" };
const LABEL: React.CSSProperties = { fontSize: 9.5, color: "var(--text-dim)", letterSpacing: 0.8 };
const INPUT: React.CSSProperties = { background: "#1a2030", border: "1px solid #2a3545", color: "var(--text)", fontSize: 11, padding: "3px 6px", fontFamily: MONO, outline: "none" };

export function DividendsPanel({ summary, stocksValue }: { summary: DividendSummary; stocksValue: number }) {
  const [goal, setGoal] = useState("12000");
  const goalNum = Number(goal);
  const needed = Number.isFinite(goalNum) && goalNum > 0 ? capitalForIncome(goalNum, summary.netYieldPct) : null;

  if (summary.tickers.length === 0) {
    return (
      <Section title="DIVIDENDOS">
        <div style={{ padding: 16, textAlign: "center", color: "var(--text-mute)", fontSize: 10, letterSpacing: 1 }}>
          SIN DATOS DE DIVIDENDOS · ACTUALIZÁ PRECIOS PARA CARGARLOS
        </div>
      </Section>
    );
  }

  return (
    <Section title={`DIVIDENDOS · ESTIMADOS · ${summary.tickers.length} ACCIONES`}>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
        <Kpi label="NETO PRÓX. 12 MESES" value={usd(summary.next12Net)} sub={`${summary.netYieldPct.toFixed(2)}% rendimiento neto`} accent />
        <Kpi label="BRUTO PRÓX. 12 MESES" value={usd(summary.next12Gross)} sub={`retención ${summary.next12Gross > 0 ? ((1 - summary.next12Net / summary.next12Gross) * 100).toFixed(0) : 0}%`} />
        <Kpi label="PROMEDIO MENSUAL NETO" value={usd(summary.next12Net / 12)} sub="próximos 12 meses" />
        <Kpi label="COBRADO ÚLT. 12 MESES" value={usd(summary.last12Net)} sub={<><span data-money>bruto {usd(summary.last12Gross)}</span> · estimado</>} />
      </div>

      {/* Monthly bars */}
      <div style={{ padding: "12px 8px 4px", height: 200 }} data-money>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={summary.byMonth.map((m) => ({ ...m, label: monthLabel(m.month) }))} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#1f262e" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#4a5159", fontSize: 10, fontFamily: MONO }} stroke="#2a323b" />
            <YAxis tickFormatter={(v: number) => usd(v)} tick={{ fill: "#4a5159", fontSize: 10, fontFamily: MONO }} stroke="#2a323b" width={48} />
            <Tooltip
              contentStyle={{ backgroundColor: "#0a0e0d", border: "1px solid #2a323b", borderRadius: 0, fontFamily: MONO, fontSize: 11, color: "#d4d6d9" }}
              formatter={(v) => [usd(Number(v), 2), "Neto"]}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />
            <Bar dataKey="net" fill="#2bb673" isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Goal calculator */}
      <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", fontSize: 11.5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={LABEL}>META DE INGRESO ANUAL NETO</span>
          <input style={{ ...INPUT, width: 100, textAlign: "right" }} inputMode="decimal" value={goal} onChange={(e) => setGoal(e.target.value)} />
          <span style={{ color: "var(--text-dim)" }}>= {Number.isFinite(goalNum) && goalNum > 0 ? usd(goalNum / 12) : "—"}/mes</span>
        </div>
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
          <div>
            <div style={LABEL}>CAPITAL NECESARIO · A TU {summary.netYieldPct.toFixed(2)}% NETO</div>
            <div style={{ fontWeight: 600 }} data-money>{needed != null ? usd(needed) : "—"}</div>
          </div>
          <div>
            <div style={LABEL}>TENÉS EN ACCIONES</div>
            <div data-money>{usd(stocksValue)}</div>
          </div>
          <div>
            <div style={LABEL}>TE FALTA SUMAR</div>
            <div style={{ fontWeight: 600, color: "var(--accent)" }} data-money>
              {needed != null ? (needed - stocksValue > 0 ? usd(needed - stocksValue) : "ALCANZADO ✓") : "—"}
            </div>
          </div>
          <div>
            <div style={LABEL}>CON OTRO RENDIMIENTO NETO</div>
            <div style={{ color: "var(--text-dim)", fontSize: 11 }} data-money>
              {[3, 5, 7].map((y) => `${y}%: ${Number.isFinite(goalNum) && goalNum > 0 ? usd(capitalForIncome(goalNum, y)!) : "—"}`).join(" · ")}
            </div>
          </div>
        </div>
      </div>

      {/* Per ticker */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, fontVariantNumeric: "tabular-nums" }}>
          <thead>
            <tr>
              <th style={{ ...TH, textAlign: "left" }}>TICKER</th>
              <th style={TH}>CEDEARS</th>
              <th style={TH}>DIV/ACC/AÑO</th>
              <th style={TH}>REND. BRUTO</th>
              <th style={TH}>RETENCIÓN</th>
              <th style={TH}>NETO 12M</th>
              <th style={TH}>% DEL TOTAL</th>
              <th style={TH}>PRÓXIMO PAGO</th>
            </tr>
          </thead>
          <tbody>
            {summary.tickers.map((t) => (
              <TickerRow key={`${t.ticker}-${t.withholdingPct}`} t={t} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Upcoming */}
      <div style={{ padding: "10px 14px 12px", borderTop: "1px solid var(--border)" }}>
        <div style={{ ...LABEL, marginBottom: 6 }}>PRÓXIMOS PAGOS</div>
        {summary.upcoming.slice(0, 10).map((p) => (
          <div key={`${p.ticker}-${p.exDate}`} style={{ display: "grid", gridTemplateColumns: "60px 60px 1fr auto", gap: 10, padding: "4px 0", borderBottom: "1px solid var(--border)", fontSize: 11 }}>
            <span style={{ color: "var(--text-dim)" }}>{ddmm(p.payDate)}</span>
            <span style={{ fontWeight: 600 }}>{p.ticker}</span>
            <span style={{ color: "var(--text-mute)", fontSize: 10 }}>
              {p.dateConfirmed ? "fecha confirmada" : "fecha estimada"}
              {p.amountEstimated ? " · monto estimado" : ""}
            </span>
            <span style={{ fontWeight: 600, color: "var(--up)" }} data-money>{usd(p.net, 2)}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function TickerRow({ t }: { t: TickerDividend }) {
  const router = useRouter();
  const [value, setValue] = useState(String(t.withholdingPct));
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (value === String(t.withholdingPct)) return;
    setError(null);
    const res = await fetch("/api/dividends/withholding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker: t.ticker, withholdingPct: value.trim() === "" ? null : value.replace(",", ".") }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Error");
      setValue(String(t.withholdingPct));
      return;
    }
    router.refresh();
  }

  return (
    <tr style={{ borderBottom: "1px solid var(--border)" }}>
      <td style={{ ...TD, textAlign: "left", fontWeight: 600 }}>{t.ticker}</td>
      <td style={{ ...TD, color: "var(--text-dim)" }}>{t.cedears.toLocaleString("en-US")}</td>
      <td style={{ ...TD, color: "var(--text-dim)" }}>{usd(t.annualPerShare, 2)}</td>
      <td style={TD}>{t.grossYieldPct.toFixed(2)}%</td>
      <td style={TD} title={error ?? "Retención efectiva (impuestos + costos). Vacío = default"}>
        <input
          style={{ ...INPUT, width: 44, textAlign: "right", borderColor: error ? "var(--down)" : "#2a3545" }}
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        />
        %
        {error && <div style={{ color: "var(--down)", fontSize: 9.5, whiteSpace: "normal" }}>{error}</div>}
      </td>
      <td style={{ ...TD, fontWeight: 600, color: "var(--up)" }}><span data-money>{usd(t.next12Net, 2)}</span></td>
      <td style={TD}>{t.sharePct.toFixed(1)}%</td>
      <td style={{ ...TD, color: "var(--text-dim)" }}>
        {t.next ? <>{ddmm(t.next.payDate)} · <span data-money>{usd(t.next.net, 2)}</span></> : "—"}
      </td>
    </tr>
  );
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub: React.ReactNode; accent?: boolean }) {
  return (
    <div>
      <div style={LABEL}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 500, marginTop: 2, color: accent ? "var(--up)" : "var(--text)" }} data-money>{value}</div>
      <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 1 }}>{sub}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border)", fontFamily: MONO, color: "var(--text)" }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", color: "var(--accent)", fontSize: 10, letterSpacing: 1, fontWeight: 600 }}>
        {title}
      </div>
      {children}
    </div>
  );
}
