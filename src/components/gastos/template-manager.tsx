"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TemplateInfo, CategoryInfo, MonthSummary } from "@/lib/gastos-data";

interface TemplateManagerProps {
  templates: TemplateInfo[];
  categories: CategoryInfo[];
  allMonths: MonthSummary[];
}

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function monthLabel(ym: string) {
  const [year, month] = ym.split("-");
  return `${MONTH_NAMES[parseInt(month) - 1]} ${year}`;
}

export function TemplateManager({ templates, categories, allMonths }: TemplateManagerProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategoryId, setEditCategoryId] = useState<string>("");

  async function addTemplate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/gastos/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          categoryId: categoryId ? parseInt(categoryId) : null,
          applyToMonths: selectedMonths,
        }),
      });
      if (res.ok) {
        setName("");
        setCategoryId("");
        setSelectedMonths([]);
        setShowForm(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  function toggleMonth(ym: string) {
    setSelectedMonths((prev) =>
      prev.includes(ym) ? prev.filter((m) => m !== ym) : [...prev, ym]
    );
  }

  async function toggleActive(id: number, currentActive: number) {
    await fetch("/api/gastos/templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: currentActive ? 0 : 1 }),
    });
    router.refresh();
  }

  async function deleteTemplate(id: number, name: string) {
    if (!confirm(`¿Borrar template "${name}"? Los gastos ya cargados en meses anteriores no se van a eliminar.`)) return;
    await fetch("/api/gastos/templates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  function startEdit(t: TemplateInfo) {
    setEditingId(t.id);
    setEditName(t.name);
    setEditCategoryId(t.categoryId ? String(t.categoryId) : "");
  }

  async function saveEdit() {
    if (!editingId || !editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/gastos/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          name: editName.trim(),
          categoryId: editCategoryId ? parseInt(editCategoryId) : null,
        }),
      });
      if (res.ok) {
        setEditingId(null);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-400">GASTOS FIJOS (TEMPLATES)</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-gray-700 hover:bg-gray-600 text-sm px-3 py-1 rounded font-medium"
        >
          {showForm ? "Cancelar" : "+ Nuevo"}
        </button>
      </div>

      {showForm && (
        <div className="mb-3 space-y-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-400">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Telecentro"
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm"
                autoFocus
              />
            </div>
            <div className="w-40">
              <label className="text-xs text-gray-400">Categoría</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm"
              >
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={addTemplate}
              disabled={saving || !name.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm px-4 py-1.5 rounded font-medium"
            >
              Agregar
            </button>
          </div>
          {allMonths.length > 0 && (
            <div>
              <label className="text-xs text-gray-400 block mb-1">Agregar también a meses existentes</label>
              <div className="flex flex-wrap gap-2">
                {allMonths.map((m) => {
                  const checked = selectedMonths.includes(m.yearMonth);
                  return (
                    <button
                      key={m.yearMonth}
                      type="button"
                      onClick={() => toggleMonth(m.yearMonth)}
                      className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                        checked
                          ? "bg-blue-600 border-blue-500 text-white"
                          : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"
                      }`}
                    >
                      {monthLabel(m.yearMonth)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-500 mb-2">Click en un template para editar</p>
      <div className="space-y-1">
        {templates.map((t) => {
          if (editingId === t.id) {
            return (
              <div key={t.id} className="flex items-center gap-2 py-1.5 px-2 rounded bg-gray-800/50 border border-gray-700">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                  autoFocus
                />
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm w-36"
                >
                  <option value="">Sin categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button
                  onClick={saveEdit}
                  disabled={saving || !editName.trim()}
                  className="text-green-400 hover:text-green-300 text-xs font-medium"
                >
                  {saving ? "..." : "Guardar"}
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-gray-400 hover:text-gray-300 text-xs"
                >
                  Cancelar
                </button>
              </div>
            );
          }

          return (
            <div
              key={t.id}
              className={`flex items-center justify-between py-1.5 px-2 rounded text-sm cursor-pointer ${
                t.isActive ? "hover:bg-gray-800/50" : "opacity-40 hover:bg-gray-800/30"
              }`}
              onClick={() => startEdit(t)}
              title="Click para editar"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{t.name}</span>
                {t.categoryName && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: (t.categoryColor ?? "#6b7280") + "20", color: t.categoryColor ?? "#6b7280" }}
                  >
                    {t.categoryName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleActive(t.id, t.isActive); }}
                  className={`text-xs px-2 py-0.5 rounded ${
                    t.isActive
                      ? "text-gray-400 hover:text-yellow-400"
                      : "text-green-400 hover:text-green-300"
                  }`}
                >
                  {t.isActive ? "Desactivar" : "Activar"}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id, t.name); }}
                  className="text-xs text-gray-600 hover:text-red-400 px-1"
                  title="Borrar template"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
        {templates.length === 0 && (
          <p className="text-gray-500 text-sm py-2">No hay templates creados. Agregá tus gastos fijos.</p>
        )}
      </div>
    </div>
  );
}
