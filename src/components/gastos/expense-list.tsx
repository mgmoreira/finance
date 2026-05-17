"use client";

import { useState, useEffect } from "react";
import { formatArs, formatDate } from "@/lib/format";
import type { ExpenseRow, CategoryInfo } from "@/lib/gastos-data";
import { MoneyInput } from "./money-input";

interface ExpenseListProps {
  expenses: ExpenseRow[];
  categories: CategoryInfo[];
  budgetId: number;
  onMutate?: () => void;
  triggerAdd?: number;
}

export function ExpenseList({ expenses, categories, budgetId, onMutate, triggerAdd = 0 }: ExpenseListProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategoryId, setNewCategoryId] = useState<string>("");
  const [newAmount, setNewAmount] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newNotes, setNewNotes] = useState("");

  useEffect(() => {
    if (triggerAdd > 0) setShowAdd(true);
  }, [triggerAdd]);

  const pending = expenses.filter((e) => e.amount === null);
  const completed = expenses.filter((e) => e.amount !== null);
  const total = completed.reduce((s, e) => s + (e.amount ?? 0), 0);
  const fixed = completed.filter((e) => e.templateId).reduce((s, e) => s + (e.amount ?? 0), 0);
  const variable = total - fixed;

  function startEdit(exp: ExpenseRow) {
    setEditingId(exp.id);
    setEditAmount(exp.amount !== null ? String(exp.amount) : "");
    setEditDate(exp.date ?? new Date().toISOString().slice(0, 10));
    setEditNotes(exp.notes ?? "");
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/gastos/expenses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          amount: editAmount ? parseFloat(editAmount) : null,
          date: editDate || null,
          notes: editNotes || null,
        }),
      });
      if (res.ok) { setEditingId(null); onMutate?.(); }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este gasto?")) return;
    const res = await fetch(`/api/gastos/expenses?id=${id}`, { method: "DELETE" });
    if (res.ok) onMutate?.();
  }

  async function addExpense() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/gastos/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetId,
          name: newName.trim(),
          categoryId: newCategoryId ? parseInt(newCategoryId) : null,
          amount: newAmount ? parseFloat(newAmount) : null,
          date: newDate || null,
          notes: newNotes || null,
        }),
      });
      if (res.ok) {
        setShowAdd(false);
        setNewName("");
        setNewCategoryId("");
        setNewAmount("");
        setNewDate(new Date().toISOString().slice(0, 10));
        setNewNotes("");
        onMutate?.();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="t1-pn">
      <div className="t1-pn__h">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <b>MOVIMIENTOS</b>
          <span>
            {completed.length} cargados{" "}
            {pending.length > 0 && <span style={{ color: "var(--accent)" }}>· {pending.length} pendientes</span>}
          </span>
          {total > 0 && (
            <span>
              fijos {formatArs(fixed)} · variables {formatArs(variable)}
            </span>
          )}
        </div>
        <button className="t1-btn" style={{ padding: "3px 10px" }} onClick={() => setShowAdd(true)}>
          + AGREGAR
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ padding: 12, borderBottom: "1px solid var(--border-strong)", background: "var(--panel-alt)", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, flexWrap: "wrap" }}>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre del gasto"
              className="t1-inp"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && addExpense()}
            />
            <select
              value={newCategoryId}
              onChange={(e) => setNewCategoryId(e.target.value)}
              className="t1-inp"
            >
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <MoneyInput
              value={newAmount}
              onChange={setNewAmount}
              placeholder="Monto"
              className="t1-inp"
            />
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="t1-inp"
            />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Notas (opcional)"
              className="t1-inp"
              style={{ flex: 1 }}
            />
            <button
              className="t1-btn accent"
              onClick={addExpense}
              disabled={saving || !newName.trim()}
            >
              {saving ? "..." : "AGREGAR"}
            </button>
            <button className="t1-btn" onClick={() => setShowAdd(false)}>CANCELAR</button>
          </div>
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table className="t1-tbl">
          <thead>
            <tr>
              <th style={{ width: 80 }}>FECHA</th>
              <th>CONCEPTO</th>
              <th>CATEGORÍA</th>
              <th style={{ width: 60 }}>EST</th>
              <th className="r">MONTO</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {/* Pending rows first */}
            {pending.map((exp) => (
              <tr
                key={exp.id}
                className={`t1-pend${exp.templateId ? " t1-fix" : " t1-var"}`}
                style={{ cursor: "pointer" }}
                onClick={() => startEdit(exp)}
              >
                <td style={{ color: "var(--text-dim)", fontSize: 10 }}>—</td>
                <td>
                  {exp.name}
                  {exp.templateId && <span style={{ color: "var(--text-mute)", marginLeft: 6, fontSize: 9 }}>↻</span>}
                </td>
                <td>
                  {exp.categoryName && (
                    <span style={{ color: exp.categoryColor ?? "var(--text-dim)", fontSize: 10 }}>
                      ▪ {exp.categoryName}
                    </span>
                  )}
                </td>
                <td><span className="pill pend">PEND</span></td>
                <td className="r" style={{ color: "var(--accent)", fontSize: 10 }}>CARGAR</td>
                <td />
              </tr>
            ))}

            {/* Completed rows */}
            {completed.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")).map((exp) => {
              const isEditing = editingId === exp.id;
              if (isEditing) {
                return (
                  <tr key={exp.id} className="t1-edit">
                    <td>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="t1-inp"
                        style={{ width: 110, fontSize: 10 }}
                      />
                    </td>
                    <td style={{ color: "var(--text)", fontWeight: 600 }}>{exp.name}</td>
                    <td>
                      {exp.categoryName && (
                        <span style={{ color: exp.categoryColor ?? "var(--text-dim)", fontSize: 10 }}>
                          ▪ {exp.categoryName}
                        </span>
                      )}
                    </td>
                    <td>
                      <input
                        type="text"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Notas"
                        className="t1-inp"
                        style={{ width: 100, fontSize: 10 }}
                      />
                    </td>
                    <td className="r">
                      <MoneyInput
                        value={editAmount}
                        onChange={setEditAmount}
                        placeholder="Monto"
                        className="t1-inp"
                        style={{ width: 110, textAlign: "right" }}
                        autoFocus
                      />
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="t1-btn accent" style={{ padding: "2px 7px", fontSize: 9 }} onClick={saveEdit} disabled={saving}>
                          {saving ? "..." : "OK"}
                        </button>
                        <button className="t1-btn" style={{ padding: "2px 7px", fontSize: 9 }} onClick={() => setEditingId(null)}>
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }
              return (
                <tr
                  key={exp.id}
                  className={exp.templateId ? "t1-fix" : "t1-var"}
                  style={{ cursor: "pointer" }}
                  onClick={() => startEdit(exp)}
                  title="Click para editar"
                >
                  <td style={{ color: "var(--text-dim)", fontSize: 10 }}>
                    {exp.date ? formatDate(exp.date) : "—"}
                  </td>
                  <td>
                    {exp.name}
                    {exp.templateId && <span style={{ color: "var(--text-mute)", marginLeft: 6, fontSize: 9 }}>↻</span>}
                    {exp.notes && <span style={{ color: "var(--text-mute)", marginLeft: 6, fontSize: 9 }}>({exp.notes})</span>}
                  </td>
                  <td>
                    {exp.categoryName && (
                      <span style={{ color: exp.categoryColor ?? "var(--text-dim)", fontSize: 10 }}>
                        ▪ {exp.categoryName}
                      </span>
                    )}
                  </td>
                  <td><span className="pill paid">OK</span></td>
                  <td className="r" data-money>{formatArs(exp.amount!)}</td>
                  <td>
                    <button
                      className="t1-btn danger"
                      style={{ padding: "2px 7px", fontSize: 9, border: "none" }}
                      onClick={(e) => { e.stopPropagation(); handleDelete(exp.id); }}
                      title="Eliminar"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {completed.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={4}>TOTAL CARGADO</td>
                <td className="r" data-money>{formatArs(total)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {expenses.length === 0 && !showAdd && (
        <div style={{ padding: "28px 0", textAlign: "center", color: "var(--text-mute)", fontSize: 10, letterSpacing: "0.1em" }}>
          SIN MOVIMIENTOS · USÁ + AGREGAR PARA CARGAR UN GASTO
        </div>
      )}
    </div>
  );
}
