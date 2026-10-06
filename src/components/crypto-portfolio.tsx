"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { CryptoSummary, CryptoPosition, CryptoMonthlySnapshot } from "@/lib/crypto-data";
import { HideToggle } from "@/components/hide-toggle";

const T1_CSS = `
.t1c-wrap { background: #0a0e13; min-height: 100vh; font-family: 'Courier New', Courier, monospace; color: #c8d4e0; font-size: 13px; }
.t1c-bar { position: sticky; top: 0; z-index: 20; background: #0a0e13; border-bottom: 2px solid #1e2530; }
.t1c-bar__inner { display: flex; align-items: stretch; max-width: 1600px; margin: 0 auto; flex-wrap: wrap; }
.t1c-bar__title { display: flex; align-items: center; color: #f0a500; font-weight: 700; font-size: 12px; letter-spacing: 0.15em; padding: 0 16px; border-right: 1px solid #1e2530; white-space: nowrap; }
.t1c-stats { display: flex; flex: 1; flex-wrap: wrap; }
.t1c-stat { padding: 8px 18px; border-right: 1px solid #1e2530; min-width: 120px; }
.t1c-stat__l { font-size: 10px; letter-spacing: 0.1em; color: #9aa5b1; display: block; margin-bottom: 3px; }
.t1c-stat__v { font-size: 17px; font-weight: 700; color: #c8d4e0; display: block; }
.t1c-stat.pos .t1c-stat__v { color: #00c853; }
.t1c-stat.neg .t1c-stat__v { color: #ff3b3b; }
.t1c-stat.neutral .t1c-stat__v { color: #c8d4e0; }
.t1c-bar__actions { display: flex; align-items: center; gap: 8px; padding: 0 12px; margin-left: auto; }
.t1c-ts { font-size: 10px; color: #6b7a8a; }
.t1c-body { max-width: 1600px; margin: 0 auto; padding: 14px 14px; display: grid; gap: 12px; }
.t1c-pn { background: #111519; border: 1px solid #1e2530; }
.t1c-pn__h { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 14px; border-bottom: 1px solid #1e2530; background: #0d1117; flex-wrap: wrap; }
.t1c-pn__h b { font-size: 11px; letter-spacing: 0.12em; color: #f0a500; }
.t1c-pn__h span { font-size: 10px; color: #9aa5b1; }
.t1c-tbl { width: 100%; border-collapse: collapse; }
.t1c-tbl th { padding: 6px 10px; font-size: 10px; letter-spacing: 0.08em; color: #9aa5b1; border-bottom: 1px solid #1e2530; text-align: right; white-space: nowrap; user-select: none; cursor: pointer; }
.t1c-tbl th.l { text-align: left; }
.t1c-tbl th:hover { color: #c8d4e0; }
.t1c-tbl td { padding: 6px 10px; border-bottom: 1px solid #131920; text-align: right; vertical-align: middle; font-size: 13px; }
.t1c-tbl td.l { text-align: left; }
.t1c-tbl tr:hover td { background: #161c24; }
.t1c-tbl tfoot td { border-top: 1px solid #1e2530; background: #0d1117; font-weight: 700; font-size: 12px; }
.t1c-btn { background: #1a2030; border: 1px solid #2a3545; color: #c8d4e0; font-size: 10px; letter-spacing: 0.08em; padding: 5px 14px; cursor: pointer; font-family: inherit; white-space: nowrap; }
.t1c-btn:hover { background: #243040; }
.t1c-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.t1c-inp { background: #1a2030; border: 1px solid #2a3545; color: #c8d4e0; font-size: 12px; padding: 4px 10px; font-family: inherit; outline: none; }
.t1c-inp:focus { border-color: #f0a500; }
.t1c-inp::placeholder { color: #6b7a8a; }
.t1c-up { color: #00c853; }
.t1c-down { color: #ff3b3b; }
.t1c-mute { color: #9aa5b1; }
.t1c-tk { font-weight: 700; font-size: 13px; }
.t1c-nm { font-size: 11px; color: #9aa5b1; }
.t1c-col-p { background: rgba(30,80,150,0.07); }
.t1c-col-v { background: rgba(0,100,50,0.07); }
.t1c-mbar { display: inline-block; height: 5px; vertical-align: middle; border-radius: 1px; }
.t1c-notes { color: #6b7a8a; font-size: 11px; line-height: 1.9; }
.t1c-qty { color: #b0bcc8; }

@media (max-width: 767px) {
  .t1c-wrap { font-size: 11px; }
  .t1c-bar { border-bottom-width: 1px; }
  .t1c-bar__inner { flex-direction: column; }
  .t1c-bar__title { border-right: none; border-bottom: 1px solid #1e2530; padding: 7px 12px; font-size: 11px; width: 100%; justify-content: flex-start; }
  .t1c-stats { width: 100%; }
  .t1c-stat { flex: 1; min-width: 0; padding: 7px 10px; }
  .t1c-stat__l { font-size: 9px; margin-bottom: 1px; }
  .t1c-stat__v { font-size: 13px; }
  .t1c-stat__v[data-money] span { font-size: 9px !important; margin-left: 3px !important; }
  .t1c-bar__actions { width: 100%; padding: 6px 12px; border-top: 1px solid #1e2530; gap: 6px; justify-content: flex-end; margin-left: 0; }
  .t1c-ts { font-size: 9px; }
  .t1c-body { padding: 10px; gap: 10px; }
  .t1c-pn__h { padding: 7px 10px; gap: 6px; }
  .t1c-pn__h b { font-size: 10px; }
  .t1c-pn__h span { font-size: 9px; }
  .t1c-tbl th { padding: 5px 7px; font-size: 9px; }
  .t1c-tbl td { padding: 5px 7px; font-size: 11px; }
  .t1c-tbl tfoot td { font-size: 10px; }
  .t1c-tk { font-size: 11px; }
  .t1c-nm { font-size: 9px; }
  .t1c-btn { font-size: 9px; padding: 4px 10px; }
  .t1c-inp { font-size: 11px; padding: 4px 8px; }
  .t1c-notes { font-size: 10px; line-height: 1.7; padding: 4px 4px 8px; }
}
`;

