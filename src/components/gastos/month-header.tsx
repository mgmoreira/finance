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

function fmtUsd(v: number) {
  return `US$ ${Math.round(v).toLocaleString("es-AR")}`;
}

export function MonthHeader({
  budgetId, yearMonth, salary, mercadoPago, totalSalary, exchangeRateUsd,
  totalSpent, totalPending, totalInvested, totalInvestedUsd, remaining,
  onPrev, onNext, onUpdated,
}: MonthHeaderProps) {
  const [showEdit, setShowEdit] = useState(false);

  const salaryUsd = exchangeRateUsd ? totalSalary / exchangeRateUsd : null;
  const spentPct = totalSalary > 0 ? (totalSpent / totalSalary) * 100 : 0;
  const investedPct = totalSalary > 0 ? (totalInvested / totalSalary) * 100 : 0;
  const remainingPct = totalSalary > 0 ? Math.max(0, (remaining / totalSalary) * 100) : 0;
  const savingsRate = totalSalary > 0 ? totalInvested / totalSalary : 0;

  const salarySubtitle = [
    mercadoPago && mercadoPago > 0 ? `Banco ${formatArs(salary)} + MP ${formatArs(mercadoPago)}` : null,
    salaryUsd !== null ? fmtUsd(salaryUsd) : null,
    exchangeRateUsd ? `USD $1 = ${formatArs(exchangeRateUsd)}` : null,
  ].filter(Boolean).join(" · ");

  const investedSubtitle = [
    `Tasa de ahorro ${(savingsRate * 100).toFixed(1)}% · Meta 40%`,
    totalInvestedUsd != null ? fmtUsd(totalInvestedUsd) : null,
  ].filter(Boolean).join(" · ");

  return (
    <>
      <div className="t1-stat-grid">
        {/* SUELDO */}
        <div className="t1-stat">
          <div className="t1-stat__l">SUELDO</div>
          <div className="t1-stat__v" data-money>{formatArs(totalSalary)}</div>
          <div className="t1-stat__s">{salarySubtitle || "—"}</div>
          <div className="t1-stat__bar"><span style={{ width: "100%" }} /></div>
        </div>

        {/* GASTADO */}
        <div className="t1-stat neg">
          <div className="t1-stat__l">GASTADO</div>
          <div className="t1-stat__v" data-money>{formatArs(totalSpent)}</div>
          <div className="t1-stat__s">{spentPct.toFixed(1)}% del sueldo{totalPending > 0 ? ` · ${totalPending} pendiente${totalPending !== 1 ? "s" : ""}` : ""}</div>
          <div className="t1-stat__bar"><span style={{ width: `${Math.min(spentPct, 100)}%` }} /></div>
        </div>

        {/* INVERTIDO */}
        <div className="t1-stat pos">
          <div className="t1-stat__l">INVERTIDO</div>
          <div className="t1-stat__v" data-money>{formatArs(totalInvested)}</div>
          <div className="t1-stat__s">{investedSubtitle || "—"}</div>
          <div className="t1-stat__bar">
            <span style={{ width: `${Math.min((savingsRate / 0.4) * 100, 100)}%` }} />
          </div>
        </div>

        {/* POR ASIGNAR */}
        <div className={`t1-stat${remaining > 0 ? " warn" : remaining < 0 ? " neg" : ""}`}>
          <div className="t1-stat__l">POR ASIGNAR</div>
          <div className="t1-stat__v" data-money>{formatArs(remaining)}</div>
          <div className="t1-stat__s">
            {remainingPct.toFixed(1)}% del sueldo
            {exchangeRateUsd && remaining > 0 ? ` · ${fmtUsd(remaining / exchangeRateUsd)}` : ""}
          </div>
          <div className="t1-stat__bar">
            <span style={{ width: `${Math.min(remainingPct, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Navigation + edit */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
        <button className="t1-btn" onClick={onPrev} style={{ padding: "3px 10px" }}>← ANTERIOR</button>
        <button
          style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.08em", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)" }}
          onClick={() => setShowEdit(true)}
        >
          EDITAR MES
        </button>
        <button className="t1-btn" onClick={onNext} style={{ padding: "3px 10px" }}>SIGUIENTE →</button>
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
    </>
  );
}
