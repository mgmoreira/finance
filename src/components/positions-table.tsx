"use client";

import { useState, useMemo, Fragment } from "react";
import { Position } from "@/lib/calculations";
import { formatUsd, formatPct, formatNumber } from "@/lib/format";
import { SpeciesDetail } from "./species-detail";

type SortKey = "ticker" | "quantity" | "avgPriceUsd" | "currentPriceUsd" | "avgStockPriceUsd" | "stockPriceUsd" | "invested" | "currentValue" | "pnl" | "pnlPct" | "portfolioPct";

interface Props {
  positions: Position[];
}

export function PositionsTable({ positions }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("portfolioPct");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
  const [filterSector, setFilterSector] = useState<string>("all");
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [searchTicker, setSearchTicker] = useState("");

  const sectors = useMemo(() => [...new Set(positions.map((p) => p.sector))].sort(), [positions]);
  const countries = useMemo(() => [...new Set(positions.map((p) => p.country))].sort(), [positions]);

  const filtered = useMemo(() => {
    return positions
      .filter((p) => filterSector === "all" || p.sector === filterSector)
      .filter((p) => filterCountry === "all" || p.country === filterCountry)
      .filter((p) => p.ticker.toLowerCase().includes(searchTicker.toLowerCase()))
      .sort((a, b) => {
        const aVal = a[sortKey] as number;
        const bVal = b[sortKey] as number;
        if (typeof aVal === "string") return sortDir === "asc" ? (aVal as string).localeCompare(bVal as unknown as string) : (bVal as unknown as string).localeCompare(aVal as string);
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      });
  }, [positions, sortKey, sortDir, filterSector, filterCountry, searchTicker]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-3 mb-3 flex-wrap items-center">
        <input
          type="text"
          placeholder="Buscar ticker..."
          value={searchTicker}
          onChange={(e) => setSearchTicker(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm w-40"
        />
        <select
          value={filterSector}
          onChange={(e) => setFilterSector(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm"
        >
          <option value="all">Todos los sectores</option>
          {sectors.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterCountry}
          onChange={(e) => setFilterCountry(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm"
        >
          <option value="all">Todos los países</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-left border-b border-gray-800">
              <th className="py-2 px-2 cursor-pointer hover:text-white" onClick={() => toggleSort("ticker")}>
                Ticker{sortIcon("ticker")}
              </th>
              <th className="py-2 px-2 cursor-pointer hover:text-white text-right" onClick={() => toggleSort("quantity")}>
                Cant{sortIcon("quantity")}
              </th>
              <th className="py-2 px-2 cursor-pointer hover:text-white text-right" onClick={() => toggleSort("avgPriceUsd")}>
                Prom USD{sortIcon("avgPriceUsd")}
              </th>
              <th className="py-2 px-2 cursor-pointer hover:text-white text-right" onClick={() => toggleSort("currentPriceUsd")}>
                Actual USD{sortIcon("currentPriceUsd")}
              </th>
              <th className="py-2 px-2 cursor-pointer hover:text-white text-right text-blue-400/70" onClick={() => toggleSort("avgStockPriceUsd")}>
                Prom EEUU{sortIcon("avgStockPriceUsd")}
              </th>
              <th className="py-2 px-2 cursor-pointer hover:text-white text-right text-blue-400/70" onClick={() => toggleSort("stockPriceUsd")}>
                Actual EEUU{sortIcon("stockPriceUsd")}
              </th>
              <th className="py-2 px-2 cursor-pointer hover:text-white text-right" onClick={() => toggleSort("invested")}>
                Invertido{sortIcon("invested")}
              </th>
              <th className="py-2 px-2 cursor-pointer hover:text-white text-right" onClick={() => toggleSort("currentValue")}>
                Valor Actual{sortIcon("currentValue")}
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
            {filtered.map((pos) => (
              <Fragment key={pos.ticker}>
                <tr
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer"
                  onClick={() => setExpandedTicker(expandedTicker === pos.ticker ? null : pos.ticker)}
                >
                  <td className="py-2 px-2 font-medium">{pos.ticker}</td>
                  <td className="py-2 px-2 text-right">{pos.quantity}</td>
                  <td className="py-2 px-2 text-right">{formatNumber(pos.avgPriceUsd)}</td>
                  <td className="py-2 px-2 text-right">{formatNumber(pos.currentPriceUsd)}</td>
                  <td className="py-2 px-2 text-right text-blue-400/70">{formatNumber(pos.avgStockPriceUsd)}</td>
                  <td className="py-2 px-2 text-right text-blue-400/70">{formatNumber(pos.stockPriceUsd)}</td>
                  <td className="py-2 px-2 text-right">{formatUsd(pos.invested)}</td>
                  <td className="py-2 px-2 text-right">{formatUsd(pos.currentValue)}</td>
                  <td className={`py-2 px-2 text-right ${pos.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {formatUsd(pos.pnl)}
                  </td>
                  <td className={`py-2 px-2 text-right ${pos.pnlPct >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {formatPct(pos.pnlPct)}
                  </td>
                  <td className="py-2 px-2 text-right font-medium">{pos.portfolioPct.toFixed(1)}%</td>
                </tr>
                {expandedTicker === pos.ticker && (
                  <tr>
                    <td colSpan={11}>
                      <SpeciesDetail position={pos} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
