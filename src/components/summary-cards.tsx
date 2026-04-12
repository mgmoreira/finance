import { formatUsd } from "@/lib/format";

interface SummaryItem {
  label: string;
  value: number;
  pct: number;
}

export function SummaryCards({
  byCountry,
  bySector,
}: {
  byCountry: SummaryItem[];
  bySector: SummaryItem[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-gray-900 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">POR PAÍS</h3>
        <div className="space-y-2">
          {byCountry.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <span>{item.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-gray-400">{formatUsd(item.value)}</span>
                <div className="w-16 text-right font-medium">{item.pct.toFixed(1)}%</div>
                <div className="w-24 bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${Math.min(item.pct, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">POR SECTOR</h3>
        <div className="space-y-2">
          {bySector.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <span>{item.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-gray-400">{formatUsd(item.value)}</span>
                <div className="w-16 text-right font-medium">{item.pct.toFixed(1)}%</div>
                <div className="w-24 bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{ width: `${Math.min(item.pct, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
