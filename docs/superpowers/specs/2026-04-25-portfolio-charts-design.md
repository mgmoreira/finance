# Portfolio Charts & Fixes — Design Spec

**Date:** 2026-04-25

## Scope

Agregar gráficos a la página de inversiones y gastos, más tres bug fixes. Se implementa en dos secciones independientes pero un solo ciclo de desarrollo.

---

## 1. Inversiones — nuevo componente `PortfolioCharts`

### Ubicación en la página

Entre `SummaryCards` y `InvestmentsByDate` en `src/app/page.tsx`.

### Fuente de datos

`monthly_snapshots` (Jul 2025 – presente): `yearMonth`, `portfolioValueUsd`, `depositsUsd`, `gainUsd`, `gainPct`, `sp500Value`.

Se agrega un query en `page.tsx` junto a los existentes (`getPortfolioSummary`, etc.).

### Componente

**Archivo:** `src/components/portfolio-charts.tsx` — client component (`"use client"`).

Recibe props: `snapshots: MonthlySnapshot[]`.

Usa `useContainerWidth` (patrón ya existente en `comparison-charts.tsx`) para charts responsivos con Recharts.

### Chart 1 — Evolución del Portfolio (LineChart)

- **Tipo:** `LineChart` de Recharts, responsive via `useContainerWidth`, height=280.
- **Series:**
  - `portfolioValueUsd` — línea azul sólida (`#3b82f6`)
  - `depositsUsd` — línea gris punteada (`#6b7280`, `strokeDasharray="8 4"`)
  - S&P500 indexado — línea amarilla punteada (`#f59e0b`, `strokeDasharray="4 3"`)
- **S&P500 indexado:** normalizar al valor del primer depósito. Si `snapshots[0].depositsUsd = D` y `snapshots[0].sp500Value = S0`, entonces para cada mes: `sp500Indexed = (sp500Value / S0) * D`.
- **Tooltip:** `<Tooltip>` de Recharts mostrando para cada mes:
  - Portfolio: valor en USD
  - Depósitos: valor en USD
  - S&P500: valor indexado en USD
  - Ganancia: `portfolioValueUsd - depositsUsd` en USD y %
- **Eje X:** mes abreviado (`"Jul 25"`, `"Ago"`, etc.)
- **Eje Y:** formato `$Xk`
- **Leyenda:** `<Legend>` con labels custom.

### Chart 2 — Ganancia Mensual (BarChart)

- **Tipo:** `BarChart` de Recharts, height=220.
- **Datos:** diferencia mes a mes: `gainUsd[n] - gainUsd[n-1]` (excluyendo nuevos depósitos). Se calcula: `deltaGain = (portfolioValueUsd[n] - depositsUsd[n]) - (portfolioValueUsd[n-1] - depositsUsd[n-1])`.
- **Color dinámico:** verde (`#22c55e`) si positivo, rojo (`#ef4444`) si negativo. Usar `<Cell>` por barra.
- **Línea de cero:** `<ReferenceLine y={0} stroke="#6b7280" />`.
- **Tooltip:** ganancia USD, ganancia %, valor del portfolio ese mes.
- **Eje Y:** formato `$Xk` (con signo).

---

## 2. Gastos — charts nuevos en `ComparisonCharts`

Se agregan dos charts al final del componente existente `src/components/gastos/comparison-charts.tsx`.

### Chart 3 — Tasa de Ahorro (LineChart)

- **Tipo:** `LineChart`, height=220.
- **Datos:** `monthlyTotals` ya disponible en el componente. Serie: `savingsPct` (ya existe en `MonthTotal`).
- **Color:** línea verde (`#22c55e`) con área rellena semitransparente.
- **Tooltip:** `% invertido` y `monto invertido en ARS`.
- **Eje Y:** formato `X%`.

### Chart 4 — Categorías del mes actual (PieChart/Donut)

- **Tipo:** `PieChart` con `innerRadius` para efecto donut, height=220.
- **Datos:** gastos del mes más reciente en `byCategory`, agrupados por categoría.
- **Total:** suma de todas las categorías (sin gap — el donut está siempre cerrado al 100% de lo cargado).
- **Centro del donut:** muestra total en ARS.
- **Colores:** usar `color` ya definido en cada `CategoryData`.
- **Tooltip:** categoría, monto ARS, % del total.
- **Layout:** side-by-side con el chart de tasa de ahorro en pantallas ≥ md. En mobile, stacked.

---

## 3. Fix — "EN QUÉ SE VA EL SUELDO" altura

**Archivo:** `src/components/gastos/comparison-charts.tsx` línea ~275.

Cambiar `height={350}` → `height={450}` en el `BarChart` del bloque "EN QUÉ SE VA EL SUELDO".

---

## 4. Fix — S&P500 siempre en 0

**Síntoma:** la columna `sp500Value` en `monthly_snapshots` siempre muestra 0.

**Investigar:** `src/app/api/refresh-prices/route.ts` — cómo se guarda `sp500Value` al hacer refresh. Verificar que el fetch del precio de `^GSPC` via Yahoo Finance funciona y que el valor se persiste en el snapshot correspondiente.

**Fix esperado:** al hacer refresh, el endpoint debe actualizar `sp500Value` en el snapshot del mes actual (o al menos almacenarlo en `price_cache` como punto de partida para el cálculo indexado).

---

## 5. Fix — Hide toggle (ojito) persistencia y crypto

**Síntoma:** el estado del toggle se pierde al recargar. Además no oculta los valores en la página de crypto.

**Archivos:** `src/components/hide-toggle.tsx` y `src/app/crypto/page.tsx` (o el componente que muestra valores de crypto).

**Fix:**
- En `hide-toggle.tsx`: leer estado inicial de `localStorage.getItem("hideValues")` y guardar en `localStorage.setItem("hideValues", ...)` en cada cambio.
- El estado se propaga via el atributo `data-hide-values` en `<body>` (o similar mecanismo global ya existente). Verificar cómo funciona actualmente y extender al DOM de la página crypto.

---

## Secuencia de implementación

1. Fix height "EN QUÉ SE VA EL SUELDO" (1 línea)
2. Fix hide toggle persistencia + crypto
3. Fix S&P500 (requiere investigar)
4. Nuevo componente `PortfolioCharts` (charts 1 y 2)
5. Charts de gastos: tasa de ahorro + donut (charts 3 y 4)
