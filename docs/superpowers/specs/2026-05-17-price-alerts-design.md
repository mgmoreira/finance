# Price Alerts — Design Spec
_2026-05-17_

## Overview

Sistema de alertas de precio para acciones de EEUU. El usuario define un umbral (encima o debajo de X USD) para un ticker; cuando el precio cruza ese umbral, recibe una notificación por Telegram y la alerta se desactiva automáticamente. Los precios se chequean cada 30 minutos via Vercel Cron.

---

## Data

### Nueva tabla: `price_alerts`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | integer PK autoincrement | |
| `ticker` | text | Ticker de EEUU tal como lo escribe el usuario (e.g. "TSLA") |
| `condition` | text | `"above"` o `"below"` |
| `targetPrice` | real | Precio umbral en USD |
| `active` | integer | 1 = activa, 0 = disparada/desactivada |
| `createdAt` | text | ISO date |
| `triggeredAt` | text | ISO date, null hasta que dispare |

---

## API Routes

### `GET /api/alerts` — listar alertas
Devuelve todas las alertas ordenadas por `createdAt desc`.

### `POST /api/alerts` — crear alerta
Body: `{ ticker, condition, targetPrice }`
Valida que `condition` sea `"above"` o `"below"` y que `targetPrice` > 0.

### `DELETE /api/alerts?id=X` — borrar alerta
Borra por id, activa o no.

### `GET /api/alerts/check` — cron endpoint
1. Busca todas las alertas donde `active = 1`
2. Si no hay ninguna, retorna early
3. Agrupa tickers únicos, fetchea precio actual via `yf.quoteSummary(ticker, { modules: ["price"] })` — precio `regularMarketPrice` en USD
4. Para cada alerta, evalúa condición:
   - `above`: precio actual >= targetPrice → dispara
   - `below`: precio actual <= targetPrice → dispara
5. Si dispara: envía mensaje Telegram, actualiza `active=0`, `triggeredAt=now`
6. Responde con resumen de alertas chequeadas y disparadas

**Formato mensaje Telegram:**
```
🚨 TSLA cruzó $400
Precio actual: $401.23
```

---

## Cron

```json
{ "path": "/api/alerts/check", "schedule": "*/30 * * * *" }
```

Agrega al `vercel.json` existente.

---

## Env Vars

| Var | Valor |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Token del bot |
| `TELEGRAM_CHAT_ID` | `687176349` |

Ambas se agregan en Vercel (Production + Preview) via `vercel env add`.

---

## UI

Panel nuevo en la página principal del portfolio (debajo de las posiciones). Permite:
- Ver alertas activas e inactivas (las últimas 10 disparadas)
- Agregar alerta: input ticker + selector above/below + input precio
- Borrar alerta activa

El ticker se muestra en mayúsculas; no se hace ninguna conversión BYMA. Siempre es el ticker de EEUU contra Yahoo Finance.

---

## Reglas de negocio

- Una alerta dispara una sola vez y queda `active=false` — no vuelve a activarse sola
- Si Yahoo Finance no devuelve precio para un ticker, se loguea el error y se saltea esa alerta (no rompe las demás)
- Sin límite de alertas activas por ahora
- El cron tiene autenticación via `CRON_SECRET` (igual que los otros crons del proyecto)
