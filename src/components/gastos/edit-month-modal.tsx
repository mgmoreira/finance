"use client";

import { useState } from "react";
import { MoneyInput } from "./money-input";

interface EditMonthModalProps {
  budgetId: number;
  yearMonth: string;
  initialSalary: number;
  initialMercadoPago: number | null;
  initialExchangeRateUsd: number | null;
  onClose: () => void;
  onSaved: () => void;
}

function parseMoneyInput(v: string) {
  return v ? parseFloat(v.replace(/\./g, "").replace(",", ".")) : null;
}

const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
function monthLabel(ym: string) {
  const [year, month] = ym.split("-");
  return `${MONTH_NAMES[parseInt(month) - 1]} ${year}`;
}

export function EditMonthModal({ budgetId, yearMonth, initialSalary, initialMercadoPago, initialExchangeRateUsd, onClose, onSaved }: EditMonthModalProps) {
  const [salary, setSalary] = useState(initialSalary ? String(initialSalary) : "");
  const [mercadoPago, setMercadoPago] = useState(initialMercadoPago ? String(initialMercadoPago) : "");
  const [exchangeRateUsd, setExchangeRateUsd] = useState(initialExchangeRateUsd ? String(initialExchangeRateUsd) : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const salaryNum = parseMoneyInput(salary) ?? 0;
  const mpNum = parseMoneyInput(mercadoPago) ?? 0;
  const totalSalary = salaryNum + mpNum;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!salary) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/gastos/budgets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: budgetId,
          salary: salaryNum,
          mercadoPago: mpNum || null,
          exchangeRateUsd: parseMoneyInput(exchangeRateUsd),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-sm border border-gray-700">
        <h2 className="text-lg font-semibold mb-1">Editar mes</h2>
        <p className="text-sm text-gray-400 mb-4">{monthLabel(yearMonth)}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-400">Sueldo neto banco (ARS)</label>
            <MoneyInput
              value={salary}
              onChange={setSalary}
              placeholder="Ej: 1.500.000"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm text-gray-400">
              MercadoPago <span className="text-gray-500">(opcional)</span>
            </label>
            <MoneyInput
              value={mercadoPago}
              onChange={setMercadoPago}
              placeholder="Ej: 50.000"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
            />
          </div>

          {mpNum > 0 && (
            <div className="bg-gray-800/60 rounded px-3 py-2 text-sm text-gray-400">
              Total sueldo: <span className="text-white font-medium">${totalSalary.toLocaleString("es-AR")}</span>
            </div>
          )}

          <div>
            <label className="text-sm text-gray-400">
              Precio del dólar <span className="text-gray-500">(opcional)</span>
            </label>
            <MoneyInput
              value={exchangeRateUsd}
              onChange={setExchangeRateUsd}
              placeholder="Ej: 1.200"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded bg-gray-700 hover:bg-gray-600">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50">
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
