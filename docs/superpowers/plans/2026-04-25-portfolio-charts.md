# Portfolio Charts & Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar 4 gráficos nuevos (evolución portfolio, ganancia mensual, tasa de ahorro, donut categorías), arreglar el gráfico "EN QUÉ SE VA EL SUELDO" (muy bajo), y corregir 3 bugs: S&P500 siempre 0, hide-toggle que no persiste, y hide-toggle que no cubre crypto.

**Architecture:** Dos componentes nuevos: `PortfolioCharts` (cliente, entre SummaryCards e InvestmentsByDate en `/`) y dos charts inline en `ComparisonCharts` existente. Los datos de snapshots históricos se expanden para incluir `depositsUsd` y `sp500Value`. El fix de S&P500 actualiza la tabla `monthly_snapshots` durante el refresh.

**Tech Stack:** Next.js 16 App Router, Recharts (ya instalado), Drizzle ORM, Turso SQLite, Tailwind CSS v4.

---

## File Map

| Archivo | Acción | Qué cambia |
|---|---|---|
| `src/components/gastos/comparison-charts.tsx` | Modificar | height 350→450 + añadir charts tasa ahorro y donut |
| `src/components/hide-toggle.tsx` | Modificar | lazy initializer localStorage para evitar flicker |
| `src/app/globals.css` | Modificar | Extender `.hide-money` rule a crypto |
| `src/components/crypto-portfolio.tsx` | Modificar | Añadir `data-money` a valores + `data-section` |
| `src/app/api/refresh-prices/route.ts` | Modificar | Actualizar sp500Value en monthly_snapshots |
| `src/lib/calculations.ts` | Modificar | Expandir monthlyStats con depositsUsd y sp500Value |
| `src/components/portfolio-charts.tsx` | Crear | Nuevo componente: línea evolución + barras ganancia |
| `src/app/page.tsx` | Modificar | Importar y renderizar PortfolioCharts |

---

## Task 1: Fix altura "EN QUÉ SE VA EL SUELDO"

**Files:**
- Modify: `src/components/gastos/comparison-charts.tsx:275`

- [ ] **Step 1: Cambiar height**

En `src/components/gastos/comparison-charts.tsx`, buscar la línea con el BarChart del bloque "EN QUÉ SE VA EL SUELDO" (~línea 275):

```tsx
// Antes:
<BarChart width={c1.width} height={350} data={incomeBreakdownData}>
// Después:
<BarChart width={c1.width} height={450} data={incomeBreakdownData}>
```

- [ ] **Step 2: Verificar con TypeScript**

```bash
cd /Users/martinmoreira/Proyectos/finance && npx tsc --noEmit
```

Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add src/components/gastos/comparison-charts.tsx
git commit -m "fix: increase EN QUÉ SE VA EL SUELDO chart height to 450"
```

---

## Task 2: Fix hide-toggle persistencia

**Files:**
- Modify: `src/components/hide-toggle.tsx`

**Problema:** El estado se inicializa en `false` antes de que el `useEffect` lea localStorage, causando un flicker y posible inconsistencia. El fix usa lazy initializer.

- [ ] **Step 1: Reemplazar el componente**

Reemplazar el contenido completo de `src/components/hide-toggle.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";

export function HideToggle() {
  const [hidden, setHidden] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("hideMoney") === "true";
  });

  useEffect(() => {
    if (hidden) {
      document.documentElement.classList.add("hide-money");
    } else {
      document.documentElement.classList.remove("hide-money");
    }
  }, [hidden]);

  function toggle() {
    const next = !hidden;
    setHidden(next);
    localStorage.setItem("hideMoney", String(next));
  }

  return (
    <button
      onClick={toggle}
      className="text-gray-500 hover:text-gray-300 transition-colors px-1"
      title={hidden ? "Mostrar montos" : "Ocultar montos"}
    >
      {hidden ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      )}
    </button>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/martinmoreira/Proyectos/finance && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/hide-toggle.tsx
