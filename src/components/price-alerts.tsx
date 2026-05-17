"use client";

import { useState, useEffect } from "react";

interface Alert {
  id: number;
  ticker: string;
  condition: "above" | "below";
  targetPrice: number;
  active: number;
  createdAt: string;
  triggeredAt: string | null;
}

export function PriceAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [ticker, setTicker] = useState("");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [targetPrice, setTargetPrice] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/alerts");
    setAlerts(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function add() {
    if (!ticker || !targetPrice) return;
    setSaving(true);
    await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, condition, targetPrice: Number(targetPrice) }),
    });
    setTicker("");
    setTargetPrice("");
    await load();
    setSaving(false);
  }

  async function remove(id: number) {
    await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
    await load();
  }

  const active = alerts.filter((a) => a.active === 1);
  const triggered = alerts.filter((a) => a.active === 0).slice(0, 10);

  return (
    <div style={{ background: "#111519", border: "1px solid #1e2530", margin: "0 0 12px", fontFamily: "Courier New, monospace", fontSize: 11, color: "#c8d4e0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 12px", borderBottom: "1px solid #1e2530", background: "#0d1117" }}>
        <b style={{ fontSize: 10, letterSpacing: "0.12em", color: "#f0a500" }}>ALERTAS DE PRECIO · EEUU</b>
        <span style={{ fontSize: 9, color: "#7a8189" }}>{active.length} activa{active.length !== 1 ? "s" : ""} · cada 30min</span>
      </div>

      {/* Form */}
      <div style={{ display: "flex", gap: 6, padding: "8px 12px", borderBottom: "1px solid #1e2530", flexWrap: "wrap" }}>
        <input
          placeholder="TICKER"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          style={{ background: "#1a2030", border: "1px solid #2a3545", color: "#c8d4e0", fontSize: 10, padding: "3px 8px", fontFamily: "inherit", outline: "none", width: 80 }}
        />
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value as "above" | "below")}
          style={{ background: "#1a2030", border: "1px solid #2a3545", color: "#c8d4e0", fontSize: 10, padding: "3px 8px", fontFamily: "inherit", outline: "none" }}
        >
          <option value="above">supera</option>
          <option value="below">baja de</option>
        </select>
        <input
          placeholder="$ precio"
          value={targetPrice}
          onChange={(e) => setTargetPrice(e.target.value)}
          type="number"
          min="0"
          step="0.01"
          style={{ background: "#1a2030", border: "1px solid #2a3545", color: "#c8d4e0", fontSize: 10, padding: "3px 8px", fontFamily: "inherit", outline: "none", width: 90 }}
        />
        <button
          onClick={add}
          disabled={saving || !ticker || !targetPrice}
          style={{ background: "#1a2030", border: "1px solid #2a3545", color: "#c8d4e0", fontSize: 9, letterSpacing: "0.08em", padding: "4px 12px", cursor: "pointer", fontFamily: "inherit" }}
        >
          {saving ? "..." : "+ AGREGAR"}
        </button>
      </div>

      {/* Active alerts */}
      {active.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ padding: "5px 8px", fontSize: 9, letterSpacing: "0.08em", color: "#7a8189", borderBottom: "1px solid #1e2530", textAlign: "left" }}>TICKER</th>
              <th style={{ padding: "5px 8px", fontSize: 9, letterSpacing: "0.08em", color: "#7a8189", borderBottom: "1px solid #1e2530", textAlign: "left" }}>CONDICIÓN</th>
              <th style={{ padding: "5px 8px", fontSize: 9, letterSpacing: "0.08em", color: "#7a8189", borderBottom: "1px solid #1e2530", textAlign: "right" }}>PRECIO</th>
              <th style={{ padding: "5px 8px", fontSize: 9, letterSpacing: "0.08em", color: "#7a8189", borderBottom: "1px solid #1e2530" }}></th>
            </tr>
          </thead>
          <tbody>
            {active.map((a) => (
              <tr key={a.id}>
                <td style={{ padding: "5px 8px", fontWeight: 700, color: "#f0a500" }}>{a.ticker}</td>
                <td style={{ padding: "5px 8px", color: "#7a8189" }}>{a.condition === "above" ? "supera" : "baja de"}</td>
                <td style={{ padding: "5px 8px", textAlign: "right", color: "#6b8fc4" }}>${a.targetPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                <td style={{ padding: "5px 8px", textAlign: "right" }}>
                  <button
                    onClick={() => remove(a.id)}
                    style={{ background: "transparent", border: "none", color: "#7a8189", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {active.length === 0 && (
        <div style={{ padding: "16px", textAlign: "center", color: "#4a5568", fontSize: 10, letterSpacing: "0.1em" }}>
          SIN ALERTAS ACTIVAS
        </div>
      )}

      {/* Triggered history */}
      {triggered.length > 0 && (
        <div style={{ borderTop: "1px solid #1e2530" }}>
          <div style={{ padding: "5px 12px", fontSize: 9, color: "#4a5568", letterSpacing: "0.08em" }}>DISPARADAS</div>
          {triggered.map((a) => (
            <div key={a.id} style={{ padding: "4px 12px", display: "flex", gap: 10, color: "#4a5568", fontSize: 10, borderTop: "1px solid #131920" }}>
              <span style={{ fontWeight: 700 }}>{a.ticker}</span>
              <span>{a.condition === "above" ? "superó" : "bajó de"} ${a.targetPrice}</span>
              <span style={{ marginLeft: "auto" }}>{a.triggeredAt ? new Date(a.triggeredAt).toLocaleDateString("es-AR") : ""}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
