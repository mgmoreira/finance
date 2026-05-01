"use client";

import { Position, TransactionRow } from "@/lib/calculations";
import { useEffect } from "react";

interface Props {
  position: Position | null;
  transactions: TransactionRow[];
  onClose: () => void;
  onBuyTicker?: (ticker: string) => void;
  onSellTicker?: (ticker: string) => void;
}

function fmtUsd(v: number) {
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtMoney(v: number) {
  return "$" + v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function TickerDrawer({ position, transactions, onClose, onBuyTicker, onSellTicker }: Props) {
  useEffect(() => {
    if (!position) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [position, onClose]);

  if (!position) return null;

  const up = position.pnl >= 0;
  const ops = transactions.filter((t) => t.ticker === position.ticker)
    .sort((a, b) => b.date.localeCompare(a.date));

  const varPrecioPct = position.avgPriceUsd > 0
    ? ((position.currentPriceUsd / position.avgPriceUsd) - 1) * 100
    : 0;

  const stats: [string, string][] = [
    ["Cantidad", position.quantity.toLocaleString("en-US")],
    ["Peso cartera", position.portfolioPct.toFixed(1) + "%"],
    ["Costo prom", fmtUsd(position.avgPriceUsd)],
    ["Precio actual", fmtUsd(position.currentPriceUsd)],
    ["Invertido", fmtMoney(position.invested)],
    ["Var precio", (varPrecioPct >= 0 ? "+" : "") + varPrecioPct.toFixed(2) + "%"],
    ["ATH (EEUU)", fmtUsd(position.ath)],
    ["Dist. ATH", (position.athDistance > 0 ? "-" : "+") + Math.abs(position.athDistance).toFixed(1) + "%"],
    ["Paridad", String(position.parity)],
    ["Precio ARS", "$" + position.priceArs.toLocaleString("es-AR", { maximumFractionDigits: 0 })],
    ...(position.dividendYield > 0
      ? [["Dividendo", position.dividendYield.toFixed(2) + "%"] as [string, string]]
      : []),
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 1000,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fb-drawer"
        style={{
          width: 460,
          maxWidth: "92%",
          height: "100%",
          background: "var(--panel)",
          color: "var(--text)",
          boxShadow: "-12px 0 40px rgba(0,0,0,0.5)",
          overflow: "auto",
          borderLeft: "1px solid var(--border-strong)",
          fontFamily: "var(--font-ui, system-ui, sans-serif)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--border-strong)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span
              style={{
                fontFamily: "var(--font-jetbrains, monospace)",
                fontSize: 22,
                fontWeight: 700,
                color: "var(--accent)",
              }}
            >
              {position.ticker}
            </span>
            <span
              style={{
                fontFamily: "var(--font-jetbrains, monospace)",
                fontSize: 10.5,
                color: "var(--text-dim)",
                letterSpacing: 0.6,
              }}
            >
              {position.sector} · {position.country}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 22,
              color: "var(--text-dim)",
              cursor: "pointer",
              padding: 4,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, overflow: "auto", flex: 1 }}>
          {/* Current value hero */}
          <div
            style={{
              fontFamily: "var(--font-jetbrains, monospace)",
              fontSize: 9.5,
              color: "var(--text-dim)",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            Valor actual
          </div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains, monospace)",
              fontSize: 32,
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
              marginTop: 4,
            }}
            data-money
          >
            {fmtMoney(position.currentValue)}
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 6,
              fontFamily: "var(--font-jetbrains, monospace)",
              fontSize: 12,
            }}
          >
            <span style={{ color: up ? "var(--up)" : "var(--down)", fontWeight: 600 }}>
              {up ? "↑" : "↓"} {up ? "+" : ""}{position.pnlPct.toFixed(2)}%
            </span>
            <span style={{ color: "var(--text-dim)" }} data-money>
              {up ? "+" : "−"}{fmtMoney(Math.abs(position.pnl))}
            </span>
          </div>

          {/* Stats grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginTop: 22,
              padding: "14px 0",
              borderTop: "1px solid var(--border)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {stats.map(([label, value]) => (
              <div key={label}>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains, monospace)",
                    fontSize: 9.5,
                    color: "var(--text-dim)",
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains, monospace)",
                    fontSize: 13,
                    fontVariantNumeric: "tabular-nums",
                    marginTop: 3,
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Mes actual */}
          <div
            style={{
              marginTop: 14,
              padding: "10px 0",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-jetbrains, monospace)",
                fontSize: 9.5,
                color: "var(--text-dim)",
                letterSpacing: 0.8,
                textTransform: "uppercase",
              }}
            >
              Cambio del mes
            </span>
            <span
              style={{
                fontFamily: "var(--font-jetbrains, monospace)",
                fontSize: 13,
                fontVariantNumeric: "tabular-nums",
                color: position.monthChangePct >= 0 ? "var(--up)" : "var(--down)",
                fontWeight: 600,
              }}
            >
              {position.monthChangePct >= 0 ? "+" : ""}{position.monthChangePct.toFixed(2)}%
            </span>
          </div>

          {/* Operations */}
          <div style={{ marginTop: 18 }}>
            <div
              style={{
                fontFamily: "var(--font-jetbrains, monospace)",
                fontSize: 10,
                color: "var(--accent)",
                letterSpacing: 1,
                fontWeight: 600,
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Operaciones
            </div>
            {ops.length === 0 ? (
              <div
                style={{
                  fontFamily: "var(--font-jetbrains, monospace)",
                  fontSize: 11,
                  color: "var(--text-mute)",
                }}
              >
                Sin operaciones cargadas.
              </div>
            ) : (
              <div>
                {ops.map((o, i) => (
                  <div
                    key={o.id}
                    style={{
                      padding: "7px 0",
                      borderBottom: i < ops.length - 1 ? "1px solid var(--border)" : "none",
                      display: "grid",
                      gridTemplateColumns: "80px 55px 1fr auto",
                      gap: 10,
                      fontFamily: "var(--font-jetbrains, monospace)",
                      fontSize: 11,
                      alignItems: "center",
                    }}
                  >
                    <span style={{ color: "var(--text-dim)" }}>{o.date}</span>
                    <span
                      style={{
                        color: o.type === "BUY" ? "var(--up)" : "var(--down)",
                        fontWeight: 600,
                        fontSize: 9.5,
                        letterSpacing: 0.4,
                      }}
                    >
                      {o.type === "BUY" ? "COMPRA" : "VENTA"}
                    </span>
                    <span style={{ color: "var(--text-dim)" }}>
                      {o.quantity} × {fmtUsd(o.priceUsd)}
                    </span>
                    <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }} data-money>
                      {fmtMoney(o.totalUsd)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            padding: "14px 20px",
            borderTop: "1px solid var(--border-strong)",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => { onSellTicker?.(position.ticker); onClose(); }}
            style={{
              padding: "10px 14px",
              border: "1px solid var(--down)",
              background: "rgba(231,76,60,0.1)",
              cursor: "pointer",
              color: "var(--down)",
              fontFamily: "var(--font-jetbrains, monospace)",
              fontSize: 11,
              letterSpacing: 0.8,
            }}
          >
            VENDER PARCIAL
          </button>
          <button
            onClick={() => { onBuyTicker?.(position.ticker); onClose(); }}
            style={{
              padding: "10px 14px",
              border: "none",
              background: "var(--accent)",
              color: "var(--bg)",
              cursor: "pointer",
              fontFamily: "var(--font-jetbrains, monospace)",
              fontSize: 11,
              letterSpacing: 0.8,
              fontWeight: 600,
            }}
          >
            + COMPRAR
          </button>
        </div>
      </div>
    </div>
  );
}
