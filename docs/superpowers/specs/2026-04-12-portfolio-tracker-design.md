# Portfolio Tracker - Design Spec

Personal investment portfolio web app to replace a Google Sheets spreadsheet. Tracks CEDEAR operations (buys/sells) in the Argentine market, calculates balances, gains, and displays real-time prices.

## Stack

- **Framework**: Next.js 15 (App Router, Server Components, TypeScript)
- **Database**: Turso (SQLite edge) + Drizzle ORM
- **Styling**: Tailwind CSS v4
- **External APIs**: data912 (CEDEARs, MEP, bonds), Yahoo Finance (dividends, US prices, S&P500)
- **Deploy**: Vercel (free tier)
- **Auth**: None (personal use, single user)

## Data Model

### transactions

Stores every buy/sell operation. All monetary values are computed and persisted at insert time (immutable).

| Column | Type | Description |
|--------|------|-------------|
| id | integer PK | Auto-increment |
| ticker | text | e.g. YPF, MELI, TSLA |
| type | text | BUY or SELL |
| quantity | integer | Number of CEDEARs |
| price_ars | real | Unit price in ARS |
| price_usd | real | Unit price in USD (calculated: price_ars / exchange_rate) |
| currency | text | ARS or USD (what currency the user paid in) |
| total_ars | real | quantity * price_ars |
| total_usd | real | quantity * price_usd |
| exchange_rate | real | Dolar MEP at time of operation (auto-fetched via data912) |
| date | text | Operation date (ISO format) |
| created_at | text | Timestamp |

For USD purchases: price_usd is the direct price, price_ars = price_usd * exchange_rate.

### species

Metadata per ticker. Sector is manual, rest is auto-fetched or derived.

| Column | Type | Description |
|--------|------|-------------|
| ticker | text PK | e.g. YPF |
| name | text | Full name (e.g. "YPF S.A.") |
| sector | text | Manual: TECNOLOGIA, ENERGIA, E-COMMERCE, SALUD, CONSUMO, AGRO, MINERIA, ETF |
| country | text | EEUU, ARG, BRASIL, CHINA, EUROPA, ASIA, LATINO |
| parity | real | CEDEAR parity ratio (auto via data912) |
| dividend_yield | real | Annual dividend yield % (auto via Yahoo Finance) |

### price_cache

Current prices, refreshed periodically. Source of truth for all "live" calculations.

| Column | Type | Description |
|--------|------|-------------|
| ticker | text PK | e.g. YPF |
| price_usd | real | Current US stock price |
| price_ars | real | Current CEDEAR price in ARS |
| parity | real | Current parity |
| exchange_rate_mep | real | Current dolar MEP |
| ath | real | All-time high USD price |
| month_start_price | real | Price USD on first trading day of current month |
| sp500_month_start | real | S&P500 price at start of current month (for comparison) |
| updated_at | text | Last refresh timestamp |

### monthly_snapshots

Persisted end-of-month portfolio state for monthly stats calculation.

| Column | Type | Description |
|--------|------|-------------|
| id | integer PK | Auto-increment |
| year_month | text | e.g. "2025-09" (unique) |
| portfolio_value_usd | real | Total portfolio value at month end |
| deposits_usd | real | Sum of new money added during the month |
| gain_usd | real | portfolio_value - prev_portfolio_value - deposits |
| gain_pct | real | gain_usd / prev_portfolio_value * 100 |
| sp500_value | real | S&P500 (SPY) price at month end |
| created_at | text | Timestamp |

## Calculations

### Persisted at transaction time (immutable)
- `price_usd` = price_ars / exchange_rate (for ARS purchases)
- `price_ars` = price_usd * exchange_rate (for USD purchases)
- `total_ars` = quantity * price_ars
- `total_usd` = quantity * price_usd
- `exchange_rate` = dolar MEP fetched from data912 `/live/mep`

### Computed live from price_cache + transactions
- **Cantidad actual** = SUM(quantity) for BUY - SUM(quantity) for SELL, grouped by ticker
- **Precio promedio USD** = SUM(total_usd for BUYs) / SUM(quantity for BUYs), per ticker
- **Invertido USD** = SUM(total_usd for BUYs) - SUM(total_usd for SELLs), per ticker
- **Valor actual** = cantidad_actual * price_cache.price_usd
- **P&L USD** = valor_actual - invertido
- **P&L %** = P&L / invertido * 100
- **% Cartera** = valor_actual / SUM(all valor_actual) * 100
- **% hasta ATH** = (ath - price_usd) / ath * 100
- **Variacion mes** = (price_usd - month_start_price) / month_start_price * 100
- **Balance total** = SUM(valor_actual) for all tickers
- **Ganancia total** = balance_total - SUM(all invertido)

### Monthly stats formula
```
gain_pct = (portfolio_value_end - portfolio_value_prev_end - deposits) / portfolio_value_prev_end * 100
```
Measures pure return excluding new deposits.

## External APIs

