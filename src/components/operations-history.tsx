"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TransactionRow } from "@/lib/calculations";
import { formatUsd, formatArs, formatDate, formatNumber } from "@/lib/format";
import { NewOperationModal } from "./new-operation-modal";

interface Species {
  ticker: string;
  name: string;
}

const mono: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains, monospace)",
};

export function OperationsHistory({
  transactions,
  speciesList,
}: {
  transactions: TransactionRow[];
  speciesList: Species[];
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    ticker: "",
    type: "BUY" as "BUY" | "SELL",
    quantity: "",
    priceArs: "",
    exchangeRate: "",
    stockPriceUsd: "",
    date: "",
  });
  const [saving, setSaving] = useState(false);

  function startEdit(tx: TransactionRow) {
    setEditingId(tx.id);
    setEditForm({
      ticker: tx.ticker,
      type: tx.type as "BUY" | "SELL",
      quantity: String(tx.quantity),
      priceArs: String(tx.priceArs),
      exchangeRate: String(tx.exchangeRate),
      stockPriceUsd: tx.stockPriceUsd ? String(tx.stockPriceUsd) : "",
      date: tx.date,
    });
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          ticker: editForm.ticker,
          type: editForm.type,
          quantity: parseInt(editForm.quantity),
          priceArs: parseFloat(editForm.priceArs),
          exchangeRate: parseFloat(editForm.exchangeRate),
          stockPriceUsd: editForm.stockPriceUsd ? parseFloat(editForm.stockPriceUsd) : null,
          date: editForm.date,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Error al guardar");
        return;
      }
      setEditingId(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar esta operación?")) return;
    await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--panel-alt)",
    border: "1px solid var(--border-strong)",
    color: "var(--text)",
    fontFamily: "var(--font-jetbrains, monospace)",
    fontSize: 10.5,
    padding: "3px 6px",
    outline: "none",
  };

  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
      {/* Panel header */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            ...mono,
            color: "var(--accent)",
            fontSize: 10,
            letterSpacing: 1,
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          OPERACIONES · {transactions.length}
        </span>
        <button
          onClick={() => setShowModal(true)}
          style={{
            ...mono,
            fontSize: 10,
            color: "var(--text)",
            border: "1px solid var(--border)",
            padding: "3px 8px",
            cursor: "pointer",
            background: "transparent",
            letterSpacing: 0.5,
          }}
        >
          + NUEVA
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto" style={{ maxHeight: 400, overflowY: "auto" }}>
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
              {["FECHA", "TICKER", "TIPO", "CANT", "PRECIO $", "PRECIO USD", "TOTAL USD", "MEP", ""].map((h, i) => (
                <th
                  key={h + i}
                  style={{
                    textAlign: i > 2 ? "right" : "left",
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
            {transactions.map((tx) =>
              editingId === tx.id ? (
                <tr key={tx.id} style={{ borderBottom: "1px solid var(--border)", background: "var(--panel-alt)" }}>
                  <td style={{ padding: "6px 8px" }}>
                    <input
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                      style={{ ...inputStyle, width: 112 }}
                    />
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    <input
                      type="text"
                      value={editForm.ticker}
                      onChange={(e) => setEditForm({ ...editForm, ticker: e.target.value.toUpperCase() })}
                      style={{ ...inputStyle, width: 60 }}
                    />
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    <select
                      value={editForm.type}
                      onChange={(e) => setEditForm({ ...editForm, type: e.target.value as "BUY" | "SELL" })}
                      style={{ ...inputStyle }}
                    >
                      <option value="BUY">COMPRA</option>
                      <option value="SELL">VENTA</option>
                    </select>
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    <input
                      type="number"
                      value={editForm.quantity}
                      onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                      style={{ ...inputStyle, width: 60, textAlign: "right" }}
                    />
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.priceArs}
                      onChange={(e) => setEditForm({ ...editForm, priceArs: e.target.value })}
                      style={{ ...inputStyle, width: 80, textAlign: "right" }}
                    />
                  </td>
                  <td style={{ padding: "6px 12px", textAlign: "right", color: "var(--text-dim)", fontSize: 10.5 }}>
                    {editForm.priceArs && editForm.exchangeRate
                      ? formatNumber(parseFloat(editForm.priceArs) / parseFloat(editForm.exchangeRate))
                      : "—"}
                  </td>
                  <td style={{ padding: "6px 12px", textAlign: "right", color: "var(--text-dim)", fontSize: 10.5 }}>
                    {editForm.quantity && editForm.priceArs && editForm.exchangeRate
                      ? formatUsd(
                          (parseInt(editForm.quantity) * parseFloat(editForm.priceArs)) /
                            parseFloat(editForm.exchangeRate)
                        )
                      : "—"}
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.exchangeRate}
                      onChange={(e) => setEditForm({ ...editForm, exchangeRate: e.target.value })}
                      style={{ ...inputStyle, width: 60, textAlign: "right" }}
                    />
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={saveEdit}
                        disabled={saving}
                        style={{
                          ...mono,
                          fontSize: 10,
                          color: "var(--up)",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        {saving ? "..." : "OK"}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{
                          ...mono,
                          fontSize: 10,
                          color: "var(--text-dim)",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr
                  key={tx.id}
                  style={{ borderBottom: "1px solid var(--border)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--panel-alt)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <td style={{ padding: "7px 12px", color: "var(--text-dim)" }}>{formatDate(tx.date)}</td>
                  <td style={{ padding: "7px 12px", fontWeight: 600 }}>{tx.ticker}</td>
                  <td style={{ padding: "7px 12px" }}>
                    <TypeBadge type={tx.type as "BUY" | "SELL"} />
                  </td>
                  <td style={{ padding: "7px 12px", textAlign: "right", color: "var(--text-dim)" }}>
                    {tx.quantity.toLocaleString("en-US")}
                  </td>
                  <td style={{ padding: "7px 12px", textAlign: "right" }}>{formatArs(tx.priceArs)}</td>
                  <td style={{ padding: "7px 12px", textAlign: "right" }}>{formatNumber(tx.priceUsd)}</td>
                  <td style={{ padding: "7px 12px", textAlign: "right" }}>
                    <span data-money>{formatUsd(tx.totalUsd)}</span>
                  </td>
                  <td style={{ padding: "7px 12px", textAlign: "right", color: "var(--text-dim)" }}>
                    ${tx.exchangeRate.toFixed(0)}
                  </td>
                  <td style={{ padding: "7px 12px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => startEdit(tx)}
                        style={{
                          ...mono,
                          fontSize: 10,
                          color: "var(--text-mute)",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                        }}
                        title="Editar"
                      >
                        E
                      </button>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        style={{
                          ...mono,
                          fontSize: 10,
                          color: "var(--text-mute)",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                        }}
                        title="Eliminar"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--border)",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 8,
              ...mono,
              fontSize: 11,
            }}
          >
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontWeight: 600 }}>{tx.ticker}</span>
                <TypeBadge type={tx.type as "BUY" | "SELL"} />
              </div>
              <div style={{ fontSize: 9.5, color: "var(--text-dim)", marginTop: 3 }}>
                {formatDate(tx.date)} · {tx.quantity} × ${tx.priceUsd.toFixed(2)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 500 }} data-money>{formatUsd(tx.totalUsd)}</div>
              <div style={{ fontSize: 9.5, color: "var(--text-mute)" }}>MEP ${tx.exchangeRate.toFixed(0)}</div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <NewOperationModal
          speciesList={speciesList}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function TypeBadge({ type }: { type: "BUY" | "SELL" }) {
  const isBuy = type === "BUY";
  return (
    <span
      style={{
        fontSize: 9.5,
        color: isBuy ? "var(--up)" : "var(--down)",
        border: `1px solid ${isBuy ? "var(--up)" : "var(--down)"}`,
        padding: "1px 6px",
        letterSpacing: 0.6,
        fontFamily: "var(--font-jetbrains, monospace)",
      }}
    >
      {isBuy ? "COMPRA" : "VENTA"}
    </span>
  );
}
