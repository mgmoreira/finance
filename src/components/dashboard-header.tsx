import { PortfolioSummary } from "@/lib/calculations";
import { formatUsd, formatPct, formatMonth } from "@/lib/format";

export function DashboardHeader({ summary }: { summary: PortfolioSummary }) {
  const gainColor = summary.totalGain >= 0 ? "text-green-400" : "text-red-400";

  return (
    <div className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800 px-4 py-3">
      {/* Balance row */}
      <div className="flex items-center gap-6 flex-wrap">
        <div>
          <span className="text-gray-400 text-sm">BALANCE</span>
          <p className="text-2xl font-bold">{formatUsd(summary.totalValue)}</p>
        </div>
        <div>
          <span className="text-gray-400 text-sm">GANANCIA</span>
          <p className={`text-xl font-semibold ${gainColor}`}>
            {formatUsd(summary.totalGain)} ({formatPct(summary.totalGainPct)})
          </p>
        </div>
        <div>
          <span className="text-gray-400 text-sm">vs S&P500 (mes)</span>
          <p className="text-lg">
            <span className={summary.sp500MonthChangePct >= 0 ? "text-green-400" : "text-red-400"}>
              SPY: {formatPct(summary.sp500MonthChangePct)}
            </span>
          </p>
        </div>
        {summary.mepRate > 0 && (
          <div>
            <span className="text-gray-400 text-sm">DOLAR MEP</span>
            <p className="text-lg">${summary.mepRate.toFixed(0)}</p>
          </div>
        )}
        {summary.lastUpdated && (
          <div className="ml-auto text-xs text-gray-500">
            Actualizado: {new Date(summary.lastUpdated).toLocaleTimeString("es-AR")}
          </div>
        )}
      </div>

      {/* Monthly stats row */}
      {summary.monthlyStats.length > 0 && (
        <div className="flex gap-2 mt-2 overflow-x-auto">
          {summary.monthlyStats.map((m) => (
            <div
              key={m.yearMonth}
              className={`text-xs px-2 py-1 rounded ${
                m.gainPct >= 0 ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
              }`}
            >
              {formatMonth(m.yearMonth)}: {formatPct(m.gainPct)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
