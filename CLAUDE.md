@AGENTS.md

# Finance - CEDEAR Portfolio Tracker

## App Overview
Web app replacing a Google Sheets CEDEAR (Argentine depositary receipts) portfolio tracker.
Deployed on Vercel at https://finance-beige-two.vercel.app
No git remote — deploy via `npx vercel --prod`.

## Tech Stack
- Next.js 16 App Router + Turbo
- Turso (SQLite edge) + Drizzle ORM, credentials in `.env.local`
- Tailwind CSS v4
- yahoo-finance2 v3 (requires `new YahooFinance()` constructor, NOT default import)
- data912 API for CEDEAR ARS prices and MEP rate

## Critical Pricing Model
- **Balance/P&L**: `currentPriceUsd = CEDEAR_ARS_price / MEP_rate` (from data912). NO usar precios de EEUU para el balance.
- **US stock prices (Yahoo)**: referencia visual ONLY, columnas azules "EEUU"
- **MEP rate**: del bono AL30 específicamente (más líquido) via data912 MEP endpoint
- **Fallback**: si no hay precio data912, usar `stockPriceUsd / parity`

## BYMA Ticker Mapping
CEDEARs que difieren entre EEUU y BYMA:
- BG (US) → BNG (BYMA)
- CRESY (US) → CRES (BYMA)

Acciones argentinas locales (no son CEDEARs, usan endpoint `arg_stocks`):
- YPF → YPFD
- TGS → TGSU2
- CRESY → CRES
Mapeo en `src/app/api/refresh-prices/route.ts` y `src/app/api/transactions/route.ts`

## data912 API Field Mapping
Los campos reales difieren de lo esperado: `symbol→ticker`, `c→last`, `px_bid→bid`, `px_ask→ask`, `v→volume`. No tiene campo parity.

## Key Files
- `src/lib/calculations.ts` — Cálculos de portfolio, interfaces Position/PortfolioSummary
- `src/lib/data912.ts` — API data912 con field mapping
- `src/lib/yahoo.ts` — Yahoo Finance quotes
- `src/app/api/refresh-prices/route.ts` — Refresh precios con BYMA mapping
- `src/app/api/transactions/route.ts` — CRUD + auto-fetch historical prices + stockPriceUsd
- `src/app/api/price-lookup/route.ts` — Historical CEDEAR price lookup
- `src/db/index.ts` — Lazy DB init via Proxy (evita error de env vars en build de Vercel)
- `src/db/schema.ts` — transactions tiene columna `stockPriceUsd` para precio real US de entrada
- `src/lib/goals.ts` — Proyección de escenarios de objetivos (pura, testeada con `npm test`)
- `src/lib/dividends.ts` — Estimación de dividendos (pura, testeada)
- `src/lib/dividend-refresh.ts` — Cache Yahoo de dividendos (1/día por ticker, desde refresh-prices)
- `src/lib/wealth-data.ts` — Patrimonio total (CEDEARs + crypto + cash + bonos del último corte)
- `src/app/objetivos/page.tsx` — Patrimonio total + objetivos (último ítem del menú); `/` sigue siendo la bolsa

## Monthly Snapshots
- Tabla `monthly_snapshots`, actualmente Jul 2025 a Mar 2026
- Fields: yearMonth, portfolioValueUsd, depositsUsd, gainUsd, gainPct, sp500Value

## Patrimonio y Objetivos
- Tablas `wealth_snapshots` (cortes 1/3 y 1/9, auto vía cron `/api/wealth/snapshot` o manuales) y `goal_scenarios` (parámetros)
- Fórmula anual: `valor × (1 + tasa) + aporte + bono[año] × factorBono`; el año X se mide el 1/3 de X+1
- Bonos no se trackean en la app: se cargan a mano en los cortes

## Dividendos
- Estimados (sin montos reales): CEDEARs al corte ÷ paridad × dividendo por acción × (1 − retención)
- Retención efectiva validada con cobros reales: EEUU 35%, Brasil ~25%; editable por acción en `species.withholding_pct`
- Pago en BYMA = pago en EEUU + 1 día
- Paridades corregidas en Oct 2026 (estaban mal desde el seed); YPF = 10 según precios

## Workflow
- NUNCA commitear, pushear ni deployar sin preguntar al usuario primero
- El usuario suele juntar varios cambios antes de deployar

## Pending
- ATH: mejorar usando historial real de 2 años en vez de fiftyTwoWeekHigh de Yahoo, actualizar semanalmente