git commit -m "fix: initialize hide-toggle from localStorage synchronously"
```

---

## Task 3: Extender hide-money a crypto

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/crypto-portfolio.tsx`

**Problema:** La CSS solo cubre `[data-section="investments"]` y la página crypto no tiene `data-money` ni `data-section`.

- [ ] **Step 1: Actualizar CSS**

En `src/app/globals.css`, reemplazar la regla existente:

```css
/* Antes: */
.hide-money [data-section="investments"] [data-money] {
  filter: blur(8px);
  user-select: none;
  transition: filter 0.2s;
}

/* Después — cubre ambas secciones: */
.hide-money [data-section="investments"] [data-money],
.hide-money [data-section="crypto"] [data-money] {
  filter: blur(8px);
  user-select: none;
  transition: filter 0.2s;
}
```

- [ ] **Step 2: Agregar data-section y data-money a crypto-portfolio.tsx**

En `src/components/crypto-portfolio.tsx`, buscar el `<div className="sticky top-0...">` del header (`CryptoDashboardHeader`) y los valores numéricos. Hacer dos cambios:

**2a.** En `CryptoPage` (`src/app/crypto/page.tsx`), agregar `data-section="crypto"` al `<main>`:

```tsx
// Antes:
<main className="min-h-screen">
// Después:
<main className="min-h-screen" data-section="crypto">
```

**2b.** En `src/components/crypto-portfolio.tsx`, agregar `data-money` a los valores monetarios del header. Buscar los tres `<p>` con valores numéricos en `CryptoDashboardHeader`:

```tsx
// Balance — antes:
<p className="text-2xl font-bold">{fmtUsd(totalValue)}</p>
// Después:
<p className="text-2xl font-bold" data-money>{fmtUsd(totalValue)}</p>

// Invertido — antes:
<p className="text-xl font-semibold text-gray-300">{fmtUsd(totalInvested)}</p>
// Después:
<p className="text-xl font-semibold text-gray-300" data-money>{fmtUsd(totalInvested)}</p>

// P&L — antes:
<p className={`text-xl font-semibold ${pnlColor}`}>
  {totalPnl >= 0 ? "+" : ""}{fmtUsd(totalPnl)} ({fmtPct(totalPnlPct)})
</p>
// Después:
<p className={`text-xl font-semibold ${pnlColor}`} data-money>
  {totalPnl >= 0 ? "+" : ""}{fmtUsd(totalPnl)} ({fmtPct(totalPnlPct)})
</p>
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/martinmoreira/Proyectos/finance && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/components/crypto-portfolio.tsx src/app/crypto/page.tsx
git commit -m "fix: extend hide-money to crypto page values"
```

---

## Task 4: Fix S&P500 en monthly_snapshots

**Files:**
- Modify: `src/app/api/refresh-prices/route.ts`

**Problema:** La columna `sp500Value` en `monthly_snapshots` nunca se actualiza durante el refresh. El endpoint actualiza `priceCache.__SPY__` pero no toca `monthlySnapshots`. Fix: al final del refresh, actualizar el snapshot del mes actual con el precio SPY corriente.

- [ ] **Step 1: Agregar import de monthlySnapshots**

En `src/app/api/refresh-prices/route.ts`, línea 3, agregar `monthlySnapshots` al import:

```ts
// Antes:
import { priceCache, species } from "@/db/schema";
// Después:
import { priceCache, species, monthlySnapshots } from "@/db/schema";
```

- [ ] **Step 2: Actualizar sp500Value en el snapshot del mes actual**

Después del bloque que actualiza `__SPY__` (al final del try, antes del `return`), agregar:

```ts
// Update sp500Value in current month's snapshot if it exists
if (spyPrice > 0) {
  await db
    .update(monthlySnapshots)
    .set({ sp500Value: spyPrice })
    .where(eq(monthlySnapshots.yearMonth, currentMonth));
}
```

