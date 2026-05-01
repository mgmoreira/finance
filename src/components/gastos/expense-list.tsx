"use client";

import { useState } from "react";
import { formatArs, formatDate } from "@/lib/format";
import type { ExpenseRow, CategoryInfo } from "@/lib/gastos-data";
import { MoneyInput } from "./money-input";

interface ExpenseListProps {
  expenses: ExpenseRow[];
  categories: CategoryInfo[];
  budgetId: number;
  onMutate?: () => void;
}

export function ExpenseList({ expenses, categories, budgetId, onMutate }: ExpenseListProps) {
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

  const pending = expenses.filter((e) => e.amount === null);
  const completed = expenses.filter((e) => e.amount !== null);

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
      if (res.ok) {
        setEditingId(null);
        onMutate?.();
      }
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

  function renderRow(exp: ExpenseRow) {
    const isPending = exp.amount === null;
    const isEditing = editingId === exp.id;

    if (isEditing) {
      return (
        <tr key={exp.id} className="border-b border-gray-800/50 bg-gray-800/40">
          <td className="py-2 px-2 font-medium">{exp.name}</td>
          <td className="py-2 px-1">
            {exp.categoryName && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: (exp.categoryColor ?? "#6b7280") + "20", color: exp.categoryColor ?? undefined }}
              >
                {exp.categoryName}
              </span>
            )}
          </td>
          <td className="py-2 px-1">
            <MoneyInput
              value={editAmount}
              onChange={setEditAmount}
              placeholder="Monto"
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm w-32 text-right"
              autoFocus
            />
          </td>
          <td className="py-2 px-1">
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm w-36"
            />
          </td>
          <td className="py-2 px-1">
            <input
              type="text"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Notas"
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm w-32"
            />
          </td>
          <td className="py-2 px-1 whitespace-nowrap">
            <button onClick={saveEdit} disabled={saving} className="text-green-400 hover:text-green-300 text-xs font-medium mr-2">
              {saving ? "..." : "Guardar"}
            </button>
            <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-300 text-xs">
              Cancelar
            </button>
          </td>
        </tr>
      );
    }

    return (
      <tr
        key={exp.id}
        className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer"
        onClick={() => startEdit(exp)}
        title="Click para editar"
      >
        <td className="py-2.5 px-2">
          <span className="font-medium">{exp.name}</span>
          {exp.templateId && <span className="text-gray-600 text-xs ml-1.5">fijo</span>}
        </td>
        <td className="py-2.5 px-2">
          {exp.categoryName && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: (exp.categoryColor ?? "#6b7280") + "20", color: exp.categoryColor ?? "#6b7280" }}
            >
              {exp.categoryName}
            </span>
          )}
        </td>
        <td className="py-2.5 px-2 text-right" data-money>
          {isPending ? (
            <span className="text-yellow-400 text-xs font-medium bg-yellow-400/10 px-2 py-0.5 rounded">Cargar monto</span>
          ) : (
            formatArs(exp.amount!)
          )}
        </td>
        <td className="py-2.5 px-2 text-gray-400">
          {exp.date ? formatDate(exp.date) : "—"}
        </td>
        <td className="py-2.5 px-2 text-gray-500 text-xs">{exp.notes ?? ""}</td>
        <td className="py-2.5 px-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(exp.id); }}
            className="text-gray-500 hover:text-red-400 text-xs"
            title="Eliminar"
          >
            X
          </button>
        </td>
      </tr>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-gray-400">GASTOS DEL MES</h3>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-blue-600 hover:bg-blue-500 text-sm px-4 py-1.5 rounded font-medium"
        >
          + Agregar gasto
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-3">Click en cualquier fila para cargar o editar el monto</p>

      {/* Add form */}
      {showAdd && (
        <div className="mb-3 p-3 bg-gray-800/50 rounded border border-gray-700 space-y-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre del gasto"
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm"
              autoFocus
            />
            <select
              value={newCategoryId}
              onChange={(e) => setNewCategoryId(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm"
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
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm"
            />
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Notas (opcional)"
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm"
            />
            <button
              onClick={addExpense}
              disabled={saving || !newName.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm px-4 py-1.5 rounded font-medium"
            >
              Agregar
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="text-gray-400 hover:text-gray-200 text-sm px-3 py-1.5"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Pending expenses first */}
      {pending.length > 0 && (
        <>
          <p className="text-xs text-yellow-400/70 font-medium mb-1 mt-2">PENDIENTES ({pending.length})</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {pending.map((exp) => renderRow(exp))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Completed expenses */}
      {completed.length > 0 && (
        <>
          <p className="text-xs text-gray-500 font-medium mb-1 mt-4">CARGADOS ({completed.length})</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-left border-b border-gray-800">
                  <th className="py-2 px-2">Nombre</th>
                  <th className="py-2 px-2">Categoría</th>
                  <th className="py-2 px-2 text-right">Monto</th>
                  <th className="py-2 px-2">Fecha</th>
                  <th className="py-2 px-2">Notas</th>
                  <th className="py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {completed.map((exp) => renderRow(exp))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {expenses.length === 0 && !showAdd && (
        <p className="py-6 text-center text-gray-500 text-sm">
          No hay gastos. Usá el botón &quot;+ Agregar gasto&quot; para cargar uno.
        </p>
      )}
    </div>
  );
}
