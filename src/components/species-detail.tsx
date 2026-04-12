import { Position } from "@/lib/calculations";
import { formatUsd, formatPct, formatNumber } from "@/lib/format";

export function SpeciesDetail({ position }: { position: Position }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-800/50 text-sm">
      <div>
        <span className="text-gray-400">ATH</span>
        <p>{formatUsd(position.ath)}</p>
      </div>
      <div>
        <span className="text-gray-400">Dist. ATH</span>
        <p className={position.athDistance > 0 ? "text-red-400" : "text-green-400"}>
          {position.athDistance > 0 ? "-" : "+"}{Math.abs(position.athDistance).toFixed(1)}%
        </p>
      </div>
      <div>
        <span className="text-gray-400">Dividendo</span>
        <p>{position.dividendYield > 0 ? `${position.dividendYield.toFixed(2)}%` : "—"}</p>
      </div>
      <div>
        <span className="text-gray-400">Var. mes</span>
        <p className={position.monthChangePct >= 0 ? "text-green-400" : "text-red-400"}>
          {formatUsd(position.monthStartPrice)} → {formatUsd(position.currentPriceUsd)} ({formatPct(position.monthChangePct)})
        </p>
      </div>
      <div>
        <span className="text-gray-400">Sector</span>
        <p>{position.sector}</p>
      </div>
      <div>
        <span className="text-gray-400">País</span>
        <p>{position.country}</p>
      </div>
      <div>
        <span className="text-gray-400">Paridad</span>
        <p>{position.parity}</p>
      </div>
      <div>
        <span className="text-gray-400">Precio ARS</span>
        <p>${position.priceArs.toLocaleString("es-AR")}</p>
      </div>
      <div>
        <span className="text-gray-400">Precio EEUU</span>
        <p>{formatUsd(position.stockPriceUsd)}</p>
      </div>
    </div>
  );
}