Asegurarse de que `eq` ya está importado en la línea 6 (sí lo está).

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/martinmoreira/Proyectos/finance && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/refresh-prices/route.ts
git commit -m "fix: update monthly_snapshots sp500Value on price refresh"
```

---

## Task 5: Expandir monthlyStats en calculations.ts

**Files:**
- Modify: `src/lib/calculations.ts`

Los snapshots tienen `depositsUsd` y `sp500Value` pero `monthlyStats` en `PortfolioSummary` solo expone `gainPct`, `gainUsd`, `portfolioValue`. Necesitamos los otros para el chart.

- [ ] **Step 1: Actualizar tipo en PortfolioSummary**

En `src/lib/calculations.ts`, línea 41, en la interface `PortfolioSummary`:

```ts
// Antes:
monthlyStats: { yearMonth: string; gainPct: number; gainUsd: number; portfolioValue: number }[];

// Después:
monthlyStats: { yearMonth: string; gainPct: number; gainUsd: number; portfolioValue: number; depositsUsd: number; sp500Value: number | null }[];
```

- [ ] **Step 2: Actualizar el mapeo de snapshots**

En `src/lib/calculations.ts`, buscar el bloque `// Monthly stats` (~línea 184):

```ts
// Antes:
const monthlyStats = snapshots.map((s) => ({
  yearMonth: s.yearMonth,
  gainPct: s.gainPct,
  gainUsd: s.gainUsd,
  portfolioValue: s.portfolioValueUsd,
}));

// Después:
const monthlyStats = snapshots.map((s) => ({
  yearMonth: s.yearMonth,
  gainPct: s.gainPct,
  gainUsd: s.gainUsd,
  portfolioValue: s.portfolioValueUsd,
  depositsUsd: s.depositsUsd,
  sp500Value: s.sp500Value ?? null,
}));
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/martinmoreira/Proyectos/finance && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/calculations.ts
git commit -m "feat: expose depositsUsd and sp500Value in monthlyStats"
```

---

## Task 6: Crear componente PortfolioCharts

**Files:**
- Create: `src/components/portfolio-charts.tsx`

- [ ] **Step 1: Crear el archivo**

Crear `src/components/portfolio-charts.tsx`:

```tsx
"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from "recharts";

interface MonthlySnapshot {
  yearMonth: string;
  gainPct: number;
  gainUsd: number;
  portfolioValue: number;
  depositsUsd: number;
  sp500Value: number | null;
}

interface Props {
  snapshots: MonthlySnapshot[];
}

function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    observer.observe(ref.current);
    setWidth(ref.current.clientWidth);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

function formatMonthShort(ym: string) {
  const [year, month] = ym.split("-");
  const names = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${names[parseInt(month) - 1]} ${year.slice(2)}`;
}

