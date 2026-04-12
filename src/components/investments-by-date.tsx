import { InvestmentByDate } from "@/lib/calculations";
import { formatUsd, formatDate, formatMonth } from "@/lib/format";

interface Props {
  byDate: InvestmentByDate[];
  byMonth: { month: string; totalUsd: number }[];
}

export function InvestmentsByDate({ byDate, byMonth }: Props) {
  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">INVERSIONES POR FECHA</h3>

      {/* Monthly summary */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {byMonth.map((m) => (
          <div key={m.month} className="text-xs bg-gray-800 rounded px-2 py-1 whitespace-nowrap">
            {formatMonth(m.month)}: <span className="font-medium">{formatUsd(m.totalUsd)}</span>
          </div>
        ))}
      </div>

      {/* Date table */}
      <div className="overflow-x-auto max-h-64 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-900">
            <tr className="text-gray-400 text-left border-b border-gray-800">
              <th className="py-2 px-2">Fecha</th>
              <th className="py-2 px-2 text-right">Total USD</th>
              <th className="py-2 px-2 text-right">Acumulado</th>
              <th className="py-2 px-2">Tickers</th>
            </tr>
          </thead>
          <tbody>
            {byDate.map((row) => (
              <tr key={row.date} className="border-b border-gray-800/50">
                <td className="py-1.5 px-2">{formatDate(row.date)}</td>
                <td className="py-1.5 px-2 text-right">{formatUsd(row.totalUsd)}</td>
                <td className="py-1.5 px-2 text-right text-gray-400">{formatUsd(row.accumulated)}</td>
                <td className="py-1.5 px-2 text-gray-400 text-xs">{row.tickers.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
