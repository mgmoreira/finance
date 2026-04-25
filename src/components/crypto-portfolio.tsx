"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { CryptoSummary, CryptoPosition } from "@/lib/crypto-data";
import { HideToggle } from "@/components/hide-toggle";

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

function fmtPct(v: number) {
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

interface HeaderProps {
  summary: CryptoSummary;
  refreshing: boolean;
  onRefresh: () => void;
}

function CryptoDashboardHeader({ summary, refreshing, onRefresh }: HeaderProps) {
  const { totalValue, totalInvested, totalPnl, totalPnlPct, lastUpdated } = summary;
  const pnlColor = totalPnl >= 0 ? "text-green-400" : "text-red-400";

  return (
    <div className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800 px-4 py-3">
      <div className="flex items-center gap-6 flex-wrap max-w-[1600px] mx-auto">
        <div>
          <span className="text-gray-400 text-sm">BALANCE</span>
          <p className="text-2xl font-bold" data-money>{fmtUsd(totalValue)}</p>
        </div>
        <div>
          <span className="text-gray-400 text-sm">INVERTIDO</span>
          <p className="text-xl font-semibold text-gray-300" data-money>{fmtUsd(totalInvested)}</p>
        </div>
        <div>
          <span className="text-gray-400 text-sm">P&L</span>
          <p className={`text-xl font-semibold ${pnlColor}`} data-money>
            {totalPnl >= 0 ? "+" : ""}{fmtUsd(totalPnl)} ({fmtPct(totalPnlPct)})
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              Actualizado: {new Date(lastUpdated).toLocaleTimeString("es-AR")}
            </span>
          )}
          <HideToggle />
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-50 px-3 py-1.5 rounded text-gray-300"
          >
            {refreshing ? "Actualizando..." : "↻ Actualizar precios"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CryptoPortfolio({ summary }: { summary: CryptoSummary }) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("portfolioPct");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");

  async function refresh() {
    setRefreshing(true);
    await fetch("/api/crypto/refresh");
    router.refresh();
    setRefreshing(false);
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

  const { totalValue, totalInvested, totalPnl, totalPnlPct } = summary;
  const totalPnlColor = totalPnl >= 0 ? "text-green-400" : "text-red-400";

  return (
    <>
      <CryptoDashboardHeader summary={summary} refreshing={refreshing} onRefresh={refresh} />

      <div className="px-4 py-4 space-y-6 max-w-[1600px] mx-auto">
        <section>
          <h2 className="text-sm font-semibold text-gray-400 mb-2">POSICIONES</h2>

          {/* Search */}
          <div className="mb-3">
            <input
              type="text"
              placeholder="Buscar token..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm w-48"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-left border-b border-gray-700">
                  <th className="py-2 px-2 cursor-pointer hover:text-white" onClick={() => toggleSort("ticker")}>
                    Ticker{sortIcon("ticker")}
                  </th>
                  <th className="py-2 px-2 cursor-pointer hover:text-white text-right" onClick={() => toggleSort("quantity")}>
                    Cant{sortIcon("quantity")}
                  </th>
                  <th className="py-2 px-2 cursor-pointer hover:text-white text-right bg-blue-950/30" onClick={() => toggleSort("entryPriceUsd")}>
                    Precio entrada{sortIcon("entryPriceUsd")}
                  </th>
                  <th className="py-2 px-2 cursor-pointer hover:text-white text-right bg-blue-950/30" onClick={() => toggleSort("priceUsd")}>
                    Precio actual{sortIcon("priceUsd")}
                  </th>
                  <th className="py-2 px-2 cursor-pointer hover:text-white text-right bg-emerald-950/20" onClick={() => toggleSort("invested")}>
                    Invertido{sortIcon("invested")}
                  </th>
                  <th className="py-2 px-2 cursor-pointer hover:text-white text-right bg-emerald-950/20" onClick={() => toggleSort("currentValue")}>
                    Valor actual{sortIcon("currentValue")}
                  </th>
                  <th className="py-2 px-2 cursor-pointer hover:text-white text-right" onClick={() => toggleSort("pnl")}>
                    P&L ${sortIcon("pnl")}
                  </th>
                  <th className="py-2 px-2 cursor-pointer hover:text-white text-right" onClick={() => toggleSort("pnlPct")}>
                    P&L %{sortIcon("pnlPct")}
                  </th>
                  <th className="py-2 px-2 cursor-pointer hover:text-white text-right" onClick={() => toggleSort("portfolioPct")}>
                    % Cartera{sortIcon("portfolioPct")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p: CryptoPosition) => (
                  <tr key={p.ticker} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2 px-2 font-medium">
                      <div>{p.ticker}</div>
                      <div className="text-xs text-gray-500">{p.name}</div>
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-xs text-gray-300">
                      {fmtQty(p.quantity)}
                    </td>
                    <td className="py-2 px-2 text-right text-blue-400/70 bg-blue-950/10" data-money>
                      {fmtPrice(p.entryPriceUsd)}
                    </td>
                    <td className="py-2 px-2 text-right text-blue-400/70 bg-blue-950/10" data-money>
                      {p.priceUsd != null ? fmtPrice(p.priceUsd) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="py-2 px-2 text-right bg-emerald-950/10" data-money>
                      {fmtUsd(p.invested)}
                    </td>
                    <td className="py-2 px-2 text-right bg-emerald-950/10" data-money>
                      {p.currentValue != null ? fmtUsd(p.currentValue) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className={`py-2 px-2 text-right ${p.pnl == null ? "" : p.pnl >= 0 ? "text-green-400" : "text-red-400"}`} data-money>
                      {p.pnl != null ? (p.pnl >= 0 ? "+" : "") + fmtUsd(p.pnl) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className={`py-2 px-2 text-right ${p.pnlPct == null ? "" : p.pnlPct >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {p.pnlPct != null ? fmtPct(p.pnlPct) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="py-2 px-2 text-right font-medium">
                      {p.currentValue != null ? `${p.portfolioPct.toFixed(1)}%` : <span className="text-gray-600">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-700 bg-gray-800/30 font-semibold">
                  <td className="py-2 px-2 text-gray-400" colSpan={4}>TOTAL</td>
                  <td className="py-2 px-2 text-right bg-emerald-950/10" data-money>{fmtUsd(totalInvested)}</td>
                  <td className="py-2 px-2 text-right bg-emerald-950/10" data-money>{fmtUsd(totalValue)}</td>
                  <td className={`py-2 px-2 text-right ${totalPnlColor}`} data-money>
                    {totalPnl >= 0 ? "+" : ""}{fmtUsd(totalPnl)}
                  </td>
                  <td className={`py-2 px-2 text-right ${totalPnlColor}`}>
                    {fmtPct(totalPnlPct)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <div className="text-xs text-gray-600 space-y-1">
          <p>* LUNC y GOHM: cantidades calculadas usando precio histórico del 01/03/2024.</p>
          <p>* LUNA y AURORA: precio de entrada estimado por valor invertido ÷ cantidad.</p>
          <p>* RON: ticker RON14101-USD (Ronin). P&L calculado sobre qty × precio entrada.</p>
        </div>
      </div>
    </>
  );
}