type SortKey = "ticker" | "quantity" | "entryPriceUsd" | "priceUsd" | "invested" | "currentValue" | "pnl" | "pnlPct" | "portfolioPct";

function fmtUsd(v: number, decimals = 2) {
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function fmtPrice(v: number) {
  if (v >= 1) return fmtUsd(v, 2);
  if (v >= 0.01) return fmtUsd(v, 4);
  return `$${v.toFixed(8)}`;
}

function fmtQty(v: number) {
  if (v >= 1_000_000) return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (v >= 1) return v.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return v.toFixed(6);
}

function fmtPct(v: number, sign = true) {
  return `${sign && v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

interface Props {
  summary: CryptoSummary;
  monthlySnapshots: CryptoMonthlySnapshot[];
}

export function CryptoPortfolio({ summary, monthlySnapshots }: Props) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("portfolioPct");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");

  async function refresh() {
    setRefreshing(true);
    await fetch("/api/crypto/refresh");
    router.refresh();
    setRefreshing(false);
  }

  async function backfill() {
    setBackfilling(true);
    await fetch("/api/crypto/snapshot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ months: 3 }) });
    router.refresh();
    setBackfilling(false);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  const sortIcon = (key: SortKey) => sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  const filtered = useMemo(() => {
    return summary.positions
      .filter((p) => p.ticker.toLowerCase().includes(search.toLowerCase()) || p.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const av = a[sortKey] as number | string | null;
        const bv = b[sortKey] as number | string | null;
        if (typeof av === "string" && typeof bv === "string") {
          return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
        }
        const an = (av ?? 0) as number;
        const bn = (bv ?? 0) as number;
        return sortDir === "asc" ? an - bn : bn - an;
      });
  }, [summary.positions, sortKey, sortDir, search]);

  const { totalValue, totalInvested, totalPnl, totalPnlPct, lastUpdated } = summary;

  // Monthly gains bar scaling
  const maxAbsChange = monthlySnapshots.length > 0
    ? Math.max(...monthlySnapshots.map((s) => Math.abs(s.changeUsd)), 1)
    : 1;

  return (
    <>
      <style>{T1_CSS}</style>
      <div className="t1c-wrap">

        {/* ── Sticky header bar ── */}
        <div className="t1c-bar">
          <div className="t1c-bar__inner">
            <div className="t1c-bar__title">CRYPTO · CARTERA</div>
            <div className="t1c-stats">
              <div className="t1c-stat neutral">
                <span className="t1c-stat__l">BALANCE</span>
                <span className="t1c-stat__v" data-money>{fmtUsd(totalValue)}</span>
              </div>
              <div className="t1c-stat neutral">
                <span className="t1c-stat__l">INVERTIDO</span>
                <span className="t1c-stat__v" data-money>{fmtUsd(totalInvested)}</span>
              </div>
              <div className={`t1c-stat ${totalPnl >= 0 ? "pos" : "neg"}`}>
                <span className="t1c-stat__l">P&amp;L TOTAL</span>
                <span className="t1c-stat__v" data-money>
                  {totalPnl >= 0 ? "+" : ""}{fmtUsd(totalPnl)}
                  <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 6 }}>({fmtPct(totalPnlPct)})</span>
                </span>
              </div>
            </div>
            <div className="t1c-bar__actions">
              {lastUpdated && (
                <span className="t1c-ts">
                  {new Date(lastUpdated).toLocaleTimeString("es-AR")}
                </span>
              )}
              <HideToggle />
              <button className="t1c-btn" onClick={refresh} disabled={refreshing}>
                {refreshing ? "..." : "↻ ACTUALIZAR"}
              </button>
            </div>
          </div>
        </div>

        <div className="t1c-body">

        {/* ── Positions panel ── */}
        <div className="t1c-pn">
          <div className="t1c-pn__h">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <b>POSICIONES</b>
              <span>{filtered.length} tokens</span>
            </div>
            <input
              className="t1c-inp"
              placeholder="BUSCAR..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 140 }}
            />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="t1c-tbl">
              <thead>
                <tr>
                  <th className="l" onClick={() => toggleSort("ticker")}>TICKER{sortIcon("ticker")}</th>
                  <th onClick={() => toggleSort("quantity")}>CANT{sortIcon("quantity")}</th>
                  <th className="t1c-col-p" onClick={() => toggleSort("entryPriceUsd")}>ENTRADA{sortIcon("entryPriceUsd")}</th>
                  <th className="t1c-col-p" onClick={() => toggleSort("priceUsd")}>ACTUAL{sortIcon("priceUsd")}</th>
                  <th className="t1c-col-v" onClick={() => toggleSort("invested")}>INVERTIDO{sortIcon("invested")}</th>
                  <th className="t1c-col-v" onClick={() => toggleSort("currentValue")}>VALOR{sortIcon("currentValue")}</th>
                  <th onClick={() => toggleSort("pnl")}>P&amp;L ${sortIcon("pnl")}</th>
                  <th onClick={() => toggleSort("pnlPct")}>P&amp;L %{sortIcon("pnlPct")}</th>
                  <th onClick={() => toggleSort("portfolioPct")}>% CART{sortIcon("portfolioPct")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p: CryptoPosition) => (
                  <tr key={p.ticker}>
                    <td className="l">
                      <div className="t1c-tk">{p.ticker}</div>
                      <div className="t1c-nm">{p.name}</div>
                    </td>
                    <td className="t1c-qty">{fmtQty(p.quantity)}</td>
                    <td className="t1c-col-p" style={{ color: "#6b8fc4" }} data-money>
                      {fmtPrice(p.entryPriceUsd)}
                    </td>
                    <td className="t1c-col-p" style={{ color: "#6b8fc4" }} data-money>
                      {p.priceUsd != null ? fmtPrice(p.priceUsd) : <span className="t1c-mute">—</span>}
                    </td>
                    <td className="t1c-col-v" data-money>{fmtUsd(p.invested)}</td>
                    <td className="t1c-col-v" data-money>
                      {p.currentValue != null ? fmtUsd(p.currentValue) : <span className="t1c-mute">—</span>}
                    </td>
                    <td className={p.pnl == null ? "" : p.pnl >= 0 ? "t1c-up" : "t1c-down"} data-money>
                      {p.pnl != null ? (p.pnl >= 0 ? "+" : "") + fmtUsd(p.pnl) : <span className="t1c-mute">—</span>}
                    </td>
                    <td className={p.pnlPct == null ? "" : p.pnlPct >= 0 ? "t1c-up" : "t1c-down"}>
                      {p.pnlPct != null ? fmtPct(p.pnlPct) : <span className="t1c-mute">—</span>}
                    </td>
                    <td style={{ color: "#c8d4e0" }}>
                      {p.currentValue != null ? `${p.portfolioPct.toFixed(1)}%` : <span className="t1c-mute">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="l t1c-mute" colSpan={4}>TOTAL</td>
                  <td className="t1c-col-v" data-money>{fmtUsd(totalInvested)}</td>
                  <td className="t1c-col-v" data-money>{fmtUsd(totalValue)}</td>
                  <td className={totalPnl >= 0 ? "t1c-up" : "t1c-down"} data-money>
                    {totalPnl >= 0 ? "+" : ""}{fmtUsd(totalPnl)}
                  </td>
                  <td className={totalPnl >= 0 ? "t1c-up" : "t1c-down"}>{fmtPct(totalPnlPct)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Monthly evolution panel ── */}
        <div className="t1c-pn">
          <div className="t1c-pn__h">
            <b>EVOLUCIÓN MENSUAL</b>
            {monthlySnapshots.length === 0 && (
              <span>sin datos · cargá los últimos 3 meses</span>
            )}
            <button
              className="t1c-btn"
              onClick={backfill}
              disabled={backfilling}
              style={{ marginLeft: "auto" }}
            >
              {backfilling ? "..." : "↓ CARGAR 3 MESES"}
            </button>
          </div>
          {monthlySnapshots.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table className="t1c-tbl">
                <thead>
                  <tr>
                    <th className="l">MES</th>
                    <th>VALOR USD</th>
                    <th>CAMBIO $</th>
                    <th>CAMBIO %</th>
                    <th>P&amp;L TOTAL</th>
                    <th>P&amp;L %</th>
                    <th style={{ width: 100 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {monthlySnapshots.map((s) => {
                    const barWidth = maxAbsChange > 0 ? Math.round((Math.abs(s.changeUsd) / maxAbsChange) * 90) : 0;
                    const barColor = s.changeUsd >= 0 ? "#00c853" : "#ff3b3b";
                    const isFirst = s === monthlySnapshots[monthlySnapshots.length - 1];
                    return (
                      <tr key={s.yearMonth}>
                        <td className="l" style={{ color: "#f0a500", fontWeight: 700 }}>{s.yearMonth}</td>
                        <td data-money>{fmtUsd(s.totalValueUsd)}</td>
                        <td className={isFirst ? "t1c-mute" : s.changeUsd >= 0 ? "t1c-up" : "t1c-down"} data-money>
                          {isFirst ? "—" : (s.changeUsd >= 0 ? "+" : "") + fmtUsd(s.changeUsd)}
                        </td>
                        <td className={isFirst ? "t1c-mute" : s.changeUsd >= 0 ? "t1c-up" : "t1c-down"}>
                          {isFirst ? "—" : fmtPct(s.changePct)}
                        </td>
                        <td className={s.totalPnl >= 0 ? "t1c-up" : "t1c-down"} data-money>
                          {s.totalPnl >= 0 ? "+" : ""}{fmtUsd(s.totalPnl)}
                        </td>
                        <td className={s.totalPnl >= 0 ? "t1c-up" : "t1c-down"}>
                          {fmtPct(s.totalPnlPct)}
                        </td>
                        <td style={{ textAlign: "left", paddingLeft: 8 }}>
                          {!isFirst && (
                            <span
                              className="t1c-mbar"
                              style={{ width: barWidth, background: barColor }}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {monthlySnapshots.length === 0 && (
            <div style={{ padding: "24px 0", textAlign: "center", color: "#4a5568", fontSize: 10, letterSpacing: "0.1em" }}>
              SIN HISTORIAL · PRESIONÁ ↓ CARGAR 3 MESES PARA HACER EL BACKFILL
            </div>
          )}
        </div>

        {/* ── Notes ── */}
        <div className="t1c-notes">
          <div>* LUNC y GOHM: cantidades calculadas usando precio histórico del 01/03/2024.</div>
          <div>* LUNA y AURORA: precio de entrada estimado por valor invertido ÷ cantidad.</div>
          <div>* RON: ticker RON14101-USD (Ronin). P&L calculado sobre qty × precio entrada.</div>
          <div>* Evolución mensual: solo incluye holdings con ticker de Yahoo Finance.</div>
        </div>

        </div> {/* end t1c-body */}
      </div>
    </>
  );
}
