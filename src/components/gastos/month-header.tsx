"use client";

import { useState } from "react";
import { formatArs } from "@/lib/format";
import { EditMonthModal } from "./edit-month-modal";

interface MonthHeaderProps {
  budgetId: number;
  yearMonth: string;
  salary: number;
  mercadoPago: number | null;
  totalSalary: number;
  exchangeRateUsd: number | null;
  totalSpent: number;
  totalPending: number;
  totalInvested: number;
  totalInvestedUsd: number | null;
  remaining: number;
  onPrev: () => void;
  onNext: () => void;
  onUpdated: () => void;
}

function formatMonthLabel(ym: string) {
  const [year, month] = ym.split("-");
  const months = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  return `${months[parseInt(month) - 1]} ${year}`;
}

function fmtUsd(v: number) {
  return `US$ ${Math.round(v).toLocaleString("es-AR")}`;
}

export function MonthHeader({
  budgetId, yearMonth, salary, mercadoPago, totalSalary, exchangeRateUsd,
  totalSpent, totalPending, totalInvested, totalInvestedUsd, remaining,
  onPrev, onNext, onUpdated,
}: MonthHeaderProps) {
  const spentPct = totalSalary > 0 ? (totalSpent / totalSalary) * 100 : 0;
  const investedPct = totalSalary > 0 ? (totalInvested / totalSalary) * 100 : 0;
  const remainingPct = totalSalary > 0 ? Math.max(0, (remaining / totalSalary) * 100) : 0;
  const salaryUsd = exchangeRateUsd ? totalSalary / exchangeRateUsd : null;

  const [showEdit, setShowEdit] = useState(false);

  return (
    <div className="bg-gray-900 rounded-lg p-5">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onPrev} className="text-gray-400 hover:text-white px-3 py-1 rounded hover:bg-gray-800 text-lg">&lt;</button>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{formatMonthLabel(yearMonth)}</h1>
          <button
            onClick={() => setShowEdit(true)}
            className="text-xs text-gray-600 hover:text-blue-400"
          >
            Editar
          </button>
        </div>
        <button onClick={onNext} className="text-gray-400 hover:text-white px-3 py-1 rounded hover:bg-gray-800 text-lg">&gt;</button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
        <div>
          <span className="text-xs text-gray-400">SUELDO</span>
          <p className="text-lg font-semibold" data-money>{formatArs(totalSalary)}</p>
          {mercadoPago != null && mercadoPago > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
              Banco {formatArs(salary)} + MP {formatArs(mercadoPago)}
            </p>
          )}
          {salaryUsd !== null && (
            <p className="text-xs text-yellow-400 mt-0.5">{fmtUsd(salaryUsd)}</p>
          )}
        </div>
        <div>
          <span className="text-xs text-gray-400">GASTADO</span>
          <p className="text-lg font-semibold text-red-400" data-money>{formatArs(totalSpent)}</p>
        </div>
        <div>
          <span className="text-xs text-gray-400">INVERTIDO</span>
          <p className="text-lg font-semibold text-green-400" data-money>{formatArs(totalInvested)}</p>
          {totalInvestedUsd !== null && (
            <p className="text-xs text-yellow-400 mt-0.5">{fmtUsd(totalInvestedUsd)}</p>
          )}
        </div>
        <div>
          <span className="text-xs text-gray-400">DISPONIBLE</span>
          <p className={`text-lg font-semibold ${remaining >= 0 ? "text-blue-400" : "text-red-400"}`} data-money>
            {formatArs(remaining)}
          </p>
        </div>
        <div>
          <span className="text-xs text-gray-400">PENDIENTES</span>
          <p className="text-lg font-semibold text-yellow-400">{totalPending}</p>
        </div>
      </div>

      {/* Exchange rate indicator */}
      {exchangeRateUsd && (
        <p className="text-xs text-gray-600 mb-3">USD $1 = {formatArs(exchangeRateUsd)}</p>
      )}

      {/* Progress bar */}
      <div className="w-full bg-gray-800 rounded-full h-3 flex overflow-hidden">
        <div className="bg-red-500 h-3 transition-all" style={{ width: `${Math.min(spentPct, 100)}%` }} title={`Gastado: ${spentPct.toFixed(1)}%`} />
        <div className="bg-green-500 h-3 transition-all" style={{ width: `${Math.min(investedPct, 100 - spentPct)}%` }} title={`Invertido: ${investedPct.toFixed(1)}%`} />
        <div className="bg-blue-500/30 h-3 transition-all" style={{ width: `${Math.min(remainingPct, 100 - spentPct - investedPct)}%` }} title={`Disponible: ${remainingPct.toFixed(1)}%`} />
      </div>
      <div className="flex gap-4 mt-1.5 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Gastos</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Inversión</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500/50 inline-block" /> Disponible</span>
      </div>

      {showEdit && (
        <EditMonthModal
          budgetId={budgetId}
          yearMonth={yearMonth}
          initialSalary={salary}
          initialMercadoPago={mercadoPago}
          initialExchangeRateUsd={exchangeRateUsd}
          onClose={() => setShowEdit(false)}
          onSaved={onUpdated}
        />
      )}
    </div>
  );
}