### data912 (rate limit: 120 req/min)
| Endpoint | Use |
|----------|-----|
| `/live/arg_cedears` | CEDEAR prices ARS, parity |
| `/live/mep` | Dolar MEP current rate |
| `/live/usa_stocks` | US stock prices (backup) |
| `/historical/cedears/{ticker}` | Historical OHLC for ATH calculation |
| `/historical/bonds/{ticker}` | AL30/AL30D historical (backup MEP) |

### Yahoo Finance (unofficial API, free)
| Use | Data |
|-----|------|
| Dividend yield | Per ticker |
| US stock prices | Real-time quotes |
| S&P500 (SPY) | For benchmark comparison |
| ATH | 52-week / all-time highs |

### Price refresh strategy
- On page load: serve from price_cache (instant render), then trigger refresh if stale (>5 min old)
- Refresh mechanism: Next.js API route `/api/refresh-prices` called client-side on load if stale, plus manual "Actualizar" button
- No background cron needed — prices refresh on visit. For market hours awareness: show "Mercado cerrado" badge when outside trading hours
- Refresh flow: API route calls data912 + Yahoo → updates price_cache in Turso → returns fresh data → client re-renders

### S&P500 comparison
- Track SPY price at the start of each month alongside portfolio value
- Show: "Tu cartera: +X% este mes vs S&P500: +Y% este mes"
- Historical comparison stored in monthly_snapshots (add sp500_value column)

## UI Layout

### Header (always visible, fixed)
```
BALANCE: $81,382 USD | Ganancia: $23,376 (40.30%) | vs S&P500: +X%
Stats mensuales: [May: -1%] [Jun: 5.7%] [Jul: 9.2%] [Ago: 11.7%] ...
```

### Posiciones (main table, filterable, sortable, default sort: % cartera desc)
```
Ticker | Cant | Prom USD | Actual USD | Invertido | Valor Actual | P&L $ | P&L % | % Cartera
MELI   | 306  | 16.56    | 1,774      | $5,066    | $542,831     | +537k | +10k% | 26.7%
ASML   | 447  | 5.10     | 1,478      | $2,278    | $660,791     | +658k | +28k% | 32.5%
...
```
- Filters: by sector, by country, search by ticker
- Sort: click any column header
- Expandable rows → species detail panel:
  - ATH: $488 | Distancia ATH: -40%
  - Dividendo: 2.5%
  - Precio inicio mes: $402 → Hoy: $488 (+21.4%)
  - Sector: ENERGIA | País: ARG

### Resumen por País / Sector (side by side)
```
POR PAIS          | POR SECTOR
EEUU     30%      | ENERGIA    26%
ARG      24%      | TECH       24%
BRASIL   17%      | E-COMMERCE 18%
CHINA     8%      | SALUD       7%
EUROPA    9%      | CONSUMO     6%
ASIA      4%      | MINERIA     6%
LATINO    3%      | AGRO        4%
```

### Inversiones por Fecha
```
Fecha     | Total USD | Acumulado  | Tickers
08/05/25  | $3,116    | $X,XXX     | INTC, MUX, TGS, YPF, CRESY, TSLA
16/05/25  | $3,122    | $X,XXX     | INTC, MUX, TGS, PBR, NKE, EWZ, LLY
---
Resumen mensual: May-25: $6,584 | Jun-25: $8,553 | Jul-25: $4,466 | ...
```

### Historial de Operaciones
```
[+ Nueva Operacion]
Fecha     | Ticker | Tipo   | Cant | Precio $ | Precio USD | Total USD | Dolar
02/03/26  | MSFT   | COMPRA | 77   | 19,905   | 14.00      | 1,057     | 1,450
25/02/26  | MELI   | COMPRA | 76   | 21,710   | 15.18      | 1,185     | 1,430
...
```

### Modal "Nueva Operacion"
Fields:
- Ticker (dropdown from species + option to add new)
- Tipo: COMPRA / VENTA
- Cantidad
- Precio (ARS or USD, toggle)
- Fecha (default: hoy)
- Dolar MEP (auto-fetched, editable)

On submit: calculate all derived fields, persist to transactions, update UI.

When adding a new ticker: prompt for sector (manual), auto-fetch country/parity/dividend.

## Seed Data

Pre-load all ~100 historical transactions from the spreadsheet. Pre-compute all persisted fields. Pre-load species metadata for all 29 tickers. Pre-load monthly snapshots for historical months.

### Tickers to seed
YPF, EWZ, PBR, INTC, MUX, TGS, CRESY, TSLA, AMZN, NKE, LLY, GPRK, UNH, PEP, JD, BABA, PFE, FXI, GGB, BG, ASML, TSM, VIST, PAGS, VALE, MELI, PG, MSFT (29 unique tickers)

### Monthly snapshots to seed
From the spreadsheet, 9 months of stats. Percentages in order: -1.01%, 5.77%, 9.27%, 11.78%, 0.07%, -2.29%, 10.94%, 1.46%, -0.16%. Portfolio totals per month: $19,189, $26,598, $40,118, $53,279, $58,955, $60,765, $71,625, $72,672, $72,553. These correspond to consecutive months starting approximately May 2025 through January 2026 (to be confirmed with user during implementation).

## Future (not in MVP)
- Price alerts (push notifications / Telegram bot)
- Portfolio evolution charts over time
- Multi-user with auth
- Mobile app
