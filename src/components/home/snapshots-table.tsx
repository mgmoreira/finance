"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { projectToGoal, targetAt, ageAt, type Scenario } from "@/lib/goals";
import type { WealthSnapshot } from "@/lib/wealth-data";
import { Panel, INPUT_STYLE, BTN_STYLE, TH_STYLE, TD_STYLE } from "./panel";
import { fmtUsd, fmtPct, fmtCut } from "./format";

const FIELDS = [
  ["stocksUsd", "ACCIONES"],
  ["bondsUsd", "BONOS"],
  ["cryptoUsd", "CRYPTO"],
  ["cashUsd", "CASH"],
] as const;

type Draft = { date: string; stocksUsd: string; bondsUsd: string; cryptoUsd: string; cashUsd: string };

export function SnapshotsTable({ snapshots, scenarios }: { snapshots: WealthSnapshot[]; scenarios: Scenario[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const visible = scenarios.filter((s) => s.visible).map((s) => ({ s, points: projectToGoal(s) }));

  function startEdit(snap?: WealthSnapshot) {
    setError(null);
    setIsNew(!snap);
    setDraft(
      snap
        ? {
            date: snap.date,
            stocksUsd: String(snap.stocksUsd),
            bondsUsd: String(snap.bondsUsd),
            cryptoUsd: String(snap.cryptoUsd),
            cashUsd: String(snap.cashUsd),
          }
        : { date: "", stocksUsd: "0", bondsUsd: "0", cryptoUsd: "0", cashUsd: "0" }
    );
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/wealth/snapshots", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Error al guardar");
      return;
    }
    setDraft(null);
    router.refresh();
  }

  async function remove(id: number) {
    if (!confirm("¿Borrar este corte?")) return;
    await fetch(`/api/wealth/snapshots?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  const editInputs = (
    <>
      {FIELDS.map(([key]) => (
        <td key={key} style={TD_STYLE}>
          <input
            style={{ ...INPUT_STYLE, width: 90, textAlign: "right" }}
            type="text"
            inputMode="decimal"
            value={draft?.[key] ?? ""}
            onChange={(e) => setDraft((d) => (d ? { ...d, [key]: e.target.value } : d))}
          />
        </td>
      ))}
      <td style={TD_STYLE} colSpan={2 + visible.length}>
        <button style={BTN_STYLE} onClick={save} disabled={saving}>{saving ? "..." : "GUARDAR"}</button>{" "}
        <button style={BTN_STYLE} onClick={() => setDraft(null)}>CANCELAR</button>
      </td>
    </>
  );

  return (
    <Panel title={`CORTES · ${snapshots.length}`} right={<button style={BTN_STYLE} onClick={() => startEdit()}>+ CORTE</button>}>
      {error && <div style={{ padding: "6px 14px", color: "var(--down)", fontSize: 11 }}>{error}</div>}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, fontVariantNumeric: "tabular-nums" }}>
          <thead>
            <tr>
              <th style={{ ...TH_STYLE, textAlign: "left" }}>FECHA</th>
              <th style={TH_STYLE}>EDAD</th>
              {FIELDS.map(([key, label]) => (
                <th key={key} style={TH_STYLE}>{label}</th>
              ))}
              <th style={TH_STYLE}>TOTAL</th>
              {visible.map(({ s }) => (
                <th key={s.id} style={{ ...TH_STYLE, color: s.color }}>VS {s.name}</th>
              ))}
              <th style={TH_STYLE} />
            </tr>
          </thead>
          <tbody>
            {isNew && draft && (
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ ...TD_STYLE, textAlign: "left" }}>
                  <input
                    style={{ ...INPUT_STYLE, width: 130 }}
                    type="date"
                    value={draft.date}
                    onChange={(e) => setDraft((d) => (d ? { ...d, date: e.target.value } : d))}
                  />
                </td>
                <td style={TD_STYLE} />
                {editInputs}
              </tr>
            )}
            {snapshots.map((snap) => {
              const editing = !isNew && draft?.date === snap.date;
              return (
                <tr key={snap.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ ...TD_STYLE, textAlign: "left", fontWeight: 600 }}>
                    {fmtCut(snap.date)}
                    {snap.source === "auto" && <span style={{ color: "var(--text-mute)", fontSize: 9, marginLeft: 6 }}>AUTO</span>}
                  </td>
                  <td style={{ ...TD_STYLE, color: "var(--text-dim)" }}>{ageAt(snap.date)}</td>
                  {editing ? (
                    editInputs
                  ) : (
                    <>
                      {FIELDS.map(([key]) => (
                        <td key={key} style={{ ...TD_STYLE, color: "var(--text-dim)" }}>
                          <span data-money>{fmtUsd(snap[key])}</span>
                        </td>
                      ))}
                      <td style={{ ...TD_STYLE, fontWeight: 600 }}>
                        <span data-money>{fmtUsd(snap.total)}</span>
                      </td>
                      {visible.map(({ s, points }) => {
                        const target = targetAt(points, snap.date);
                        if (target == null || target <= 0) return <td key={s.id} style={{ ...TD_STYLE, color: "var(--text-mute)" }}>—</td>;
                        const pct = (snap.total / target - 1) * 100;
                        return (
                          <td key={s.id} style={{ ...TD_STYLE, color: pct >= 0 ? "var(--up)" : "var(--down)" }}>
                            {fmtPct(pct)}
                          </td>
                        );
                      })}
                      <td style={{ ...TD_STYLE, color: "var(--text-mute)" }}>
                        <button style={{ ...BTN_STYLE, padding: "2px 6px" }} onClick={() => startEdit(snap)}>✎</button>{" "}
                        <button style={{ ...BTN_STYLE, padding: "2px 6px" }} onClick={() => remove(snap.id)}>✕</button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
