"use client";

import { useState, useMemo } from "react";
import { Position, TransactionRow } from "@/lib/calculations";
import { TickerDrawer } from "./ticker-drawer";
import { NewOperationModal } from "./new-operation-modal";
import type { TickerDividend } from "@/lib/dividends";

type SortKey =
  | "ticker"
  | "quantity"
  | "avgPriceUsd"
  | "currentPriceUsd"
  | "avgStockPriceUsd"
  | "stockPriceUsd"
  | "invested"
  | "currentValue"
  | "pnl"
  | "pnlPct"
  | "portfolioPct";

interface Props {
  positions: Position[];
  transactions: TransactionRow[];
  speciesList: { ticker: string; name: string }[];
  dividends?: TickerDividend[];
}

const SECTORS = ["Todos", "TECNOLOGIA", "ENERGIA", "SALUD", "E-COMMERCE", "MINERIA", "CONSUMO", "AGRO", "ETF"];

function fmtUsd(v: number) {
  return "$" + v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtPrice(v: number) {
  return v.toFixed(2);
}

function fmtUsPrice(v: number) {
  return v > 0 ? v.toFixed(2) : "—";
}

export function PositionsTable({ positions, transactions, speciesList, dividends }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("portfolioPct");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [filter, setFilter] = useState("Todos");
  const [selected, setSelected] = useState<Position | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalDefaults, setModalDefaults] = useState<{ type: "BUY" | "SELL"; ticker: string; quantity?: number } | null>(null);

  const maxPct = useMemo(() => Math.max(...positions.map((p) => p.portfolioPct), 1), [positions]);

  const rows = useMemo(() => {
    return positions
      .filter((p) => filter === "Todos" || p.sector === filter)
      .sort((a, b) => {
        const av = a[sortKey] as number;
        const bv = b[sortKey] as number;
        return (av - bv) * sortDir;
      });
  }, [positions, filter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === -1 ? 1 : -1));
    } else {
      setSortKey(key);
      setSortDir(-1);
    }
  }

  const thStyle = (key: SortKey): React.CSSProperties => ({
    padding: "8px 12px",
    borderBottom: "1px solid var(--border)",
    fontWeight: 500,
    cursor: "pointer",
    color: sortKey === key ? "var(--accent)" : "var(--text-mute)",
    userSelect: "none",
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    textAlign: "right",
    whiteSpace: "nowrap",
    fontFamily: "var(--font-jetbrains, monospace)",
  });

  const thLeftStyle = (key: SortKey): React.CSSProperties => ({
    ...thStyle(key),
    textAlign: "left",
  });

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === -1 ? " ↓" : " ↑") : "";

  const availableSectors = useMemo(
    () => SECTORS.filter((s) => s === "Todos" || positions.some((p) => p.sector === s)),
    [positions]
  );

  return (
    <>
      {/* Panel */}
      <div style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
        {/* Panel header */}
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
              fontFamily: "var(--font-jetbrains, monospace)",
              color: "var(--accent)",
              fontSize: 10,
              letterSpacing: 1,
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            POSICIONES · {rows.length}
          </span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {availableSectors.map((s) => (
              <FilterChip
                key={s}
                label={s === "Todos" ? "ALL" : s.slice(0, 6)}
                active={filter === s}
                onClick={() => setFilter(s)}
              />
            ))}
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "var(--font-jetbrains, monospace)",
              fontSize: 11.5,
              fontVariantNumeric: "tabular-nums",
              color: "var(--text)",
            }}
          >
            <thead>
              <tr>
                <th style={thLeftStyle("ticker")}>
                  Ticker{sortIndicator("ticker")}
                </th>
                <th
                  style={{
                    ...thLeftStyle("ticker"),
                    cursor: "default",
                    color: "var(--text-mute)",
                  }}
                >
                  Sector
                </th>
                <th style={thStyle("quantity")} onClick={() => toggleSort("quantity")}>
                  Cant{sortIndicator("quantity")}
                </th>
                <th style={thStyle("avgPriceUsd")} onClick={() => toggleSort("avgPriceUsd")}>
                  Prom{sortIndicator("avgPriceUsd")}
                </th>
                <th style={thStyle("currentPriceUsd")} onClick={() => toggleSort("currentPriceUsd")}>
                  Actual{sortIndicator("currentPriceUsd")}
                </th>
                <th
                  style={{ ...thStyle("avgStockPriceUsd"), color: sortKey === "avgStockPriceUsd" ? "var(--accent)" : "var(--blue)" }}
                  onClick={() => toggleSort("avgStockPriceUsd")}
                >
                  Prom EEUU{sortIndicator("avgStockPriceUsd")}
                </th>
                <th
                  style={{ ...thStyle("stockPriceUsd"), color: sortKey === "stockPriceUsd" ? "var(--accent)" : "var(--blue)" }}
                  onClick={() => toggleSort("stockPriceUsd")}
                >
                  Act EEUU{sortIndicator("stockPriceUsd")}
                </th>
                <th style={thStyle("invested")} onClick={() => toggleSort("invested")}>
                  Invertido{sortIndicator("invested")}
                </th>
                <th style={thStyle("currentValue")} onClick={() => toggleSort("currentValue")}>
                  Valor{sortIndicator("currentValue")}
                </th>
                <th style={thStyle("pnl")} onClick={() => toggleSort("pnl")}>
                  P/L ${sortIndicator("pnl")}
                </th>
                <th style={thStyle("pnlPct")} onClick={() => toggleSort("pnlPct")}>
                  P/L %{sortIndicator("pnlPct")}
                </th>
                <th style={thStyle("portfolioPct")} onClick={() => toggleSort("portfolioPct")}>
                  Peso{sortIndicator("portfolioPct")}
                </th>
                <th style={{ borderBottom: "1px solid var(--border)", width: 20 }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((pos) => {
                const up = pos.pnl >= 0;
                return (
                  <tr
                    key={pos.ticker}
                    onClick={() => setSelected(pos)}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--panel-alt)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>{pos.ticker}</td>
                    <td
                      style={{
                        padding: "8px 12px",
                        color: "var(--text-dim)",
                        fontSize: 10,
                      }}
                    >
                      {pos.sector} · {pos.country}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--text-dim)" }}>
                      {pos.quantity.toLocaleString("en-US")}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--text-dim)" }}>
                      {fmtPrice(pos.avgPriceUsd)}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>
                      {fmtPrice(pos.currentPriceUsd)}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--blue)", opacity: 0.75 }}>
                      {fmtUsPrice(pos.avgStockPriceUsd)}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--blue)" }}>
                      {fmtUsPrice(pos.stockPriceUsd)}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--text-dim)" }}>
                      <span data-money>{fmtUsd(pos.invested)}</span>
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>
                      <span data-money>{fmtUsd(pos.currentValue)}</span>
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        textAlign: "right",
                        color: up ? "var(--up)" : "var(--down)",
                      }}
                    >
                      <span data-money>
                        {up ? "+" : "−"}{fmtUsd(Math.abs(pos.pnl))}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        textAlign: "right",
                        color: up ? "var(--up)" : "var(--down)",
                        fontWeight: 600,
                      }}
                    >
                      {up ? "+" : ""}{pos.pnlPct.toFixed(2)}%
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <div
                          style={{
                            width: 36,
                            height: 4,
                            background: "var(--border)",
                            position: "relative",
                          }}
                        >
                          <div
                            style={{
                              position: "absolute",
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: `${Math.min((pos.portfolioPct / maxPct) * 100, 100)}%`,
                              background: "var(--accent)",
                            }}
                          />
                        </div>
                        <span style={{ minWidth: 36, textAlign: "right" }}>
                          {pos.portfolioPct.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "8px 12px", color: "var(--text-mute)" }}>›</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden">
          {rows.map((pos) => {
            const up = pos.pnl >= 0;
            return (
              <div
                key={pos.ticker}
                onClick={() => setSelected(pos)}
                style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid var(--border)",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 8,
                  fontFamily: "var(--font-jetbrains, monospace)",
                  fontSize: 11,
                  color: "var(--text)",
                  cursor: "pointer",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{pos.ticker}</div>
                  <div style={{ fontSize: 9.5, color: "var(--text-dim)", marginTop: 2 }}>
                    {pos.sector} · {pos.country} · {pos.quantity.toLocaleString("en-US")}u
                  </div>
                  {pos.stockPriceUsd > 0 && (
                    <div style={{ fontSize: 9.5, color: "var(--blue)", marginTop: 2 }}>
                      EEUU {fmtUsPrice(pos.avgStockPriceUsd)} → {fmtUsPrice(pos.stockPriceUsd)}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }} data-money>
                    {fmtUsd(pos.currentValue)}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: up ? "var(--up)" : "var(--down)",
                      fontWeight: 600,
                    }}
                  >
                    {up ? "+" : ""}{pos.pnlPct.toFixed(2)}% · {pos.portfolioPct.toFixed(1)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ticker drawer */}
      <TickerDrawer
        position={selected}
        transactions={transactions}
        dividend={selected ? dividends?.find((d) => d.ticker === selected.ticker) : undefined}
        onClose={() => setSelected(null)}
        onBuyTicker={(ticker) => { setSelected(null); setModalDefaults({ type: "BUY", ticker }); setShowModal(true); }}
        onSellTicker={(ticker) => {
          const pos = positions.find((p) => p.ticker === ticker);
          setSelected(null);
          setModalDefaults({ type: "SELL", ticker, quantity: pos?.quantity });
          setShowModal(true);
        }}
      />

      {showModal && (
        <NewOperationModal
          speciesList={speciesList}
          onClose={() => { setShowModal(false); setModalDefaults(null); }}
          defaultType={modalDefaults?.type}
          defaultTicker={modalDefaults?.ticker}
          defaultMaxQuantity={modalDefaults?.quantity}
        />
      )}
    </>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <span
      onClick={onClick}
      style={{
        fontSize: 10,
        color: active ? "var(--bg)" : "var(--text-dim)",
        background: active ? "var(--accent)" : "transparent",
        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
        padding: "2px 8px",
        cursor: "pointer",
        letterSpacing: 0.5,
        fontFamily: "var(--font-jetbrains, monospace)",
      }}
    >
      {label}
    </span>
  );
}
