"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatArs } from "@/lib/format";
import { MoneyInput } from "./money-input";
import type { TransferRow } from "@/lib/gastos-data";

interface TransferModalProps {
  budgetId: number;
  remaining: number;
  onClose: () => void;
  existing?: TransferRow;
}

export function TransferModal({ budgetId, remaining, onClose, existing }: TransferModalProps) {
  const router = useRouter();
  const isEdit = !!existing;

  const [amountArs, setAmountArs] = useState(existing ? String(existing.amountArs) : "");
  const [amountUsd, setAmountUsd] = useState(existing?.amountUsd ? String(existing.amountUsd) : "");
  const [currency, setCurrency] = useState<"ARS" | "USD">((existing?.currency as "ARS" | "USD") ?? "USD");
  const [date, setDate] = useState(existing?.date ?? new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [virtual, setVirtual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amountArs) return;
    setLoading(true);
    setError("");

    try {
      if (isEdit) {
        const body: Record<string, unknown> = {
          id: existing!.id,
          amountArs: parseFloat(amountArs),
          currency,
          date,
          notes: notes || null,
        };
        if (currency === "USD" && amountUsd) body.amountUsd = parseFloat(amountUsd);

        const res = await fetch("/api/gastos/transfer", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      } else {
        const body: Record<string, unknown> = {
          budgetId,
          amountArs: parseFloat(amountArs),
          currency,
          date,
        };
        if (currency === "USD" && amountUsd) body.amountUsd = parseFloat(amountUsd);
        if (notes) body.notes = notes;
        if (virtual) body.virtual = true;

        const res = await fetch("/api/gastos/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      }

      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!existing || !confirm("¿Borrar esta transferencia?")) return;
    await fetch("/api/gastos/transfer", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: existing.id }),
    });
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md border border-gray-700">
        <h2 className="text-lg font-semibold mb-1">
          {isEdit ? "Editar Transferencia" : "Enviar a Inversión"}
        </h2>
        {!isEdit && (
          <p className="text-sm text-gray-400 mb-4">
            Disponible: <span data-money>{formatArs(remaining)}</span>
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="text-sm text-gray-400">Monto en pesos</label>
            <MoneyInput
              value={amountArs}
              onChange={setAmountArs}
              placeholder="Ej: 200.000"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm text-gray-400">Moneda destino</label>
            <div className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" value="USD" checked={currency === "USD"} onChange={() => setCurrency("USD")} />
                Dólares (USD)
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" value="ARS" checked={currency === "ARS"} onChange={() => setCurrency("ARS")} />
                Pesos (ARS)
              </label>
            </div>
          </div>

          {currency === "USD" && (
            <div>
              <label className="text-sm text-gray-400">
                Monto exacto en USD <span className="text-gray-500">(opcional — si no, se usa MEP)</span>
              </label>
              <MoneyInput
                value={amountUsd}
                onChange={setAmountUsd}
                placeholder="Se calcula con dólar MEP"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
              />
            </div>
          )}

          <div>
            <label className="text-sm text-gray-400">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-400">Notas (opcional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Compra USD banco"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
            />
          </div>

          {!isEdit && (
            <label className="flex items-start gap-3 cursor-pointer select-none p-3 rounded-lg bg-gray-800/60 border border-gray-700">
              <input
                type="checkbox"
                checked={virtual}
                onChange={(e) => setVirtual(e.target.checked)}
                className="mt-0.5 accent-yellow-400"
              />
              <div>
                <span className="text-sm font-medium">Solo registrar (no enviar)</span>
                <p className="text-xs text-gray-400 mt-0.5">
                  Cuenta en el presupuesto y los gráficos, pero no registra un movimiento de caja real. Útil para cargar historial.
                </p>
              </div>
            </label>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 justify-between">
            {isEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-sm rounded bg-red-900/50 hover:bg-red-800 text-red-400"
              >
                Borrar
              </button>
            ) : <div />}
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded bg-gray-700 hover:bg-gray-600">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-4 py-2 text-sm rounded disabled:opacity-50 ${
                  isEdit ? "bg-blue-600 hover:bg-blue-500" :
                  virtual ? "bg-yellow-600 hover:bg-yellow-500" : "bg-green-600 hover:bg-green-500"
                }`}
              >
                {loading ? "Guardando..." : isEdit ? "Guardar cambios" : virtual ? "Registrar (sin enviar)" : "Enviar a Inversión"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
