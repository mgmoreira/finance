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

export function OperationsHistory({
  transactions,
  speciesList,
}: {
  transactions: TransactionRow[];
  speciesList: Species[];
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar esta operación?")) return;
    await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-400">OPERACIONES</h3>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-sm px-4 py-1.5 rounded font-medium"
        >
          + Nueva Operación
        </button>
      </div>

      <div className="overflow-x-auto max-h-80 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-900">
            <tr className="text-gray-400 text-left border-b border-gray-800">
              <th className="py-2 px-2">Fecha</th>
              <th className="py-2 px-2">Ticker</th>
              <th className="py-2 px-2">Tipo</th>
              <th className="py-2 px-2 text-right">Cant</th>
              <th className="py-2 px-2 text-right">Precio $</th>
              <th className="py-2 px-2 text-right">Precio USD</th>
              <th className="py-2 px-2 text-right">Total USD</th>
              <th className="py-2 px-2 text-right">Dólar</th>
              <th className="py-2 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-1.5 px-2">{formatDate(tx.date)}</td>
                <td className="py-1.5 px-2 font-medium">{tx.ticker}</td>
                <td className={`py-1.5 px-2 ${tx.type === "BUY" ? "text-green-400" : "text-red-400"}`}>
                  {tx.type === "BUY" ? "COMPRA" : "VENTA"}
                </td>
                <td className="py-1.5 px-2 text-right">{tx.quantity}</td>
                <td className="py-1.5 px-2 text-right">{formatArs(tx.priceArs)}</td>
                <td className="py-1.5 px-2 text-right">{formatNumber(tx.priceUsd)}</td>
                <td className="py-1.5 px-2 text-right">{formatUsd(tx.totalUsd)}</td>
                <td className="py-1.5 px-2 text-right">${tx.exchangeRate.toFixed(0)}</td>
                <td className="py-1.5 px-2">
                  <button
                    onClick={() => handleDelete(tx.id)}
                    className="text-gray-500 hover:text-red-400 text-xs"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
