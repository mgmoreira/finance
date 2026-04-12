"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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

  const [tickerInput, setTickerInput] = useState("");
  const [ticker, setTicker] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isNewTicker, setIsNewTicker] = useState(false);
  const [type, setType] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [exchangeRate, setExchangeRate] = useState("");
  const [fetchedPrice, setFetchedPrice] = useState<number | null>(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);

  // New species fields
  const [newName, setNewName] = useState("");
  const [newSector, setNewSector] = useState("");
  const [newCountry, setNewCountry] = useState("");

  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter species by input
  const suggestions = useMemo(() => {
    if (!tickerInput.trim()) return [];
    const q = tickerInput.toUpperCase();
    return speciesList
      .filter((s) => s.ticker.includes(q) || s.name.toUpperCase().includes(q))
      .slice(0, 8);
  }, [tickerInput, speciesList]);

  // Close suggestions on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Auto-fetch price when ticker + date are set and price is empty
  useEffect(() => {
    if (!ticker || !date || price) {
      setFetchedPrice(null);
      return;
    }
    let cancelled = false;
    setFetchingPrice(true);
    fetch(`/api/price-lookup?ticker=${ticker}&date=${date}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setFetchedPrice(data.priceArs ?? null);
          setFetchingPrice(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFetchedPrice(null);
          setFetchingPrice(false);
        }
      });
    return () => { cancelled = true; };
  }, [ticker, date, price]);

  function selectTicker(t: string) {
    setTicker(t);
    setTickerInput(t);
    setShowSuggestions(false);
    setIsNewTicker(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const finalTicker = ticker || tickerInput.toUpperCase();
      if (!finalTicker) {
        setError("Ingresá un ticker");
        setLoading(false);
        return;
      }

      const body: Record<string, unknown> = {
        ticker: finalTicker,
        type,
        quantity: parseInt(quantity),
        date,
        exchangeRate: exchangeRate ? parseFloat(exchangeRate) : undefined,
      };

      // Only send price if user entered one
      if (price) {
        body.price = parseFloat(price);
        body.currency = currency;
      }

      if (isNewTicker) {
        body.newSpecies = {
          name: newName || finalTicker,
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
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const existingTickers = new Set(speciesList.map((s) => s.ticker));
  const isUnknownTicker = tickerInput.length >= 2 && !existingTickers.has(tickerInput.toUpperCase());

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md border border-gray-700">
        <h2 className="text-lg font-semibold mb-4">Nueva Operación</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Ticker search */}
          <div className="relative" ref={suggestionsRef}>
            <label className="text-sm text-gray-400">Ticker</label>
            <input
              type="text"
              value={tickerInput}
              onChange={(e) => {
                const v = e.target.value.toUpperCase();
                setTickerInput(v);
                setTicker("");
                setShowSuggestions(true);
                setIsNewTicker(false);
              }}
              onFocus={() => tickerInput && setShowSuggestions(true)}
              placeholder="Buscar ticker..."
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
              required
            />
            {showSuggestions && tickerInput && (
              <div className="absolute z-10 top-full left-0 right-0 bg-gray-800 border border-gray-700 rounded-b max-h-48 overflow-y-auto">
                {suggestions.map((s) => (
                  <button
                    key={s.ticker}
                    type="button"
                    onClick={() => selectTicker(s.ticker)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 flex justify-between"
                  >
                    <span className="font-medium">{s.ticker}</span>
                    <span className="text-gray-400 text-xs">{s.name}</span>
                  </button>
                ))}
                {suggestions.length === 0 && isUnknownTicker && (
                  <button
                    type="button"
                    onClick={() => {
                      setTicker(tickerInput.toUpperCase());
                      setIsNewTicker(true);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 text-blue-400"
                  >
                    + Agregar &quot;{tickerInput.toUpperCase()}&quot; como nuevo ticker
                  </button>
                )}
              </div>
            )}
            {ticker && (
              <p className="text-xs text-green-400 mt-1">
                {speciesList.find((s) => s.ticker === ticker)?.name ?? ticker}
              </p>
            )}
          </div>

          {/* New species fields */}
          {isNewTicker && (
            <div className="space-y-2 p-3 bg-gray-800/50 rounded border border-gray-700">
              <p className="text-xs text-gray-400">Nuevo ticker — completá los datos:</p>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nombre (ej: Tesla Inc)"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newSector}
                  onChange={(e) => setNewSector(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
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
                  className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                  required
                >
                  <option value="">País...</option>
                  {["EEUU", "ARG", "BRASIL", "CHINA", "EUROPA", "ASIA", "LATINO"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

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

          {/* Quantity */}
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

          {/* Date */}
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

          {/* Price (optional) */}
          <div>
            <label className="text-sm text-gray-400">
              Precio ARS <span className="text-gray-500">(opcional — se busca automático si no lo ponés)</span>
            </label>
            <div className="flex">
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={fetchingPrice ? "Buscando..." : fetchedPrice ? `Auto: $${fetchedPrice.toLocaleString("es-AR")}` : "Automático"}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-l px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => setCurrency(currency === "ARS" ? "USD" : "ARS")}
                className="bg-gray-700 px-3 rounded-r text-xs font-medium hover:bg-gray-600"
              >
                {currency}
              </button>
            </div>
            {fetchedPrice && !price && (
              <p className="text-xs text-gray-400 mt-1">
                Precio cierre {date}: ${fetchedPrice.toLocaleString("es-AR")} ARS
              </p>
            )}
          </div>

          {/* Exchange Rate (optional) */}
          <div>
            <label className="text-sm text-gray-400">
              Dólar MEP <span className="text-gray-500">(opcional — se busca automático)</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              placeholder="Automático (AL30)"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
            />
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
