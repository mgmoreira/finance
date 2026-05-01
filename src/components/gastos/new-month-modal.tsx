"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoneyInput } from "./money-input";

interface NewMonthModalProps {
  defaultYearMonth: string;
  onClose: () => void;
  onCreated: (yearMonth: string) => void;
}

function parseMoneyInput(v: string) {
  return v ? parseFloat(v.replace(/\./g, "").replace(",", ".")) : null;
}

export function NewMonthModal({ defaultYearMonth, onClose, onCreated }: NewMonthModalProps) {
  const router = useRouter();
  const [yearMonth, setYearMonth] = useState(defaultYearMonth);
  const [salary, setSalary] = useState("");
  const [mercadoPago, setMercadoPago] = useState("");
  const [exchangeRateUsd, setExchangeRateUsd] = useState("");
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yearMonth,
          salary: salaryNum,
          mercadoPago: mpNum || null,
          exchangeRateUsd: parseMoneyInput(exchangeRateUsd),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.refresh();
      onCreated(yearMonth);
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
        <h2 className="text-lg font-semibold mb-4">Nuevo Mes</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-400">Mes</label>
            <input
              type="month"
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
              required
            />
          </div>

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
              Total sueldo: <span className="text-white font-medium">
                ${totalSalary.toLocaleString("es-AR")}
              </span>
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
              {loading ? "Creando..." : "Crear Mes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
