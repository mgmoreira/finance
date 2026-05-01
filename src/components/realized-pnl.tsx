"use client";

import { useState } from "react";
import { RealizedPnlData } from "@/lib/calculations";

const mono: React.CSSProperties = { fontFamily: "var(--font-jetbrains, monospace)" };

function fmtUsd(v: number) {
  return "$" + Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtPrice(v: number) {
  return "$" + v.toFixed(3);
}

function fmtPct(v: number) {
  return (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
}

function fmtGain(v: number) {
  return (v >= 0 ? "+" : "−") + fmtUsd(v);
}

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  const names = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return `${day} ${names[parseInt(m) - 1]} ${y.slice(2)}`;
}

export function RealizedPnl({ data }: { data: RealizedPnlData }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (data.allSells.length === 0) return null;

  const totalUp = data.totalGainUsd >= 0;

  function toggle(ticker: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  }

  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
      {/* Header */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ ...mono, color: "var(--accent)", fontSize: 10, letterSpacing: 1, fontWeight: 600, textTransform: "uppercase" }}>
          P&L REALIZADO · {data.allSells.length} {data.allSells.length === 1 ? "venta" : "ventas"}
        </span>
        <span style={{ ...mono, fontSize: 13, fontWeight: 600, color: totalUp ? "var(--up)" : "var(--down)", fontVariantNumeric: "tabular-nums" }}>
          {fmtGain(data.totalGainUsd)}
        </span>
      </div>

      {/* Per-ticker rows */}
      <div>
        {data.byTicker.map((t) => {
          const up = t.totalGainUsd >= 0;
          const isOpen = expanded.has(t.ticker);
          return (
            <div key={t.ticker}>
              {/* Ticker summary row */}
              <div
                onClick={() => t.sells.length > 1 && toggle(t.ticker)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px 90px 1fr 120px 110px 110px 24px",
                  alignItems: "center",
                  padding: "9px 14px",
                  borderBottom: "1px solid var(--border)",
                  cursor: t.sells.length > 1 ? "pointer" : "default",
                  gap: 8,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--panel-alt)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {/* Expand toggle */}
                <span style={{ ...mono, fontSize: 10, color: "var(--text-mute)", textAlign: "center" }}>
                  {t.sells.length > 1 ? (isOpen ? "▾" : "▸") : ""}
                </span>

                {/* Ticker + name */}
                <div>
                  <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{t.ticker}</div>
                  <div style={{ ...mono, fontSize: 9, color: "var(--text-mute)", marginTop: 1 }}>
                    {t.sells.length} {t.sells.length === 1 ? "venta" : "ventas"}
                  </div>
                </div>

                {/* Name */}
                <div style={{ ...mono, fontSize: 10, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.name}
                </div>

                {/* Cost vs received */}
                <div style={{ textAlign: "right" }}>
                  <div style={{ ...mono, fontSize: 9, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: 0.5 }}>Costo base</div>
                  <div style={{ ...mono, fontSize: 11, color: "var(--text-dim)", fontVariantNumeric: "tabular-nums" }} data-money>
                    {fmtUsd(t.totalCostUsd)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ ...mono, fontSize: 9, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: 0.5 }}>Recibido</div>
                  <div style={{ ...mono, fontSize: 11, color: "var(--text-dim)", fontVariantNumeric: "tabular-nums" }} data-money>
                    {fmtUsd(t.totalReceivedUsd)}
                  </div>
                </div>

                {/* Gain */}
                <div style={{ textAlign: "right" }}>
                  <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: up ? "var(--up)" : "var(--down)", fontVariantNumeric: "tabular-nums" }} data-money>
                    {fmtGain(t.totalGainUsd)}
                  </div>
                  <div style={{ ...mono, fontSize: 10, color: up ? "var(--up)" : "var(--down)", marginTop: 1 }}>
                    {fmtPct(t.totalGainPct)}
                  </div>
                </div>

                {/* Arrow */}
                <span style={{ ...mono, fontSize: 11, color: "var(--text-mute)", textAlign: "right" }}>
                  {t.sells.length > 1 ? "" : ""}
                </span>
              </div>

              {/* Individual sell events (expanded) */}
              {isOpen && (
                <div style={{ background: "var(--bg)" }}>
                  {/* Sub-header */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "32px 110px 70px 110px 110px 110px 24px",
                      padding: "5px 14px",
                      borderBottom: "1px solid var(--border)",
                      gap: 8,
                    }}
                  >
                    {["", "FECHA", "CANT", "COSTO PROM", "PRECIO VENTA", "GANANCIA", ""].map((h, i) => (
                      <div key={i} style={{ ...mono, fontSize: 8.5, color: "var(--text-mute)", letterSpacing: 0.8, textAlign: i >= 3 ? "right" : "left" }}>
                        {h}
                      </div>
                    ))}
                  </div>
                  {t.sells.map((sell) => {
                    const sellUp = sell.realizedGainUsd >= 0;
                    return (
                      <div
                        key={sell.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "32px 110px 70px 110px 110px 110px 24px",
                          padding: "7px 14px",
                          borderBottom: "1px solid var(--border)",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <span />
                        <span style={{ ...mono, fontSize: 10.5, color: "var(--text-dim)" }}>{formatDate(sell.date)}</span>
                        <span style={{ ...mono, fontSize: 10.5, color: "var(--text-dim)" }}>{sell.quantity.toLocaleString("en-US")}</span>
                        <span style={{ ...mono, fontSize: 10.5, color: "var(--text-dim)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          {fmtPrice(sell.avgCostUsd)}
                        </span>
                        <span style={{ ...mono, fontSize: 10.5, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          {fmtPrice(sell.sellPriceUsd)}
                        </span>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ ...mono, fontSize: 11, fontWeight: 600, color: sellUp ? "var(--up)" : "var(--down)", fontVariantNumeric: "tabular-nums" }} data-money>
                            {fmtGain(sell.realizedGainUsd)}
                          </div>
                          <div style={{ ...mono, fontSize: 9.5, color: sellUp ? "var(--up)" : "var(--down)" }}>
                            {fmtPct(sell.realizedGainPct)}
                          </div>
                        </div>
                        <span />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Single sell: show detail inline without expand */}
              {!isOpen && t.sells.length === 1 && (() => {
                const sell = t.sells[0];
                return (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "32px 90px 1fr 120px 110px 110px 24px",
                      padding: "4px 14px 8px",
                      gap: 8,
                      alignItems: "center",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <span />
                    <span style={{ ...mono, fontSize: 9.5, color: "var(--text-mute)" }}>{formatDate(sell.date)}</span>
                    <span style={{ ...mono, fontSize: 9.5, color: "var(--text-mute)" }}>{sell.quantity.toLocaleString("en-US")} u</span>
                    <span style={{ ...mono, fontSize: 9.5, color: "var(--text-mute)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      costo {fmtPrice(sell.avgCostUsd)}
                    </span>
                    <span style={{ ...mono, fontSize: 9.5, color: "var(--text-mute)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      venta {fmtPrice(sell.sellPriceUsd)}
                    </span>
                    <span />
                    <span />
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
