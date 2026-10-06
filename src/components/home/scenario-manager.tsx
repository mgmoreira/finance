"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Scenario } from "@/lib/goals";
import { Panel, INPUT_STYLE, BTN_STYLE } from "./panel";
import { numOrNull } from "@/lib/wealth-input";

type Draft = {
  id: number | null;
  name: string;
  color: string;
  visible: boolean;
  startYear: string;
  startValue: string;
  ratePct: string;
  contribution: string;
  bonusFactor: string;
  bonusSchedule: string;
  endYear: string;
  sortOrder: number;
};

function toDraft(s: Scenario): Draft {
  return {
    id: s.id,
    name: s.name,
    color: s.color,
    visible: s.visible,
    startYear: String(s.startYear),
    startValue: String(s.startValue),
    ratePct: String(Math.round(s.rate * 100 * 10000) / 10000),
    contribution: String(s.contribution),
    bonusFactor: String(s.bonusFactor),
    bonusSchedule: s.bonusSchedule.join(", "),
    endYear: String(s.endYear),
    sortOrder: s.sortOrder,
  };
}

// UI works in % for the rate; the API expects a fraction
function toBody(d: Draft) {
  return {
    id: d.id,
    name: d.name,
    color: d.color,
    visible: d.visible,
    startYear: numOrNull(d.startYear),
    startValue: numOrNull(d.startValue),
    rate: numOrNull(d.ratePct) === null ? null : numOrNull(d.ratePct)! / 100,
    contribution: numOrNull(d.contribution),
    bonusFactor: d.bonusFactor.trim() === "" ? 0 : numOrNull(d.bonusFactor),
    bonusSchedule: d.bonusSchedule.split(",").map((x) => x.trim()).filter(Boolean).map(numOrNull),
    endYear: numOrNull(d.endYear),
    sortOrder: d.sortOrder,
  };
}

const fmtNum = (v: number) => v.toLocaleString("es-AR", { maximumFractionDigits: 2 });

// Human-readable yearly formula, e.g. "valor × 1,1 + 18.000 + bono × 0,67"
function formulaText(s: Scenario): string {
  const parts = [s.rate === 0 ? "valor" : `valor × ${fmtNum(1 + s.rate)}`];
  if (s.contribution !== 0) parts.push(fmtNum(s.contribution));
  if (s.bonusFactor > 0) parts.push(`bono × ${fmtNum(s.bonusFactor)}`);
  return parts.join(" + ") + " por año";
}

const FIELDS: [keyof Draft, string][] = [
  ["name", "NOMBRE"],
  ["startYear", "AÑO INICIAL"],
  ["startValue", "VALOR INICIAL"],
  ["ratePct", "TASA % ANUAL"],
  ["contribution", "APORTE / AÑO"],
  ["bonusFactor", "FACTOR BONO"],
  ["bonusSchedule", "BONO POR AÑO (desde 2025)"],
];

export function ScenarioManager({ scenarios }: { scenarios: Scenario[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(method: "POST" | "PUT", d: Draft) {
    setError(null);
    const res = await fetch("/api/wealth/scenarios", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toBody(d)),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Error al guardar");
      return false;
    }
    router.refresh();
    return true;
  }

  async function save() {
    if (!draft) return;
    if (await send(draft.id == null ? "POST" : "PUT", draft)) setDraft(null);
  }

  async function toggleVisible(s: Scenario) {
    await send("PUT", { ...toDraft(s), visible: !s.visible });
  }

  async function remove(s: Scenario) {
    if (!confirm(`¿Borrar el escenario "${s.name}"?`)) return;
    await fetch(`/api/wealth/scenarios?id=${s.id}`, { method: "DELETE" });
    router.refresh();
  }

  function startNew() {
    setError(null);
    setDraft({
      id: null, name: "Nuevo", color: "#4a9eff", visible: true, startYear: "2025", startValue: "",
      ratePct: "10", contribution: "0", bonusFactor: "0", bonusSchedule: "", endYear: "2045",
      sortOrder: scenarios.length,
    });
  }

  return (
    <Panel
      title={`ESCENARIOS · ${scenarios.length}`}
      right={
        <span style={{ display: "flex", gap: 6 }}>
          {open && <button style={BTN_STYLE} onClick={startNew}>+ ESCENARIO</button>}
          <button style={BTN_STYLE} onClick={() => setOpen((o) => !o)}>{open ? "CERRAR" : "EDITAR"}</button>
        </span>
      }
    >
      {open && (
        <div style={{ padding: "8px 14px 12px", fontSize: 11 }}>
          {error && <div style={{ color: "var(--down)", marginBottom: 8 }}>{error}</div>}
          {scenarios.map((s) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
              <input type="checkbox" checked={s.visible} onChange={() => toggleVisible(s)} title="Mostrar en gráfico" />
              <span style={{ width: 10, height: 10, background: s.color, display: "inline-block" }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 600 }}>{s.name}</span>
                <span style={{ display: "block", color: "var(--text-dim)", fontSize: 10.5, marginTop: 2 }}>
                  {formulaText(s)}
                </span>
                <span style={{ display: "block", color: "var(--text-mute)", fontSize: 9.5, marginTop: 1 }}>
                  base {fmtNum(s.startValue)} en {s.startYear} (se mide 1/3/{s.startYear + 1})
                  {s.bonusFactor > 0 && s.bonusSchedule.length > 0 ? ` · bono: ${s.bonusSchedule.map(fmtNum).join(" → ")} fijo` : ""}
                </span>
              </span>
              <button style={{ ...BTN_STYLE, padding: "2px 6px" }} onClick={() => { setError(null); setDraft(toDraft(s)); }}>✎</button>
              <button style={{ ...BTN_STYLE, padding: "2px 6px" }} onClick={() => remove(s)}>✕</button>
            </div>
          ))}

          {draft && (
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
              {FIELDS.map(([key, label]) => (
                <label key={key} style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 9, color: "var(--text-dim)", letterSpacing: 0.6 }}>
                  {label}
                  <input
                    style={INPUT_STYLE}
                    value={String(draft[key])}
                    onChange={(e) => setDraft((d) => (d ? { ...d, [key]: e.target.value } : d))}
                  />
                </label>
              ))}
              <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 9, color: "var(--text-dim)", letterSpacing: 0.6 }}>
                COLOR
                <input
                  type="color"
                  style={{ ...INPUT_STYLE, height: 24, padding: 0 }}
                  value={draft.color}
                  onChange={(e) => setDraft((d) => (d ? { ...d, color: e.target.value } : d))}
                />
              </label>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
                <button style={BTN_STYLE} onClick={save}>GUARDAR</button>
                <button style={BTN_STYLE} onClick={() => setDraft(null)}>CANCELAR</button>
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
