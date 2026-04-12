"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function RefreshButton({ lastUpdated }: { lastUpdated: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Auto-refresh if stale (>5 min)
  useEffect(() => {
    if (!lastUpdated) {
      triggerRefresh();
      return;
    }

    const lastUpdate = new Date(lastUpdated).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (now - lastUpdate > fiveMinutes) {
      triggerRefresh();
    }
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

  return (
    <button
      onClick={triggerRefresh}
      disabled={loading}
      className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded disabled:opacity-50"
    >
      {loading ? "Actualizando..." : "Actualizar precios"}
    </button>
  );
}
