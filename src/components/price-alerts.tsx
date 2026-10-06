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
  currentPrice: number | null;
}

function fmtP(v: number) {
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const PA_CSS = `
.pa-wrap { background: #111519; border: 1px solid #1e2530; margin: 0 0 12px; font-family: Courier New, monospace; font-size: 11px; color: #c8d4e0; }
.pa-h { display: flex; align-items: center; justify-content: space-between; padding: 7px 12px; border-bottom: 1px solid #1e2530; background: #0d1117; gap: 8px; flex-wrap: wrap; }
.pa-h b { font-size: 10px; letter-spacing: 0.12em; color: #f0a500; }
.pa-h__sub { font-size: 9px; color: #7a8189; white-space: nowrap; }
.pa-form { display: flex; gap: 6px; padding: 8px 12px; border-bottom: 1px solid #1e2530; flex-wrap: wrap; align-items: center; }
.pa-inp { background: #1a2030; border: 1px solid #2a3545; color: #c8d4e0; font-size: 10px; padding: 3px 8px; font-family: inherit; outline: none; }
.pa-inp.tk { width: 80px; }
.pa-inp.pr { width: 90px; }
.pa-btn { background: #1a2030; border: 1px solid #2a3545; color: #c8d4e0; font-size: 9px; letter-spacing: 0.08em; padding: 4px 12px; cursor: pointer; font-family: inherit; white-space: nowrap; }
.pa-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.pa-empty { padding: 16px; text-align: center; color: #4a5568; font-size: 10px; letter-spacing: 0.1em; }
.pa-tbl { width: 100%; border-collapse: collapse; }
.pa-tbl th { padding: 5px 8px; font-size: 9px; letter-spacing: 0.08em; color: #7a8189; border-bottom: 1px solid #1e2530; text-align: left; }
.pa-tbl th.r { text-align: right; }
.pa-tbl td { padding: 5px 8px; }
.pa-tbl td.r { text-align: right; }
.pa-trig-h { padding: 5px 12px; font-size: 9px; color: #4a5568; letter-spacing: 0.08em; border-top: 1px solid #1e2530; }
.pa-trig { padding: 4px 12px; display: flex; gap: 10px; color: #4a5568; font-size: 10px; border-top: 1px solid #131920; align-items: center; }
.pa-x { background: transparent; border: none; color: #7a8189; cursor: pointer; font-size: 11px; font-family: inherit; padding: 0; }

@media (max-width: 767px) {
  .pa-wrap { margin: 0 0 10px; }
  .pa-h { padding: 7px 10px; }
  .pa-h b { font-size: 9.5px; letter-spacing: 0.1em; }
  .pa-h__sub { font-size: 8.5px; }
  .pa-form { padding: 8px 10px; gap: 5px; }
  .pa-inp.tk { flex: 1 1 0; min-width: 70px; width: auto; font-size: 12px; padding: 5px 8px; }
  .pa-inp.pr { flex: 1 1 0; min-width: 80px; width: auto; font-size: 12px; padding: 5px 8px; }
  .pa-form select { flex: 0 1 auto; font-size: 12px; padding: 5px 8px; }
  .pa-btn { flex: 1 0 100%; padding: 7px 12px; font-size: 10px; text-align: center; margin-top: 2px; }
  .pa-tbl th { padding: 5px 10px; }
  .pa-tbl td { padding: 7px 10px; font-size: 11px; }
  .pa-trig { padding: 5px 10px; font-size: 10px; }
}
`;

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
    <>
      <style>{PA_CSS}</style>
      <div className="pa-wrap">
        <div className="pa-h">
          <b>ALERTAS DE PRECIO · EEUU</b>
          <span className="pa-h__sub">{active.length} activa{active.length !== 1 ? "s" : ""} · cada 30min</span>
        </div>

        {/* Form */}
        <div className="pa-form">
          <input
            className="pa-inp tk"
            placeholder="TICKER"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
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
            className="pa-inp pr"
            placeholder="$ precio"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            type="number"
            min="0"
            step="0.01"
          />
          <button
            className="pa-btn"
            onClick={add}
            disabled={saving || !ticker || !targetPrice}
          >
            {saving ? "..." : "+ AGREGAR"}
          </button>
        </div>

        {/* Active alerts */}
        {active.length > 0 && (
          <table className="pa-tbl">
            <thead>
              <tr>
                <th>TICKER</th>
                <th>CONDICIÓN</th>
                <th className="r">OBJETIVO</th>
                <th className="r">ACTUAL</th>
                <th className="r">FALTA</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {active.map((a) => {
                // % move still needed to trigger (positive = must rise, negative = must fall)
                const falta = a.currentPrice ? ((a.targetPrice / a.currentPrice) - 1) * 100 : null;
                return (
                <tr key={a.id}>
                  <td style={{ fontWeight: 700, color: "#f0a500" }}>{a.ticker}</td>
                  <td style={{ color: "#7a8189" }}>{a.condition === "above" ? "supera" : "baja de"}</td>
                  <td className="r" style={{ color: "#6b8fc4" }}>{fmtP(a.targetPrice)}</td>
                  <td className="r">{a.currentPrice ? fmtP(a.currentPrice) : "—"}</td>
                  <td className="r" style={{ color: falta === null ? "#7a8189" : falta >= 0 ? "#2bb673" : "#e74c3c" }}>
                    {falta === null ? "—" : (falta >= 0 ? "+" : "") + falta.toFixed(1) + "%"}
                  </td>
                  <td className="r">
                    <button onClick={() => remove(a.id)} className="pa-x">✕</button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {active.length === 0 && (
          <div className="pa-empty">SIN ALERTAS ACTIVAS</div>
        )}

        {/* Triggered history */}
        {triggered.length > 0 && (
          <div>
            <div className="pa-trig-h">DISPARADAS</div>
            {triggered.map((a) => (
              <div key={a.id} className="pa-trig">
                <span style={{ fontWeight: 700 }}>{a.ticker}</span>
                <span>{a.condition === "above" ? "superó" : "bajó de"} ${a.targetPrice}</span>
                <span style={{ marginLeft: "auto" }}>{a.triggeredAt ? new Date(a.triggeredAt).toLocaleDateString("es-AR") : ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
