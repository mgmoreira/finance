"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InvestmentByDate } from "@/lib/calculations";
import { formatUsd, formatDate, formatMonth } from "@/lib/format";

interface Props {
  byDate: InvestmentByDate[];
  byMonth: { month: string; totalUsd: number }[];
}

function CashDepositModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Ingresá un monto válido"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "ADJUSTMENT", amount: amt, currency: "USD", date, description: description || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      router.refresh();
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <form
        onSubmit={handleSubmit}
        style={{ background: "var(--panel)", border: "1px solid var(--border-strong)", padding: 20, width: 320, fontFamily: "var(--font-jetbrains, monospace)" }}
      >
        <div style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.12em", marginBottom: 16 }}>
          NUEVO APORTE USD
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ fontSize: 10, color: "var(--text-dim)", display: "flex", flexDirection: "column", gap: 4 }}>
            MONTO (USD)
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
              style={{ background: "var(--panel-alt)", border: "1px solid var(--border-strong)", color: "var(--text)", fontFamily: "inherit", fontSize: 13, padding: "5px 8px", outline: "none" }}
            />
          </label>
          <label style={{ fontSize: 10, color: "var(--text-dim)", display: "flex", flexDirection: "column", gap: 4 }}>
            FECHA
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ background: "var(--panel-alt)", border: "1px solid var(--border-strong)", color: "var(--text)", fontFamily: "inherit", fontSize: 12, padding: "5px 8px", outline: "none" }}
            />
          </label>
          <label style={{ fontSize: 10, color: "var(--text-dim)", display: "flex", flexDirection: "column", gap: 4 }}>
            DESCRIPCIÓN (opcional)
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ej: ahorro extra, dividendo, etc."
              style={{ background: "var(--panel-alt)", border: "1px solid var(--border-strong)", color: "var(--text)", fontFamily: "inherit", fontSize: 12, padding: "5px 8px", outline: "none" }}
            />
          </label>
        </div>
        {error && <div style={{ fontSize: 10, color: "var(--down)", marginTop: 8 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button
            type="submit"
            disabled={loading}
            style={{ flex: 1, background: "var(--up)", border: "none", color: "#0a0e0d", fontFamily: "inherit", fontWeight: 700, fontSize: 10, letterSpacing: "0.08em", padding: "7px 0", cursor: "pointer", opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "GUARDANDO..." : "GUARDAR"}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: "7px 14px", background: "var(--panel)", border: "1px solid var(--border-strong)", color: "var(--text-dim)", fontFamily: "inherit", fontSize: 10, letterSpacing: "0.08em", cursor: "pointer" }}
          >
            CANCELAR
          </button>
        </div>
      </form>
    </div>
  );
}

const mono: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains, monospace)",
};

export function InvestmentsByDate({ byDate, byMonth }: Props) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {showModal && <CashDepositModal onClose={() => setShowModal(false)} />}
      <style>{`
        .ibd-h { padding: 10px 14px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
        .ibd-h__title { font-family: var(--font-jetbrains, monospace); color: var(--accent); font-size: 10px; letter-spacing: 1px; font-weight: 600; text-transform: uppercase; flex-shrink: 0; }
        .ibd-chips { display: flex; gap: 6px; flex-wrap: wrap; }
        @media (max-width: 767px) {
          .ibd-h { padding: 9px 12px; }
          .ibd-chips { flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; max-width: 100%; }
          .ibd-chips::-webkit-scrollbar { display: none; }
        }
      `}</style>
      <div style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
        {/* Panel title */}
        <div className="ibd-h">
          <span className="ibd-h__title">APORTES POR FECHA</span>
          <button
            onClick={() => setShowModal(true)}
            style={{ background: "var(--panel)", border: "1px solid var(--border-strong)", color: "var(--text-dim)", fontFamily: "var(--font-jetbrains, monospace)", fontSize: 9, letterSpacing: "0.08em", padding: "3px 9px", cursor: "pointer" }}
          >
            + APORTE USD
          </button>
          {/* Monthly chips */}
          <div className="ibd-chips">
            {byMonth.map((m) => (
              <span
                key={m.month}
                style={{
                  ...mono,
                  fontSize: 10,
                  color: "var(--text-dim)",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  padding: "2px 8px",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {formatMonth(m.month)}{" "}
                <span style={{ color: "var(--accent)" }} data-money>
                  {formatUsd(m.totalUsd)}
                </span>
              </span>
            ))}
          </div>
        </div>

      {/* Table */}
      <div style={{ overflowX: "auto", maxHeight: 280, overflowY: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            ...mono,
            fontSize: 11,
            fontVariantNumeric: "tabular-nums",
            color: "var(--text)",
          }}
        >
          <thead style={{ position: "sticky", top: 0, background: "var(--panel)" }}>
            <tr>
              {["FECHA", "TOTAL USD", "ACUMULADO", "TICKERS"].map((h, i) => (
                <th
                  key={h}
                  style={{
                    textAlign: i === 0 || i === 3 ? "left" : "right",
                    padding: "7px 12px",
                    borderBottom: "1px solid var(--border)",
                    fontWeight: 500,
                    color: "var(--text-mute)",
                    fontSize: 9.5,
                    letterSpacing: 0.8,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...byDate].reverse().map((row) => (
              <tr
                key={row.date}
                style={{ borderBottom: "1px solid var(--border)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--panel-alt)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <td style={{ padding: "6px 12px", color: "var(--text-dim)" }}>
                  {formatDate(row.date)}
                </td>
                <td style={{ padding: "6px 12px", textAlign: "right" }}>
                  <span data-money>{formatUsd(row.totalUsd)}</span>
                </td>
                <td style={{ padding: "6px 12px", textAlign: "right", color: "var(--text-dim)" }}>
                  <span data-money>{formatUsd(row.accumulated)}</span>
                </td>
                <td style={{ padding: "6px 12px", color: "var(--text-mute)", fontSize: 10 }}>
                  {row.tickers.join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </>
  );
}
