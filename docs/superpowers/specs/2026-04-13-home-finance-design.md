# Home Finance — Gastos Personales

## Resumen

Nueva sección `/gastos` dentro de la app existente para trackear gastos mensuales, comparar mes a mes, y conectar el ahorro con el saldo disponible del portfolio de inversiones.

## Modelo de datos

### Nuevas tablas

**expense_categories**
- `id` integer PK autoincrement
- `name` text not null unique (ej: "Servicios", "Supermercado", "Ocio")
- `color` text not null (hex color para gráficos)

**expense_templates**
- `id` integer PK autoincrement
- `name` text not null (ej: "Telecentro", "Edenor")
- `categoryId` integer FK → expense_categories (nullable para extras sin categoría)
- `isActive` integer not null default 1 (1=activo, 0=desactivado)

**monthly_budgets**
- `id` integer PK autoincrement
- `yearMonth` text not null unique (ej: "2026-04")
- `salary` real not null (sueldo neto en ARS)
- `createdAt` text not null default now

**expenses**
- `id` integer PK autoincrement
- `budgetId` integer FK → monthly_budgets not null
- `templateId` integer FK → expense_templates (nullable — null = gasto extra)
- `name` text not null (copiado del template o libre para extras)
- `categoryId` integer FK → expense_categories (nullable)
- `amount` real (nullable — null = pendiente de completar)
- `date` text (nullable — null = pendiente)
- `notes` text (nullable)
- `createdAt` text not null default now

**investment_transfers**
- `id` integer PK autoincrement
- `budgetId` integer FK → monthly_budgets not null
- `amountArs` real not null (siempre en pesos, el origen)
- `amountUsd` real (nullable — si el usuario sabe el monto exacto en USD)
- `exchangeRate` real (nullable — MEP usado para la conversión)
- `currency` text not null ("ARS" | "USD") — moneda destino
- `date` text not null
- `notes` text (nullable)
- `createdAt` text not null default now

### Modificaciones a tablas existentes

**cash_movements**: agregar columna `currency` text not null default "USD"
- Los registros existentes quedan como USD (correcto, hoy solo hay ventas de acciones)
- Nuevos registros pueden ser ARS o USD

### Flujo de investment_transfer → cash_movements

Cuando se crea un investment_transfer:
1. Se inserta en `investment_transfers` (lado gastos)
2. Se inserta en `cash_movements` con:
   - type = "ADJUSTMENT"
   - amount = amountUsd (si currency=USD) o amountArs (si currency=ARS)
   - currency = la elegida
   - description = "Ahorro mes {yearMonth}"

### Cash balance dual-currency

`getPortfolioSummary()` pasa de `cashBalance: number` a:
- `cashBalanceArs: number`
- `cashBalanceUsd: number`
- `cashBalanceTotal: number` (ARS convertido a USD + USD, para el total general)

## API Routes

### /api/gastos/categories
- GET → lista de categorías
- POST → crear categoría { name, color }

### /api/gastos/templates
- GET → lista de templates activos (con categoría)
- POST → crear template { name, categoryId }
- PUT → editar template { id, name, categoryId, isActive }

### /api/gastos/budgets
- GET `?month=2026-04` → budget del mes con expenses y totales
- GET (sin params) → lista de todos los meses con resumen
- POST → crear mes { yearMonth, salary } — auto-genera expenses desde templates activos

### /api/gastos/expenses
- POST → crear expense { budgetId, name, categoryId?, amount?, date?, notes? }
- PUT → editar expense { id, amount, date, notes, name, categoryId }
- DELETE → eliminar expense { id }

### /api/gastos/transfer
- POST → enviar a inversión { budgetId, amountArs, amountUsd?, currency, date, notes? }
  - Si currency=USD y no viene amountUsd, se busca MEP actual y se calcula
  - Crea el cash_movement correspondiente

### /api/gastos/summary
- GET `?months=6` → datos de comparación para los últimos N meses:
  - Por categoría: { category, amounts: { "2026-01": 1000, "2026-02": 1200 } }
  - Por gasto individual: { name, category, amounts: { "2026-01": 500, ... } }
  - Totales por mes: { yearMonth, salary, totalSpent, totalInvested, savings }

## UI — Sección /gastos

### Navegación compartida
- Nav bar arriba con "Inversiones" y "Gastos" — links entre `/` y `/gastos`
- Presente en ambas secciones

### Landing /gastos

**Header del mes actual:**
- Selector de mes (< Abril 2026 >)
- Sueldo del mes
- Total gastado / Total pendiente / Disponible
- Total enviado a inversión
- Barra de progreso visual: gastado vs disponible

**Lista de gastos:**
- Gastos fijos (del template): nombre, categoría badge, monto (o "pendiente"), fecha
- Gastos extras: igual pero marcados visualmente distinto
- Botón "+" para agregar gasto extra
- Click en gasto pendiente → completar monto/fecha inline
- Botón "Enviar a inversión" destacado

**Comparación histórica (abajo):**
- Gráfico de barras agrupadas: categorías × últimos 6 meses
- Filtro por categoría (ver solo Servicios, o solo todo)
- Click en categoría → drill-down a gastos individuales con barras por mes
- Tabla resumen: mes | sueldo | gastado | ahorrado | invertido | % ahorro

## Dependencias

- `recharts` para gráficos de barras interactivos (lightweight, React-native)

## Conexión con portfolio existente

1. Dashboard header muestra "EFECTIVO ARS" y "EFECTIVO USD" por separado
2. El total del portfolio incluye ambos (ARS convertido a USD via MEP + USD)
3. Cuando se transfiere desde gastos, aparece inmediatamente en el portfolio

## Scope explícito — qué NO incluye

- No hay autenticación
- No hay importación de extractos bancarios
- No hay presupuestos/límites por categoría
- No hay notificaciones
- No hay multi-moneda en gastos (todo es ARS, la conversión es solo al transferir a inversión)