function fmtUsd(v: number) {
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function tickFmtUsd(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
  return `$${v.toFixed(0)}`;
}

const tooltipStyle = { backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 };
const labelStyle = { color: "#d1d5db" };
const axisTick = { fill: "#9ca3af", fontSize: 11 };

export function PortfolioCharts({ snapshots }: Props) {
  const c1 = useContainerWidth();
  const c2 = useContainerWidth();

  const evolutionData = useMemo(() => {
    if (snapshots.length === 0) return [];
    // Normalize S&P500 to first deposit value for relative comparison
    const firstDeposit = snapshots[0].depositsUsd;
    const firstSp500 = snapshots[0].sp500Value;
    return snapshots.map((s) => {
      const sp500Indexed =
        firstSp500 && firstSp500 > 0 && s.sp500Value
          ? (s.sp500Value / firstSp500) * firstDeposit
          : null;
      return {
        month: formatMonthShort(s.yearMonth),
        portfolio: s.portfolioValue,
        depositos: s.depositsUsd,
        sp500: sp500Indexed,
        gananciaUsd: s.portfolioValue - s.depositsUsd,
        gananciaPct: s.depositsUsd > 0
          ? ((s.portfolioValue - s.depositsUsd) / s.depositsUsd) * 100
          : 0,
      };
    });
  }, [snapshots]);

  const gainData = useMemo(() => {
    return snapshots.map((s, i) => {
      const prevNetWorth = i === 0 ? 0 : snapshots[i - 1].portfolioValue - snapshots[i - 1].depositsUsd;
      const currNetWorth = s.portfolioValue - s.depositsUsd;
      const delta = currNetWorth - prevNetWorth;
      return {
        month: formatMonthShort(s.yearMonth),
        gain: i === 0 ? currNetWorth : delta,
      };
    });
  }, [snapshots]);

  if (snapshots.length < 2) return null;

  return (
    <div className="space-y-4">
      {/* Chart 1: Portfolio Evolution */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-1">EVOLUCIÓN DEL PORTFOLIO</h3>
        <p className="text-xs text-gray-500 mb-3">S&P500 indexado al primer depósito para comparación relativa</p>
        <div ref={c1.ref} style={{ width: "100%" }}>
          {c1.width > 0 && (
            <LineChart width={c1.width} height={280} data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" tick={axisTick} />
              <YAxis tick={axisTick} tickFormatter={tickFmtUsd} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={labelStyle}
                formatter={(value: number, name: string) => {
                  if (name === "portfolio") return [fmtUsd(value), "Portfolio"];
                  if (name === "depositos") return [fmtUsd(value), "Depósitos"];
                  if (name === "sp500") return [fmtUsd(value), "S&P500 (indexado)"];
                  return [value, name];
                }}
                // Extra rows in tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = evolutionData.find((e) => e.month === label);
                  return (
                    <div style={{ ...tooltipStyle, padding: "10px 14px", fontSize: 12 }}>
                      <p style={{ color: "#d1d5db", fontWeight: 600, marginBottom: 6 }}>{label}</p>
                      {payload.map((p) => (
                        <div key={p.dataKey as string} style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 3 }}>
                          <span style={{ color: p.color }}>
                            {p.dataKey === "portfolio" ? "Portfolio" : p.dataKey === "depositos" ? "Depósitos" : "S&P500"}
                          </span>
                          <strong style={{ color: "#e5e7eb" }}>{fmtUsd(Number(p.value))}</strong>
                        </div>
                      ))}
                      {d && (
                        <div style={{ borderTop: "1px solid #374151", paddingTop: 6, marginTop: 4, display: "flex", justifyContent: "space-between", gap: 16 }}>
                          <span style={{ color: "#6b7280" }}>Ganancia</span>
                          <strong style={{ color: d.gananciaUsd >= 0 ? "#22c55e" : "#ef4444" }}>
                            {d.gananciaUsd >= 0 ? "+" : ""}{fmtUsd(d.gananciaUsd)} ({d.gananciaPct >= 0 ? "+" : ""}{d.gananciaPct.toFixed(1)}%)
                          </strong>
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <Legend
                formatter={(value) =>
                  value === "portfolio" ? "Portfolio" : value === "depositos" ? "Depósitos" : "S&P500"
                }
              />
              <Line type="monotone" dataKey="portfolio" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: "#3b82f6" }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="depositos" stroke="#6b7280" strokeWidth={2} strokeDasharray="8 4" dot={false} />
              <Line type="monotone" dataKey="sp500" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />
            </LineChart>
          )}
        </div>
      </div>

      {/* Chart 2: Monthly Gain Bars */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-1">GANANCIA MENSUAL</h3>
        <p className="text-xs text-gray-500 mb-3">Variación del patrimonio neto (excluye nuevos depósitos)</p>
        <div ref={c2.ref} style={{ width: "100%" }}>
          {c2.width > 0 && (
            <BarChart width={c2.width} height={220} data={gainData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" tick={axisTick} />
              <YAxis tick={axisTick} tickFormatter={(v) => `${v >= 0 ? "+" : ""}${tickFmtUsd(v)}`} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={labelStyle}
                formatter={(value: number) => [
                  `${value >= 0 ? "+" : ""}${fmtUsd(value)}`,
                  "Ganancia",
                ]}
              />
              <ReferenceLine y={0} stroke="#6b7280" strokeWidth={1} />
              <Bar dataKey="gain" radius={[3, 3, 0, 0]}>
                {gainData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.gain >= 0 ? "#22c55e" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/martinmoreira/Proyectos/finance && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/portfolio-charts.tsx
git commit -m "feat: add PortfolioCharts component (evolution line + monthly gain bars)"
```

---

## Task 7: Conectar PortfolioCharts en page.tsx

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Importar y pasar datos**

En `src/app/page.tsx`, el componente ya recibe `summary` que tiene `summary.monthlyStats`. Agregar el import y el componente:

```tsx
// Añadir import (junto a los otros):
import { PortfolioCharts } from "@/components/portfolio-charts";
```

En el JSX, entre `<SummaryCards .../>` y `<InvestmentsByDate .../>`, agregar:

```tsx
<PortfolioCharts snapshots={summary.monthlyStats} />
```

El archivo completo de `src/app/page.tsx` queda:

```tsx
import { getPortfolioSummary, getInvestmentsByDate, getAllTransactions } from "@/lib/calculations";
import { db } from "@/db";
import { species } from "@/db/schema";
import { DashboardHeader } from "@/components/dashboard-header";
import { PositionsTable } from "@/components/positions-table";
import { SummaryCards } from "@/components/summary-cards";
import { InvestmentsByDate } from "@/components/investments-by-date";
import { OperationsHistory } from "@/components/operations-history";
import { RefreshButton } from "@/components/refresh-button";
import { PortfolioCharts } from "@/components/portfolio-charts";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [summary, investments, txns, speciesList] = await Promise.all([
    getPortfolioSummary(),
    getInvestmentsByDate(),
    getAllTransactions(),
    db.select({ ticker: species.ticker, name: species.name }).from(species),
  ]);

  return (
    <main className="min-h-screen" data-section="investments">
      <DashboardHeader summary={summary} />

      <div className="px-4 py-4 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex justify-end">
          <RefreshButton lastUpdated={summary.lastUpdated} />
        </div>

        <section>
          <h2 className="text-sm font-semibold text-gray-400 mb-2">POSICIONES</h2>
          <PositionsTable positions={summary.positions} />
        </section>

        <SummaryCards
          byCountry={summary.byCountry.map((c) => ({ label: c.country, value: c.value, pct: c.pct }))}
          bySector={summary.bySector.map((s) => ({ label: s.sector, value: s.value, pct: s.pct }))}
        />

        <PortfolioCharts snapshots={summary.monthlyStats} />

        <InvestmentsByDate byDate={investments.byDate} byMonth={investments.byMonth} />

        <OperationsHistory transactions={txns} speciesList={speciesList} />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/martinmoreira/Proyectos/finance && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: render PortfolioCharts between SummaryCards and InvestmentsByDate"
```

---

## Task 8: Agregar Tasa de Ahorro y Donut a ComparisonCharts

**Files:**
- Modify: `src/components/gastos/comparison-charts.tsx`

Agregar dos nuevos charts al final del return, después del bloque "POR CATEGORÍA". Requiere importar `LineChart`, `Line`, `PieChart`, `Pie`, `Cell` de recharts (ya está `BarChart`, etc., así que extender el import existente).

- [ ] **Step 1: Actualizar imports de recharts**

En `src/components/gastos/comparison-charts.tsx`, línea 1-14, actualizar el import de recharts:

```tsx
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
```

- [ ] **Step 2: Agregar useContainerWidth para los nuevos charts**

Al comienzo del componente `ComparisonCharts`, donde están `c1`, `c2`, `c3`, agregar:

```tsx
const c4 = useContainerWidth();
```

- [ ] **Step 3: Agregar los dos charts al final del return**

Justo antes del `</div>` de cierre del return (después del bloque "category comparison"), agregar:

```tsx
{/* Savings rate line chart */}
{monthlyTotals.length >= 2 && (
  <div className="bg-gray-900 rounded-lg p-4">
    <h3 className="text-sm font-semibold text-gray-400 mb-1">TASA DE AHORRO MENSUAL</h3>
    <p className="text-xs text-gray-500 mb-3">% del sueldo invertido por mes</p>
    <div ref={c4.ref} style={{ width: "100%" }}>
      {c4.width > 0 && (
        <LineChart
          width={c4.width}
          height={220}
          data={monthlyTotals.map((m) => ({
            month: formatMonthShort(m.yearMonth),
            pct: m.salary > 0 ? parseFloat(((m.totalInvested / m.salary) * 100).toFixed(1)) : 0,
            monto: m.totalInvested,
          }))}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="month" tick={axisTick} />
          <YAxis tick={axisTick} tickFormatter={(v) => `${v}%`} domain={[0, "auto"]} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={labelStyle}
            formatter={(value: number, name: string) => {
              if (name === "pct") return [`${value}%`, "% Invertido"];
              return [formatArs(value), "Monto"];
            }}
          />
          <ReferenceLine y={20} stroke="#374151" strokeDasharray="4 2" label={{ value: "20%", fill: "#6b7280", fontSize: 10 }} />
          <Line
            type="monotone"
            dataKey="pct"
            stroke="#22c55e"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#22c55e" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      )}
    </div>
  </div>
)}

{/* Current month category donut */}
{(() => {
  const latestMonth = months[months.length - 1];
  const catData = byCategory
    .map((cat) => ({
      name: cat.category,
      value: cat.amounts[latestMonth] ?? 0,
      color: cat.color,
    }))
    .filter((d) => d.value > 0);
  const total = catData.reduce((s, d) => s + d.value, 0);
  if (catData.length === 0 || total === 0) return null;
  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-1">
        MES ACTUAL — POR CATEGORÍA
        <span className="text-gray-600 font-normal ml-2">{formatMonthShort(latestMonth)}</span>
      </h3>
      <p className="text-xs text-gray-500 mb-3">Total: {formatArs(total)}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <PieChart width={180} height={180}>
          <Pie
            data={catData}
            cx={85}
            cy={85}
            innerRadius={52}
            outerRadius={80}
            dataKey="value"
            strokeWidth={0}
          >
            {catData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={labelStyle}
            formatter={(value: number, name: string) => [
              `${formatArs(value)} (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`,
              name,
            ]}
          />
        </PieChart>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
          {catData.map((cat) => (
            <div key={cat.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: cat.color, flexShrink: 0 }} />
              <span style={{ color: "#9ca3af" }}>{cat.name}</span>
              <strong style={{ color: "#d1d5db", marginLeft: "auto", paddingLeft: 16 }}>
                {total > 0 ? ((cat.value / total) * 100).toFixed(1) : 0}%
              </strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
})()}
```

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/martinmoreira/Proyectos/finance && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/components/gastos/comparison-charts.tsx
git commit -m "feat: add savings rate line chart and category donut to ComparisonCharts"
```

---

## Self-Review

**Spec coverage:**
- ✅ Chart 1: Evolución portfolio (Task 6 + 7)
- ✅ Chart 2: Ganancia mensual (Task 6 + 7)
- ✅ Chart 3: Tasa de ahorro (Task 8)
- ✅ Chart 4: Donut categorías mes actual (Task 8)
- ✅ Fix altura EN QUÉ SE VA EL SUELDO (Task 1)
- ✅ Fix S&P500 en 0 (Task 4 + 5)
- ✅ Fix hide-toggle persistencia (Task 2)
- ✅ Fix hide-toggle cubre crypto (Task 3)

**Notas de implementación:**
- `PortfolioCharts` retorna `null` si hay menos de 2 snapshots para evitar charts vacíos
- El donut usa IIFE para evitar lógica compleja en el JSX del componente padre
- La ganancia mensual del primer mes usa `currNetWorth` (vs. 0) en lugar de delta para que tenga sentido
- S&P500 indexado usa `connectNulls` para manejar los snapshots históricos con `sp500Value = null`
