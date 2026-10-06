# HOME — Patrimonio total y objetivos

Fecha: 2026-10-06

## Objetivo

Una página HOME que muestre el patrimonio total (bolsa + crypto + bonos + cash) y lo compare contra los escenarios de objetivos que hoy viven en una planilla: cuánto debería tener en cada momento según cada proyección vs. cuánto tengo realmente.

Éxito = abrir HOME y saber de un vistazo: cuánto tengo hoy, si voy adelante o atrás de cada escenario, y cuánto falta para el próximo objetivo (1/3).

## Navegación

- `/` pasa a ser **HOME** (nueva).
- La página actual de acciones se muda a `/bolsa` (mismo contenido, sin cambios).
- Nav: `HOME · BOLSA · CRYPTO · GASTOS`.

## Modelo de escenarios

Fórmula única, anual:

```
valor[año] = valor[año-1] × (1 + tasa) + aporte + bono[año] × factorBono
```

- `bono[año]` sale de un calendario: `[3333, 6666, 9999, 13333, 16666, 20000]` indexado desde 2025; a partir del último valor queda fijo (20000).
- El valor del "año X" se mide el **1/3 del año X+1** (ej: columna 2025 = 108000 se compara con el corte real de mar-2026).
- Edad = año − 1993 (año 2025 → 32).

Escenarios iniciales (reproducen la planilla al centavo; verificado):

| Nombre | Año inicial | Valor inicial | Tasa | Aporte | Factor bono | Último año |
|---|---|---|---|---|---|---|
| 10% | 2024 | 73000 | 0.10 | 8000 | 0 | 2047 |
| 15% | 2024 | 73000 | 0.15 | 8000 | 0 | 2041 |
| MELI sin bono | 2025 | 108000 | 0.10 | 25000 | 0 | 2041 |
| MELI con bono | 2025 | 108000 | 0.10 | 25000 | 0.67 | 2041 |
| MELI sin rendimiento | 2025 | 108000 | 0 | 25000 | 0.67 | 2041 |
| MELI 18k + bono | 2025 | 108000 | 0.10 | 18000 | 0.67 | 2041 |

Valores de control (último año): 1290008.27 · 1306173.02 · 1395000.33 · 1791530.84 · 700064.88 · 1539882.73.

## Datos

### `goal_scenarios`
`id, name, start_year, start_value, rate, contribution, bonus_factor, bonus_schedule (JSON text), end_year, color, visible (0/1), sort_order`.

La curva se calcula en código (`src/lib/goals.ts`), no se guarda.

### `wealth_snapshots`
`id, date (YYYY-MM-DD, siempre 1/3 o 1/9), stocks_usd, bonds_usd, crypto_usd, cash_usd, source ('auto'|'manual'), created_at, updated_at`. `date` único. Total = suma de las 4 (no se guarda).

Seed con los 6 cortes históricos de la planilla:

| Fecha | Acciones | Bonos | Crypto | Cash | Total |
|---|---|---|---|---|---|
| 2024-03-01 | 2315 | 13173 | 24491 | 1100 | 41079 |
| 2024-09-01 | 2965 | 15928 | 17346 | 3168 | 39407 |
| 2025-03-01 | 3619 | 18816 | 42218.5 | 8384 | 73037.5 |
| 2025-09-01 | 36715 | 0 | 48350 | 17000 | 102065 |
| 2026-03-01 | 71026 | 0 | 25726 | 12626 | 109378 |
| 2026-09-01 | 85116 | 0 | 24858.53 | 31296 | 141270.53 |

Migración: script `src/db/migrate-wealth.ts` (mismo patrón que `migrate-price-alerts.ts`): crea las 2 tablas e inserta seeds si están vacías.

## Valor "hoy"

- Acciones = `getPortfolioSummary().totalValue` (CEDEARs, modelo MEP existente)
- Crypto = `getCryptoSummary().totalValue`
- Cash = `getPortfolioSummary().cashBalanceTotal` (USD + ARS/MEP)
- Bonos = la app no los registra → se toma el valor del último corte.

## Corte automático

- Ruta `GET /api/wealth/snapshot` (protegida con `CRON_SECRET`, igual que las otras crons).
- Antes de calcular, ejecuta los refresh existentes (CEDEARs y crypto) importando sus handlers, para no usar precios viejos.
- Guarda el corte del día con `source='auto'`. Si ya existe un corte para esa fecha, no lo pisa.
- Cron en `vercel.json`: `0 13 1 3,9 *` (1/3 y 1/9, 13:00 UTC, después del refresh diario de crypto).

## Edición

- `PUT /api/wealth/snapshots` — crea/edita un corte (fecha + 4 valores) → `source='manual'`. `DELETE` por id.
- `GET/POST/PUT/DELETE /api/wealth/scenarios` — CRUD de escenarios (incluye prender/apagar `visible`).

## UI de HOME (de arriba a abajo)

1. **Patrimonio hoy**: total grande + barra apilada por clase (acciones / bonos / crypto / cash) con montos y %.
2. **Gráfico objetivos vs real** (recharts, estilo Bloomberg existente): eje X por fecha con edad; una línea por escenario visible (puntos anuales al 1/3); línea real con los cortes semestrales + punto "hoy" destacado. Escala lineal por defecto, toggle a logarítmica (los escenarios llegan a 1.8M y aplastan el tramo actual).
3. **Tarjetas por escenario visible**: objetivo del próximo 1/3, valor hoy, diferencia en USD y % (verde adelante / rojo atrás), y cuánto falta. Para comparar fechas intermedias (cortes de septiembre, hoy) el objetivo se interpola linealmente entre los 1/3 adyacentes.
4. **Tabla de cortes**: como la planilla (fecha, edad, acciones, bonos, crypto, cash, total, y % vs cada escenario visible); celdas editables inline; botón "+ corte".
5. **Escenarios**: panel colapsable para editar parámetros, color, visibilidad, agregar/borrar.

Mobile: tarjetas apiladas, gráfico a ancho completo, tabla con scroll horizontal (patrón de las otras páginas).

## Archivos

- `src/db/schema.ts` — 2 tablas nuevas
- `src/db/migrate-wealth.ts` — migración + seeds
- `src/lib/goals.ts` — funciones puras: `projectScenario`, `targetAt(scenario, date)`, interpolación
- `src/lib/goals.test.ts` — tests con `node:test` vía `npx tsx --test` (verifican los 6 valores de control y la interpolación)
- `src/lib/wealth-data.ts` — `getWealthOverview()` (hoy + cortes + escenarios)
- `src/app/page.tsx` — HOME nueva
- `src/app/bolsa/page.tsx` (+ `loading.tsx`) — contenido actual de `/`
- `src/app/api/wealth/snapshot/route.ts`, `snapshots/route.ts`, `scenarios/route.ts`
- `src/components/home/` — `wealth-header.tsx`, `goals-chart.tsx`, `scenario-cards.tsx`, `snapshots-table.tsx`, `scenario-manager.tsx`
- `src/components/nav-bar.tsx` — sección HOME + BOLSA en `/bolsa`
- `vercel.json` — cron nuevo

## Errores / bordes

- Si falla un refresh en el corte automático, se usa el último precio cacheado y se loguea; el corte se puede corregir a mano.
- Escenario con `end_year` alcanzado: la línea termina ahí; las tarjetas solo muestran escenarios con objetivo futuro.
- Sin cortes cargados: la tabla muestra vacío y el gráfico solo escenarios + punto hoy.

## Fuera de alcance

- Tracking de bonos en la app (se cargan a mano en los cortes).
- Tasa de ahorro desde Gastos, panel de mercado, etc. (ideas separadas).
