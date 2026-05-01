"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const mono: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains, monospace)",
  fontSize: 10,
};

export function RefreshButton({ lastUpdated }: { lastUpdated: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lastUpdated) { triggerRefresh(); return; }
    const last = new Date(lastUpdated).getTime();
    if (Date.now() - last > 5 * 60 * 1000) triggerRefresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function triggerRefresh() {
    setLoading(true);
    try {
      await fetch("/api/refresh-prices");
      router.refresh();
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    const res = await fetch("/api/export");
    const text = await res.text();
    await navigator.clipboard.writeText(text);
    alert("Portfolio copiado al portapapeles");
  }

  return (
    <div style={{ display: "flex", gap: 6 }}>
      <button
        onClick={triggerRefresh}
        disabled={loading}
        style={{
          ...mono,
          color: loading ? "var(--text-mute)" : "var(--text-dim)",
          background: "transparent",
          border: "1px solid var(--border)",
          padding: "4px 10px",
          cursor: loading ? "default" : "pointer",
          letterSpacing: 0.5,
        }}
      >
        {loading ? "ACTUALIZANDO..." : "↻ ACTUALIZAR"}
      </button>
      <button
        onClick={handleExport}
        style={{
          ...mono,
          color: "var(--text-dim)",
          background: "transparent",
          border: "1px solid var(--border)",
          padding: "4px 10px",
          cursor: "pointer",
          letterSpacing: 0.5,
        }}
      >
        ↗ EXPORTAR
      </button>
    </div>
  );
}
