"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Species {
  ticker: string;
  name: string;
}

export function NewOperationModal({
  speciesList,
  onClose,
}: {
  speciesList: Species[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [ticker, setTicker] = useState("");
  const [isNewTicker, setIsNewTicker] = useState(false);
  const [type, setType] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [exchangeRate, setExchangeRate] = useState("");

  // New species fields
  const [newName, setNewName] = useState("");
  const [newSector, setNewSector] = useState("");
  const [newCountry, setNewCountry] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const body: Record<string, unknown> = {
        ticker,
        type,
        quantity: parseInt(quantity),
        price: parseFloat(price),
        currency,
        date,
        exchangeRate: exchangeRate ? parseFloat(exchangeRate) : undefined,
      };

      if (isNewTicker) {
        body.newSpecies = {
          name: newName || ticker,
          sector: newSector,
          country: newCountry,
        };
      }

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.refresh();
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md border border-gray-700">
        <h2 className="text-lg font-semibold mb-4">Nueva Operación</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Ticker */}
          <div>
            <label className="text-sm text-gray-400">Ticker</label>
            {!isNewTicker ? (
              <div className="flex gap-2">
                <select
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                  required
                >
                  <option value="">Seleccionar...</option>
                  {speciesList.map((s) => (
                    <option key={s.ticker} value={s.ticker}>{s.ticker} - {s.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsNewTicker(true)}
                  className="text-xs bg-gray-700 px-3 rounded hover:bg-gray-600"
                >
                  + Nuevo
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    placeholder="TICKER"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setIsNewTicker(false)}
                    className="text-xs bg-gray-700 px-3 rounded hover:bg-gray-600"
                  >
                    Existente
                  </button>
                </div>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nombre (ej: Tesla Inc)"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                />
                <select
                  value={newSector}
                  onChange={(e) => setNewSector(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                  required
                >
                  <option value="">Sector...</option>
                  {["TECNOLOGIA", "ENERGIA", "E-COMMERCE", "SALUD", "CONSUMO", "AGRO", "MINERIA", "ETF"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                  required
                >
                  <option value="">País...</option>
                  {["EEUU", "ARG", "BRASIL", "CHINA", "EUROPA", "ASIA", "LATINO"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Type */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" value="BUY" checked={type === "BUY"} onChange={() => setType("BUY")} />
              COMPRA
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" value="SELL" checked={type === "SELL"} onChange={() => setType("SELL")} />
              VENTA
            </label>
          </div>

          {/* Quantity + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400">Cantidad</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                required
                min="1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">Precio ({currency})</label>
              <div className="flex">
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-l px-3 py-2 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setCurrency(currency === "ARS" ? "USD" : "ARS")}
                  className="bg-gray-700 px-3 rounded-r text-xs font-medium hover:bg-gray-600"
                >
                  {currency}
                </button>
              </div>
            </div>
          </div>

          {/* Date + Exchange Rate */}
          <div className="grid grid-cols-2 gap-3">
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
              <label className="text-sm text-gray-400">Dólar MEP (auto)</label>
              <input
                type="number"
                step="0.01"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                placeholder="Auto-fetch"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded bg-gray-700 hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
