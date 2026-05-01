"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MoneyInput } from "./gastos/money-input";

interface Species {
  ticker: string;
  name: string;
}

const mono: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains, monospace)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--panel-alt)",
  border: "1px solid var(--border-strong)",
  color: "var(--text)",
  fontFamily: "var(--font-jetbrains, monospace)",
  fontSize: 12,
  padding: "7px 10px",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-jetbrains, monospace)",
  fontSize: 9.5,
  color: "var(--text-dim)",
  letterSpacing: 0.8,
  textTransform: "uppercase",
  marginBottom: 4,
};

export function NewOperationModal({
  speciesList,
  onClose,
  defaultType = "BUY",
  defaultTicker = "",
  defaultMaxQuantity,
}: {
  speciesList: Species[];
  onClose: () => void;
  defaultType?: "BUY" | "SELL";
  defaultTicker?: string;
  defaultMaxQuantity?: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [tickerInput, setTickerInput] = useState(defaultTicker);
  const [ticker, setTicker] = useState(defaultTicker);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isNewTicker, setIsNewTicker] = useState(false);
  const [type, setType] = useState<"BUY" | "SELL">(defaultType);
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [exchangeRate, setExchangeRate] = useState("");
  const [fetchedPrice, setFetchedPrice] = useState<number | null>(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);

  const [newName, setNewName] = useState("");
  const [newSector, setNewSector] = useState("");
  const [newCountry, setNewCountry] = useState("");

  const suggestionsRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    if (!tickerInput.trim()) return [];
    const q = tickerInput.toUpperCase();
    return speciesList
      .filter((s) => s.ticker.includes(q) || s.name.toUpperCase().includes(q))
      .slice(0, 8);
  }, [tickerInput, speciesList]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const derivedPrice =
    totalAmount && quantity && parseInt(quantity) > 0
      ? (parseFloat(totalAmount) / parseInt(quantity)).toFixed(2)
      : "";

  const effectivePrice = price || derivedPrice;

  useEffect(() => {
    if (!ticker || !date || price || totalAmount) {
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
  }, [ticker, date, price, totalAmount]);

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
      if (!finalTicker) { setError("Ingresá un ticker"); setLoading(false); return; }

      const body: Record<string, unknown> = {
        ticker: finalTicker,
        type,
        quantity: parseInt(quantity),
        date,
        exchangeRate: exchangeRate ? parseFloat(exchangeRate) : undefined,
      };
      if (effectivePrice) { body.price = parseFloat(effectivePrice); body.currency = currency; }
      if (isNewTicker) {
        body.newSpecies = { name: newName || finalTicker, sector: newSector, country: newCountry };
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
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border-strong)",
          width: "100%",
          maxWidth: 440,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Modal header */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border-strong)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg)",
          }}
        >
          <span style={{ ...mono, fontSize: 10, color: "var(--accent)", letterSpacing: 1, fontWeight: 600 }}>
            + NUEVA OPERACIÓN
          </span>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-dim)",
              fontSize: 20,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 16, display: "grid", gap: 14 }}>
          {/* Ticker */}
          <div ref={suggestionsRef} style={{ position: "relative" }}>
            <label style={labelStyle}>Ticker</label>
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
              style={inputStyle}
              required
            />
            {ticker && (
              <p style={{ ...mono, fontSize: 10, color: "var(--up)", marginTop: 3 }}>
                {speciesList.find((s) => s.ticker === ticker)?.name ?? ticker}
              </p>
            )}
            {showSuggestions && tickerInput && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  background: "var(--panel-alt)",
                  border: "1px solid var(--border-strong)",
                  borderTop: "none",
                  maxHeight: 180,
                  overflowY: "auto",
                  zIndex: 10,
                }}
              >
                {suggestions.map((s) => (
                  <button
                    key={s.ticker}
                    type="button"
                    onClick={() => selectTicker(s.ticker)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "7px 10px",
                      background: "transparent",
                      border: "none",
                      color: "var(--text)",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      ...mono,
                      fontSize: 11,
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--border)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                  >
                    <span style={{ fontWeight: 600 }}>{s.ticker}</span>
                    <span style={{ color: "var(--text-dim)", fontSize: 10 }}>{s.name}</span>
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
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "7px 10px",
                      background: "transparent",
                      border: "none",
                      color: "var(--accent)",
                      cursor: "pointer",
                      ...mono,
                      fontSize: 11,
                    }}
                  >
                    + Agregar &quot;{tickerInput.toUpperCase()}&quot; como nuevo ticker
                  </button>
                )}
              </div>
            )}
          </div>

          {/* New species fields */}
          {isNewTicker && (
            <div
              style={{
                padding: 10,
                background: "var(--panel-alt)",
                border: "1px solid var(--border)",
                display: "grid",
                gap: 8,
              }}
            >
              <p style={{ ...mono, fontSize: 9.5, color: "var(--text-dim)", margin: 0 }}>
                NUEVO TICKER — COMPLETÁ LOS DATOS:
              </p>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nombre (ej: Tesla Inc)"
                style={inputStyle}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <select
                  value={newSector}
                  onChange={(e) => setNewSector(e.target.value)}
                  style={{ ...inputStyle, background: "var(--panel-alt)" }}
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
                  style={{ ...inputStyle, background: "var(--panel-alt)" }}
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
          <div>
            <label style={labelStyle}>Tipo</label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["BUY", "SELL"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  style={{
                    ...mono,
                    fontSize: 10.5,
                    padding: "5px 16px",
                    cursor: "pointer",
                    border: `1px solid ${type === t ? (t === "BUY" ? "var(--up)" : "var(--down)") : "var(--border)"}`,
                    background: type === t ? (t === "BUY" ? "rgba(43,182,115,0.15)" : "rgba(231,76,60,0.15)") : "transparent",
                    color: type === t ? (t === "BUY" ? "var(--up)" : "var(--down)") : "var(--text-dim)",
                    letterSpacing: 0.8,
                  }}
                >
                  {t === "BUY" ? "COMPRA" : "VENTA"}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Cantidad</label>
              {type === "SELL" && defaultMaxQuantity != null && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ ...mono, fontSize: 9.5, color: "var(--text-mute)" }}>
                    Tenencia: <span style={{ color: "var(--text-dim)", fontWeight: 600 }}>{defaultMaxQuantity.toLocaleString("en-US")}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(String(defaultMaxQuantity))}
                    style={{
                      ...mono,
                      fontSize: 9,
                      padding: "2px 7px",
                      background: "rgba(231,76,60,0.15)",
                      border: "1px solid var(--down)",
                      color: "var(--down)",
                      cursor: "pointer",
                      letterSpacing: 0.5,
                    }}
                  >
                    TODO
                  </button>
                </div>
              )}
            </div>
            <MoneyInput
              value={quantity}
              onChange={(raw) => setQuantity(raw ? String(Math.floor(Math.abs(parseFloat(raw)))) : "")}
              placeholder="0"
              style={inputStyle}
              required
            />
          </div>

          {/* Total amount */}
          <div>
            <label style={labelStyle}>
              Monto total{" "}
              <span style={{ color: "var(--text-mute)", fontWeight: 400 }}>(opcional — calcula precio)</span>
            </label>
            <MoneyInput
              value={totalAmount}
              onChange={(raw) => { setTotalAmount(raw); if (raw) setPrice(""); }}
              placeholder="Ej: 500.000"
              style={inputStyle}
            />
            {derivedPrice && (
              <p style={{ ...mono, fontSize: 10, color: "var(--up)", marginTop: 3 }}>
                Precio: ${parseFloat(derivedPrice).toLocaleString("es-AR")} {currency}/u
              </p>
            )}
          </div>

          {/* Date */}
          <div>
            <label style={labelStyle}>Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          {/* Price */}
          <div>
            <label style={labelStyle}>
              Precio ARS{" "}
              <span style={{ color: "var(--text-mute)", fontWeight: 400 }}>(opcional — se busca automático)</span>
            </label>
            <div style={{ display: "flex" }}>
              <MoneyInput
                value={price}
                onChange={(raw) => { setPrice(raw); if (raw) setTotalAmount(""); }}
                placeholder={
                  fetchingPrice
                    ? "Buscando..."
                    : fetchedPrice
                    ? `Auto: $${fetchedPrice.toLocaleString("es-AR")}`
                    : "Automático"
                }
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                type="button"
                onClick={() => setCurrency(currency === "ARS" ? "USD" : "ARS")}
                style={{
                  ...mono,
                  fontSize: 10,
                  padding: "0 10px",
                  background: "var(--border)",
                  border: "1px solid var(--border-strong)",
                  borderLeft: "none",
                  color: "var(--text)",
                  cursor: "pointer",
                  letterSpacing: 0.5,
                  whiteSpace: "nowrap",
                }}
              >
                {currency}
              </button>
            </div>
            {fetchedPrice && !price && (
              <p style={{ ...mono, fontSize: 10, color: "var(--text-dim)", marginTop: 3 }}>
                Precio cierre {date}: ${fetchedPrice.toLocaleString("es-AR")} ARS
              </p>
            )}
          </div>

          {/* Exchange Rate */}
          <div>
            <label style={labelStyle}>
              Dólar MEP{" "}
              <span style={{ color: "var(--text-mute)", fontWeight: 400 }}>(opcional — se busca automático)</span>
            </label>
            <MoneyInput
              value={exchangeRate}
              onChange={(raw) => setExchangeRate(raw)}
              placeholder="Automático (AL30)"
              style={inputStyle}
            />
          </div>

          {error && (
            <p style={{ ...mono, fontSize: 10.5, color: "var(--down)" }}>{error}</p>
          )}

          {/* Actions */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                ...mono,
                padding: "10px 14px",
                border: "1px solid var(--border-strong)",
                background: "transparent",
                color: "var(--text)",
                cursor: "pointer",
                fontSize: 11,
                letterSpacing: 0.8,
              }}
            >
              CANCELAR
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                ...mono,
                padding: "10px 14px",
                border: "none",
                background: loading ? "var(--border)" : "var(--accent)",
                color: "var(--bg)",
                cursor: loading ? "default" : "pointer",
                fontSize: 11,
                letterSpacing: 0.8,
                fontWeight: 600,
              }}
            >
              {loading ? "GUARDANDO..." : "GUARDAR"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
