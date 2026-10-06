# HOME — Patrimonio y Objetivos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nueva página HOME en `/` con patrimonio total (acciones + bonos + crypto + cash) comparado contra escenarios de objetivos parametrizables; la página de acciones actual se muda a `/bolsa`.

**Architecture:** Lógica de proyección pura en `src/lib/goals.ts` (testeada con `node:test`), validación de inputs pura en `src/lib/wealth-input.ts`, acceso a datos en `src/lib/wealth-data.ts`, 2 tablas nuevas en Turso (`wealth_snapshots`, `goal_scenarios`), 3 rutas API (cortes, escenarios, cron), y componentes cliente en `src/components/home/` que calculan las curvas en el browser con las mismas funciones puras.

**Tech Stack:** Next.js 16 App Router, Turso + Drizzle ORM, recharts 3, Tailwind v4 / inline styles (estilo Bloomberg existente), `tsx --test` (node:test) para tests.

**Spec:** `docs/superpowers/specs/2026-10-06-home-patrimonio-objetivos-design.md`

## Global Constraints

- Fórmula anual: `valor[año] = valor[año-1] × (1 + tasa) + aporte + bono[año] × factorBono`.
- Calendario de bono indexado desde 2025: `[3333, 6666, 9999, 13333, 16666, 20000]`; pasado el último índice queda fijo en el último valor.
- El valor del "año X" se mide el **1/3 del año X+1** (`${X+1}-03-01`).
- Edad = año de la fecha − 1993.
- Cortes solo en fechas `YYYY-03-01` o `YYYY-09-01`.
- Valores de control (último año de cada escenario): 10% → 1290008.27 · 15% → 1306173.02 · MELI sin bono → 1395000.33 · MELI con bono → 1791530.84 · MELI sin rendimiento → 700064.88 · MELI 18k + bono → 1539882.73.
- Precio de balance de CEDEARs sigue siendo `priceArs / MEP` (no tocar `src/lib/calculations.ts`).
- Next.js 16: leer `node_modules/next/dist/docs/` ante cualquier API dudosa (AGENTS.md).
- **NUNCA commitear, pushear ni deployar sin preguntarle al usuario** (CLAUDE.md). Los pasos "Checkpoint" de este plan NO commitean.
- La base Turso es única (producción). Solo cambios aditivos (CREATE TABLE IF NOT EXISTS + seeds si la tabla está vacía).
- Montos visibles en HOME llevan `data-money` (blur con el toggle de ocultar montos).

## Review Focus

1. Corte cargado con fecha que no es 1/3 o 1/9, número negativo o texto → rechazado con mensaje claro que la UI muestra (test en Task 2).
2. Tasa tipeada como porcentaje (10 en vez de 0.10) → la UI convierte % → fracción; el servidor rechaza tasas > 1 (test en Task 2).
3. Escenario cuyo último objetivo ya pasó, o todos ocultos → `nextTarget` devuelve `null` y las tarjetas muestran estado vacío, nunca NaN (test en Task 1).
4. Fecha fuera del rango de un escenario (antes del primer 1/3 o después del último) → `targetAt` devuelve `null` y la UI muestra "—" (test en Task 1).
5. Cron ejecutado en un día que no es de corte, o dos veces el mismo día → no crea ni pisa cortes (verificación manual en Task 4).

---

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `src/lib/goals.ts` (crear) | Tipos `Scenario`, `ProjectionPoint`, `WealthParts`; funciones puras de proyección, interpolación, edad |
| `src/lib/goals.test.ts` (crear) | Tests de goals |
| `src/lib/wealth-input.ts` (crear) | Validación pura de bodies de API (cortes y escenarios) |
| `src/lib/wealth-input.test.ts` (crear) | Tests de validación |
| `src/db/schema.ts` (modificar) | Tablas `wealthSnapshots`, `goalScenarios` |
| `src/db/migrate-wealth.ts` (crear) | Crea tablas + seeds |
| `src/lib/wealth-data.ts` (crear) | Lectura DB + valor "hoy" |
| `src/app/api/wealth/snapshots/route.ts` (crear) | PUT/DELETE cortes |
| `src/app/api/wealth/scenarios/route.ts` (crear) | CRUD escenarios |
| `src/app/api/wealth/snapshot/route.ts` (crear) | Cron de corte automático |
| `vercel.json` (modificar) | Cron `0 13 1 3,9 *` |
| `src/app/bolsa/page.tsx` + `loading.tsx` (mover/crear) | Página de acciones actual |
| `src/app/page.tsx` (reemplazar) | HOME |
| `src/components/nav-bar.tsx` (modificar) | HOME + BOLSA |
| `src/app/globals.css` (modificar) | blur de montos en `data-section="home"` |
| `src/components/home/format.ts` | Formateadores |
| `src/components/home/panel.tsx` | Panel + estilos compartidos |
| `src/components/home/home-dashboard.tsx` | Compone la página |
| `src/components/home/wealth-header.tsx` | Patrimonio hoy |
| `src/components/home/goals-chart.tsx` | Gráfico objetivos vs real |
| `src/components/home/scenario-cards.tsx` | Tarjetas por escenario |
| `src/components/home/snapshots-table.tsx` | Tabla de cortes editable |
| `src/components/home/scenario-manager.tsx` | Edición de escenarios |
| `package.json` (modificar) | script `test` |

---

### Task 1: Motor de proyección (`goals.ts`)

**Files:**
- Create: `src/lib/goals.ts`
- Create: `src/lib/goals.test.ts`
- Modify: `package.json` (scripts)

**Interfaces:**
- Produces:
  - `interface Scenario { id: number; name: string; startYear: number; startValue: number; rate: number; contribution: number; bonusFactor: number; bonusSchedule: number[]; endYear: number; color: string; visible: boolean; sortOrder: number }`
  - `type ScenarioParams = Omit<Scenario, "id">`
  - `interface ProjectionPoint { year: number; date: string; value: number }`
  - `interface WealthParts { stocksUsd: number; bondsUsd: number; cryptoUsd: number; cashUsd: number }`
  - `BIRTH_YEAR = 1993`, `BONUS_START_YEAR = 2025`
  - `bonusFor(schedule: number[], year: number): number`
  - `measureDate(year: number): string`
  - `projectScenario(s: Pick<Scenario, "startYear"|"startValue"|"rate"|"contribution"|"bonusFactor"|"bonusSchedule"|"endYear">): ProjectionPoint[]`
  - `targetAt(points: ProjectionPoint[], date: string): number | null`
  - `nextTarget(points: ProjectionPoint[], date: string): ProjectionPoint | null`
  - `ageAt(date: string): number`
  - `partsTotal(p: WealthParts): number`

- [ ] **Step 1: Agregar script de test**

En `package.json`, dentro de `"scripts"`, agregar después de `"seed"`:

```json
    "seed": "npx tsx src/db/seed.ts",
    "test": "tsx --test src/lib/*.test.ts"
```

- [ ] **Step 2: Escribir el test que falla**

Crear `src/lib/goals.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bonusFor, measureDate, projectScenario, targetAt, nextTarget, ageAt, partsTotal,
} from "./goals";

const BONUS = [3333, 6666, 9999, 13333, 16666, 20000];
const base = { bonusSchedule: BONUS };

const SCENARIOS = [
  { name: "10%", startYear: 2024, startValue: 73000, rate: 0.10, contribution: 8000, bonusFactor: 0, endYear: 2047, last: 1290008.27 },
  { name: "15%", startYear: 2024, startValue: 73000, rate: 0.15, contribution: 8000, bonusFactor: 0, endYear: 2041, last: 1306173.02 },
  { name: "MELI sin bono", startYear: 2025, startValue: 108000, rate: 0.10, contribution: 25000, bonusFactor: 0, endYear: 2041, last: 1395000.33 },
  { name: "MELI con bono", startYear: 2025, startValue: 108000, rate: 0.10, contribution: 25000, bonusFactor: 0.67, endYear: 2041, last: 1791530.84 },
  { name: "MELI sin rendimiento", startYear: 2025, startValue: 108000, rate: 0, contribution: 25000, bonusFactor: 0.67, endYear: 2041, last: 700064.88 },
  { name: "MELI 18k + bono", startYear: 2025, startValue: 108000, rate: 0.10, contribution: 18000, bonusFactor: 0.67, endYear: 2041, last: 1539882.73 },
];

for (const s of SCENARIOS) {
  test(`projectScenario reproduce la planilla: ${s.name}`, () => {
    const pts = projectScenario({ ...base, ...s });
    assert.equal(pts.length, s.endYear - s.startYear + 1);
    assert.equal(pts[0].value, s.startValue);
    assert.equal(Math.round(pts.at(-1)!.value * 100) / 100, s.last);
  });
}

test("MELI con bono 2026 = 148266.22 y MELI 18k 2026 = 141266.22", () => {
  const conBono = projectScenario({ ...base, ...SCENARIOS[3] });
  const m18 = projectScenario({ ...base, ...SCENARIOS[5] });
  assert.equal(Math.round(conBono[1].value * 100) / 100, 148266.22);
  assert.equal(Math.round(m18[1].value * 100) / 100, 141266.22);
});

test("bonusFor: antes de 2025 es 0, después del calendario queda fijo", () => {
  assert.equal(bonusFor(BONUS, 2024), 0);
  assert.equal(bonusFor(BONUS, 2025), 3333);
  assert.equal(bonusFor(BONUS, 2030), 20000);
  assert.equal(bonusFor(BONUS, 2045), 20000);
  assert.equal(bonusFor([], 2030), 0);
});

test("measureDate: el año X se mide el 1/3 de X+1", () => {
  assert.equal(measureDate(2025), "2026-03-01");
  const pts = projectScenario({ ...base, ...SCENARIOS[0] });
  assert.equal(pts[0].date, "2025-03-01");
  assert.equal(pts[0].year, 2024);
});

test("targetAt: exacto en 1/3, interpolado entre 1/3, null fuera de rango", () => {
  const pts = projectScenario({ ...base, ...SCENARIOS[0] }); // 2025-03-01=73000, 2026-03-01=88300
  assert.equal(targetAt(pts, "2025-03-01"), 73000);
  assert.equal(targetAt(pts, "2026-03-01"), 88300);
  const mid = targetAt(pts, "2025-09-01")!;
  assert.ok(Math.abs(mid - (73000 + 15300 * 184 / 365)) < 0.01);
  assert.equal(targetAt(pts, "2025-02-28"), null);
  assert.equal(targetAt(pts, "2049-01-01"), null);
});

test("nextTarget: primer objetivo estrictamente posterior; null si ya pasaron todos", () => {
  const pts = projectScenario({ ...base, ...SCENARIOS[0] });
  assert.equal(nextTarget(pts, "2026-10-06")!.date, "2027-03-01");
  assert.equal(nextTarget(pts, "2027-03-01")!.date, "2028-03-01");
  assert.equal(nextTarget(pts, "2049-01-01"), null);
});

test("ageAt y partsTotal", () => {
  assert.equal(ageAt("2024-03-01"), 31);
  assert.equal(ageAt("2026-10-06"), 33);
  assert.equal(partsTotal({ stocksUsd: 85116, bondsUsd: 0, cryptoUsd: 24858.53, cashUsd: 31296 }), 141270.53);
});
```

- [ ] **Step 3: Correr y verificar que falla**

Run: `npm test`
Expected: FAIL — `Cannot find module './goals'`.

- [ ] **Step 4: Implementar**

Crear `src/lib/goals.ts`:

```ts
// Pure goal-projection logic — safe to import from client and server.

export interface Scenario {
  id: number;
  name: string;
  startYear: number;
  startValue: number;
  rate: number; // annual, fraction (0.10 = 10%)
  contribution: number; // USD added per year
  bonusFactor: number; // share of bonus that gets invested (0 = no bonus)
  bonusSchedule: number[]; // bonus per year from BONUS_START_YEAR; last value repeats
  endYear: number;
  color: string;
  visible: boolean;
  sortOrder: number;
}

export type ScenarioParams = Omit<Scenario, "id">;

export interface ProjectionPoint {
  year: number; // scenario year label
  date: string; // YYYY-MM-DD when this year's value is measured (1/3 of year+1)
  value: number;
}

export interface WealthParts {
  stocksUsd: number;
  bondsUsd: number;
  cryptoUsd: number;
  cashUsd: number;
}

export const BIRTH_YEAR = 1993;
export const BONUS_START_YEAR = 2025;

export function bonusFor(schedule: number[], year: number): number {
  if (schedule.length === 0) return 0;
  const i = year - BONUS_START_YEAR;
  if (i < 0) return 0;
  return schedule[Math.min(i, schedule.length - 1)];
}

export function measureDate(year: number): string {
  return `${year + 1}-03-01`;
}

export function projectScenario(
  s: Pick<Scenario, "startYear" | "startValue" | "rate" | "contribution" | "bonusFactor" | "bonusSchedule" | "endYear">
): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  let value = s.startValue;
  for (let year = s.startYear; year <= s.endYear; year++) {
    if (year > s.startYear) {
      value = value * (1 + s.rate) + s.contribution + bonusFor(s.bonusSchedule, year) * s.bonusFactor;
    }
    points.push({ year, date: measureDate(year), value });
  }
  return points;
}

// Target for any date: exact on a 1/3, linear between adjacent 1/3s, null outside the range
export function targetAt(points: ProjectionPoint[], date: string): number | null {
  const t = Date.parse(date);
  for (let i = 0; i < points.length; i++) {
    const pt = Date.parse(points[i].date);
    if (pt === t) return points[i].value;
    if (pt > t) {
      if (i === 0) return null;
      const prev = points[i - 1];
      const prevT = Date.parse(prev.date);
      return prev.value + ((points[i].value - prev.value) * (t - prevT)) / (pt - prevT);
    }
  }
  return null;
}

export function nextTarget(points: ProjectionPoint[], date: string): ProjectionPoint | null {
  return points.find((p) => p.date > date) ?? null;
}

export function ageAt(date: string): number {
  return Number(date.slice(0, 4)) - BIRTH_YEAR;
}

export function partsTotal(p: WealthParts): number {
  return Math.round((p.stocksUsd + p.bondsUsd + p.cryptoUsd + p.cashUsd) * 100) / 100;
}
```

- [ ] **Step 5: Correr y verificar que pasa**

Run: `npm test`
Expected: PASS — 12 tests, 0 failures.

- [ ] **Step 6: Checkpoint (sin commit)**

Run: `npx tsc --noEmit -p .`
Expected: sin errores.

---

### Task 2: Validación de inputs (`wealth-input.ts`)

**Files:**
- Create: `src/lib/wealth-input.ts`
- Create: `src/lib/wealth-input.test.ts`

**Interfaces:**
- Consumes: `WealthParts`, `ScenarioParams` de `src/lib/goals.ts`
- Produces:
  - `type Result<T> = { ok: true; value: T } | { ok: false; error: string }`
  - `type SnapshotInput = { date: string } & WealthParts`
  - `isCutDate(date: string): boolean`
  - `parseSnapshotInput(body: unknown): Result<SnapshotInput>`
  - `parseScenarioInput(body: unknown): Result<ScenarioParams>`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/wealth-input.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { isCutDate, parseSnapshotInput, parseScenarioInput } from "./wealth-input";

test("isCutDate solo acepta 1/3 y 1/9", () => {
  assert.equal(isCutDate("2027-03-01"), true);
  assert.equal(isCutDate("2027-09-01"), true);
  assert.equal(isCutDate("2027-03-02"), false);
  assert.equal(isCutDate("2027-06-01"), false);
  assert.equal(isCutDate("01/03/2027"), false);
});

test("parseSnapshotInput acepta números y strings numéricos; vacío = 0", () => {
  const r = parseSnapshotInput({ date: "2027-03-01", stocksUsd: "90000", bondsUsd: "", cryptoUsd: 25000.5, cashUsd: 0 });
  assert.deepEqual(r, { ok: true, value: { date: "2027-03-01", stocksUsd: 90000, bondsUsd: 0, cryptoUsd: 25000.5, cashUsd: 0 } });
});

test("parseSnapshotInput rechaza fecha inválida, negativos y texto", () => {
  assert.equal(parseSnapshotInput({ date: "2027-04-01", stocksUsd: 1 }).ok, false);
  assert.equal(parseSnapshotInput({ date: "2027-03-01", stocksUsd: -5 }).ok, false);
  assert.equal(parseSnapshotInput({ date: "2027-03-01", cashUsd: "mucho" }).ok, false);
  assert.equal(parseSnapshotInput(null).ok, false);
  const r = parseSnapshotInput({ date: "2027-04-01" });
  assert.ok(!r.ok && r.error.includes("1/3"));
});

const valid = {
  name: "MELI con bono", startYear: 2025, startValue: 108000, rate: 0.1, contribution: 25000,
  bonusFactor: 0.67, bonusSchedule: [3333, 6666], endYear: 2041, color: "#e8a317", visible: false, sortOrder: 3,
};

test("parseScenarioInput acepta un escenario válido", () => {
  assert.deepEqual(parseScenarioInput(valid), { ok: true, value: valid });
});

test("parseScenarioInput aplica defaults de color/visible/bono/orden", () => {
  const r = parseScenarioInput({ name: " X ", startYear: 2025, startValue: 1, rate: 0, contribution: 0, endYear: 2030 });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.name, "X");
    assert.equal(r.value.color, "#4a9eff");
    assert.equal(r.value.visible, true);
    assert.deepEqual(r.value.bonusSchedule, []);
    assert.equal(r.value.bonusFactor, 0);
    assert.equal(r.value.sortOrder, 0);
  }
});

test("parseScenarioInput rechaza tasa en porcentaje, años invertidos, nombre vacío y bono no numérico", () => {
  assert.equal(parseScenarioInput({ ...valid, rate: 10 }).ok, false);
  assert.equal(parseScenarioInput({ ...valid, endYear: 2020 }).ok, false);
  assert.equal(parseScenarioInput({ ...valid, name: "  " }).ok, false);
  assert.equal(parseScenarioInput({ ...valid, bonusSchedule: [1, null] }).ok, false);
  assert.equal(parseScenarioInput({ ...valid, startYear: 2025.5 }).ok, false);
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm test`
Expected: FAIL — `Cannot find module './wealth-input'`.

- [ ] **Step 3: Implementar**

Crear `src/lib/wealth-input.ts`:

```ts
import type { ScenarioParams, WealthParts } from "./goals";

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
export type SnapshotInput = { date: string } & WealthParts;

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

function num(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function isCutDate(date: string): boolean {
  return /^\d{4}-(03|09)-01$/.test(date);
}

export function parseSnapshotInput(body: unknown): Result<SnapshotInput> {
  if (!body || typeof body !== "object") return fail("Body inválido");
  const b = body as Record<string, unknown>;
  const date = typeof b.date === "string" ? b.date : "";
  if (!isCutDate(date)) return fail("La fecha tiene que ser 1/3 o 1/9 (YYYY-03-01 o YYYY-09-01)");

  const parts: WealthParts = { stocksUsd: 0, bondsUsd: 0, cryptoUsd: 0, cashUsd: 0 };
  for (const key of ["stocksUsd", "bondsUsd", "cryptoUsd", "cashUsd"] as const) {
    const raw = b[key];
    const n = raw === undefined || raw === "" ? 0 : num(raw);
    if (n === null || n < 0) return fail(`${key} tiene que ser un número >= 0`);
    parts[key] = n;
  }
  return { ok: true, value: { date, ...parts } };
}

export function parseScenarioInput(body: unknown): Result<ScenarioParams> {
  if (!body || typeof body !== "object") return fail("Body inválido");
  const b = body as Record<string, unknown>;

  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return fail("Falta el nombre");

  const startYear = num(b.startYear);
  if (startYear === null || !Number.isInteger(startYear) || startYear < 2000 || startYear > 2100) {
    return fail("Año inicial inválido");
  }
  const endYear = num(b.endYear);
  if (endYear === null || !Number.isInteger(endYear) || endYear < startYear || endYear > 2100) {
    return fail("El año final tiene que ser >= año inicial");
  }

  const startValue = num(b.startValue);
  if (startValue === null || startValue < 0) return fail("Valor inicial inválido");

  const rate = num(b.rate);
  if (rate === null || rate <= -1 || rate > 1) return fail("Tasa inválida (fracción: 0.10 = 10%)");

  const contribution = num(b.contribution);
  if (contribution === null) return fail("Aporte inválido");

  const bonusFactor = b.bonusFactor === undefined ? 0 : num(b.bonusFactor);
  if (bonusFactor === null || bonusFactor < 0) return fail("Factor de bono inválido");

  const rawSchedule = b.bonusSchedule === undefined ? [] : b.bonusSchedule;
  if (!Array.isArray(rawSchedule)) return fail("Calendario de bono inválido");
  const bonusSchedule: number[] = [];
  for (const x of rawSchedule) {
    const n = num(x);
    if (n === null || n < 0) return fail("Calendario de bono inválido");
    bonusSchedule.push(n);
  }

  const color = typeof b.color === "string" && /^#[0-9a-fA-F]{6}$/.test(b.color) ? b.color : "#4a9eff";
  const visible = b.visible === undefined ? true : b.visible === true || b.visible === 1;
  const sortOrder = Math.trunc(num(b.sortOrder) ?? 0);

  return {
    ok: true,
    value: { name, startYear, startValue, rate, contribution, bonusFactor, bonusSchedule, endYear, color, visible, sortOrder },
  };
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm test`
Expected: PASS — todos los tests de goals y wealth-input.

- [ ] **Step 5: Checkpoint (sin commit)**

Run: `npx tsc --noEmit -p .`
Expected: sin errores.

---

### Task 3: Tablas, migración y seeds

**Files:**
- Modify: `src/db/schema.ts` (al final del archivo)
- Create: `src/db/migrate-wealth.ts`

**Interfaces:**
- Produces: `wealthSnapshots`, `goalScenarios` (Drizzle tables) con columnas camelCase: `wealthSnapshots.{id, date, stocksUsd, bondsUsd, cryptoUsd, cashUsd, source, createdAt, updatedAt}`, `goalScenarios.{id, name, startYear, startValue, rate, contribution, bonusFactor, bonusSchedule (JSON text), endYear, color, visible (0/1), sortOrder}`.

- [ ] **Step 1: Agregar tablas al schema**

Al final de `src/db/schema.ts`:

```ts
// ── Home: patrimonio y objetivos ──

export const wealthSnapshots = sqliteTable("wealth_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull().unique(), // YYYY-03-01 or YYYY-09-01
  stocksUsd: real("stocks_usd").notNull().default(0),
  bondsUsd: real("bonds_usd").notNull().default(0),
  cryptoUsd: real("crypto_usd").notNull().default(0),
  cashUsd: real("cash_usd").notNull().default(0),
  source: text("source", { enum: ["auto", "manual"] }).notNull().default("manual"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at"),
});

export const goalScenarios = sqliteTable("goal_scenarios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  startYear: integer("start_year").notNull(),
  startValue: real("start_value").notNull(),
  rate: real("rate").notNull(),
  contribution: real("contribution").notNull(),
  bonusFactor: real("bonus_factor").notNull().default(0),
  bonusSchedule: text("bonus_schedule").notNull().default("[]"), // JSON number[]
  endYear: integer("end_year").notNull(),
  color: text("color").notNull(),
  visible: integer("visible").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
});
```

- [ ] **Step 2: Escribir la migración**

Crear `src/db/migrate-wealth.ts`:

```ts
import { createClient } from "@libsql/client";
import { readFileSync } from "fs";

const envContent = readFileSync(".env.local", "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const BONUS = JSON.stringify([3333, 6666, 9999, 13333, 16666, 20000]);

// [date, stocks, bonds, crypto, cash] — from the user's spreadsheet
const SNAPSHOTS: [string, number, number, number, number][] = [
  ["2024-03-01", 2315, 13173, 24491, 1100],
  ["2024-09-01", 2965, 15928, 17346, 3168],
  ["2025-03-01", 3619, 18816, 42218.5, 8384],
  ["2025-09-01", 36715, 0, 48350, 17000],
  ["2026-03-01", 71026, 0, 25726, 12626],
  ["2026-09-01", 85116, 0, 24858.53, 31296],
];

// [name, startYear, startValue, rate, contribution, bonusFactor, endYear, color, visible]
const SCENARIOS: [string, number, number, number, number, number, number, string, number][] = [
  ["10%", 2024, 73000, 0.10, 8000, 0, 2047, "#4a9eff", 1],
  ["15%", 2024, 73000, 0.15, 8000, 0, 2041, "#a78bfa", 1],
  ["MELI sin bono", 2025, 108000, 0.10, 25000, 0, 2041, "#7a8189", 0],
  ["MELI con bono", 2025, 108000, 0.10, 25000, 0.67, 2041, "#e8a317", 0],
  ["MELI sin rendimiento", 2025, 108000, 0, 25000, 0.67, 2041, "#e74c3c", 0],
  ["MELI 18k + bono", 2025, 108000, 0.10, 18000, 0.67, 2041, "#f0c674", 1],
];

async function migrate() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS wealth_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      stocks_usd REAL NOT NULL DEFAULT 0,
      bonds_usd REAL NOT NULL DEFAULT 0,
      crypto_usd REAL NOT NULL DEFAULT 0,
      cash_usd REAL NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'manual',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS goal_scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      start_year INTEGER NOT NULL,
      start_value REAL NOT NULL,
      rate REAL NOT NULL,
      contribution REAL NOT NULL,
      bonus_factor REAL NOT NULL DEFAULT 0,
      bonus_schedule TEXT NOT NULL DEFAULT '[]',
      end_year INTEGER NOT NULL,
      color TEXT NOT NULL,
      visible INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);

  const snapCount = Number((await client.execute("SELECT COUNT(*) AS n FROM wealth_snapshots")).rows[0].n);
  if (snapCount === 0) {
    for (const [date, s, b, c, cash] of SNAPSHOTS) {
      await client.execute({
        sql: "INSERT INTO wealth_snapshots (date, stocks_usd, bonds_usd, crypto_usd, cash_usd, source) VALUES (?, ?, ?, ?, ?, 'manual')",
        args: [date, s, b, c, cash],
      });
    }
    console.log(`Seeded ${SNAPSHOTS.length} wealth snapshots`);
  }

  const scenCount = Number((await client.execute("SELECT COUNT(*) AS n FROM goal_scenarios")).rows[0].n);
  if (scenCount === 0) {
    for (const [i, [name, startYear, startValue, rate, contribution, bonusFactor, endYear, color, visible]] of SCENARIOS.entries()) {
      await client.execute({
        sql: `INSERT INTO goal_scenarios (name, start_year, start_value, rate, contribution, bonus_factor, bonus_schedule, end_year, color, visible, sort_order)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [name, startYear, startValue, rate, contribution, bonusFactor, BONUS, endYear, color, visible, i],
      });
    }
    console.log(`Seeded ${SCENARIOS.length} goal scenarios`);
  }

  console.log("Migration complete: wealth_snapshots + goal_scenarios");
}

migrate().catch(console.error);
```

- [ ] **Step 3: Correr la migración (aditiva, base de producción)**

Run: `npx tsx src/db/migrate-wealth.ts`
Expected: `Seeded 6 wealth snapshots`, `Seeded 6 goal scenarios`, `Migration complete...`

- [ ] **Step 4: Verificar los datos**

Run:
```bash
set -a; source .env.local; set +a; node -e '
const {createClient}=require("@libsql/client");
const c=createClient({url:process.env.TURSO_DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN});
(async()=>{console.table((await c.execute("select date, stocks_usd+bonds_usd+crypto_usd+cash_usd total from wealth_snapshots order by date")).rows);
console.table((await c.execute("select name, visible from goal_scenarios order by sort_order")).rows)})()'
```
Expected: totales 41079, 39407, 73037.5, 102065, 109378, 141270.53; 6 escenarios (visibles: 10%, 15%, MELI 18k + bono).

- [ ] **Step 5: Re-correr la migración para confirmar idempotencia**

Run: `npx tsx src/db/migrate-wealth.ts`
Expected: solo `Migration complete...` (sin "Seeded").

- [ ] **Step 6: Checkpoint (sin commit)**

Run: `npx tsc --noEmit -p .` → sin errores.

---

### Task 4: Capa de datos, API y cron

**Files:**
- Create: `src/lib/wealth-data.ts`
- Create: `src/app/api/wealth/snapshots/route.ts`
- Create: `src/app/api/wealth/scenarios/route.ts`
- Create: `src/app/api/wealth/snapshot/route.ts`
- Modify: `vercel.json`

**Interfaces:**
- Consumes: `Scenario`, `WealthParts`, `partsTotal` (goals.ts); `parseSnapshotInput`, `parseScenarioInput`, `isCutDate` (wealth-input.ts); `wealthSnapshots`, `goalScenarios` (schema); `getPortfolioSummary()` → `{ totalValue, cashBalanceTotal }` (calculations.ts); `getCryptoSummary()` → `{ totalValue }` (crypto-data.ts); `GET()` de `src/app/api/refresh-prices/route.ts` y `src/app/api/crypto/refresh/route.ts`.
- Produces:
  - `interface WealthSnapshot extends WealthParts { id: number; date: string; source: "auto" | "manual"; total: number }`
  - `interface CurrentWealth extends WealthParts { date: string; total: number }`
  - `interface WealthOverview { today: CurrentWealth; snapshots: WealthSnapshot[]; scenarios: Scenario[] }`
  - `todayAR(): string`, `getCurrentWealth()`, `getWealthSnapshots()`, `getScenarios()`, `getWealthOverview()`
  - API: `PUT /api/wealth/snapshots` (body `SnapshotInput`), `DELETE /api/wealth/snapshots?id=N`, `GET|POST /api/wealth/scenarios`, `PUT /api/wealth/scenarios` (body `{ id, ...ScenarioParams }`), `DELETE /api/wealth/scenarios?id=N`, `GET /api/wealth/snapshot` (cron).

- [ ] **Step 1: Capa de datos**

Crear `src/lib/wealth-data.ts`:

```ts
import { db } from "@/db";
import { wealthSnapshots, goalScenarios } from "@/db/schema";
import { asc, desc } from "drizzle-orm";
import { getPortfolioSummary } from "@/lib/calculations";
import { getCryptoSummary } from "@/lib/crypto-data";
import { partsTotal, type Scenario, type WealthParts } from "@/lib/goals";

export interface WealthSnapshot extends WealthParts {
  id: number;
  date: string;
  source: "auto" | "manual";
  total: number;
}

export interface CurrentWealth extends WealthParts {
  date: string;
  total: number;
}

export interface WealthOverview {
  today: CurrentWealth;
  snapshots: WealthSnapshot[];
  scenarios: Scenario[];
}

// Today's date in Argentina as YYYY-MM-DD
export function todayAR(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
}

export async function getWealthSnapshots(): Promise<WealthSnapshot[]> {
  const rows = await db.select().from(wealthSnapshots).orderBy(asc(wealthSnapshots.date));
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    stocksUsd: r.stocksUsd,
    bondsUsd: r.bondsUsd,
    cryptoUsd: r.cryptoUsd,
    cashUsd: r.cashUsd,
    source: r.source,
    total: partsTotal(r),
  }));
}

export async function getScenarios(): Promise<Scenario[]> {
  const rows = await db.select().from(goalScenarios).orderBy(asc(goalScenarios.sortOrder), asc(goalScenarios.id));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    startYear: r.startYear,
    startValue: r.startValue,
    rate: r.rate,
    contribution: r.contribution,
    bonusFactor: r.bonusFactor,
    bonusSchedule: JSON.parse(r.bonusSchedule) as number[],
    endYear: r.endYear,
    color: r.color,
    visible: r.visible === 1,
    sortOrder: r.sortOrder,
  }));
}

// Live value: CEDEARs (MEP model) + crypto + cash; bonds aren't tracked, so take the latest cut's value
export async function getCurrentWealth(): Promise<CurrentWealth> {
  const [portfolio, crypto, lastCut] = await Promise.all([
    getPortfolioSummary(),
    getCryptoSummary(),
    db.select().from(wealthSnapshots).orderBy(desc(wealthSnapshots.date)).limit(1).get(),
  ]);
  const parts: WealthParts = {
    stocksUsd: portfolio.totalValue,
    bondsUsd: lastCut?.bondsUsd ?? 0,
    cryptoUsd: crypto.totalValue,
    cashUsd: portfolio.cashBalanceTotal,
  };
  return { date: todayAR(), ...parts, total: partsTotal(parts) };
}

export async function getWealthOverview(): Promise<WealthOverview> {
  const [today, snapshots, scenarios] = await Promise.all([
    getCurrentWealth(),
    getWealthSnapshots(),
    getScenarios(),
  ]);
  return { today, snapshots, scenarios };
}
```

- [ ] **Step 2: Ruta de cortes**

Crear `src/app/api/wealth/snapshots/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { wealthSnapshots } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseSnapshotInput } from "@/lib/wealth-input";

// PUT — create or edit the cut for a date (always marks it manual)
export async function PUT(request: NextRequest) {
  const parsed = parseSnapshotInput(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { date, stocksUsd, bondsUsd, cryptoUsd, cashUsd } = parsed.value;
  const now = new Date().toISOString();
  await db
    .insert(wealthSnapshots)
    .values({ date, stocksUsd, bondsUsd, cryptoUsd, cashUsd, source: "manual", updatedAt: now })
    .onConflictDoUpdate({
      target: wealthSnapshots.date,
      set: { stocksUsd, bondsUsd, cryptoUsd, cashUsd, source: "manual", updatedAt: now },
    });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await db.delete(wealthSnapshots).where(eq(wealthSnapshots.id, id));
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Ruta de escenarios**

Crear `src/app/api/wealth/scenarios/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { goalScenarios } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseScenarioInput } from "@/lib/wealth-input";
import { getScenarios } from "@/lib/wealth-data";
import type { ScenarioParams } from "@/lib/goals";

function toRow(v: ScenarioParams) {
  return { ...v, bonusSchedule: JSON.stringify(v.bonusSchedule), visible: v.visible ? 1 : 0 };
}

export async function GET() {
  return NextResponse.json(await getScenarios());
}

export async function POST(request: NextRequest) {
  const parsed = parseScenarioInput(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const [row] = await db.insert(goalScenarios).values(toRow(parsed.value)).returning();
  return NextResponse.json(row, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const id = Number(body?.id);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const parsed = parseScenarioInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  await db.update(goalScenarios).set(toRow(parsed.value)).where(eq(goalScenarios.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await db.delete(goalScenarios).where(eq(goalScenarios.id, id));
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Ruta del cron**

Crear `src/app/api/wealth/snapshot/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { wealthSnapshots } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isCutDate } from "@/lib/wealth-input";
import { getCurrentWealth, todayAR } from "@/lib/wealth-data";
import { GET as refreshCedears } from "@/app/api/refresh-prices/route";
import { GET as refreshCrypto } from "@/app/api/crypto/refresh/route";

const round2 = (n: number) => Math.round(n * 100) / 100;

// GET — cron on 1/3 and 1/9: stores today's wealth as an automatic cut (never overwrites)
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const date = todayAR();
  if (!isCutDate(date)) {
    return NextResponse.json({ ok: true, skipped: true, reason: "not a cut date", date });
  }

  const existing = await db.select().from(wealthSnapshots).where(eq(wealthSnapshots.date, date)).get();
  if (existing) {
    return NextResponse.json({ ok: true, skipped: true, reason: "already exists", date });
  }

  // Refresh prices first so the cut doesn't use stale cache; on failure fall back to cached prices
  try { await refreshCedears(); } catch (e) { console.error("wealth snapshot: CEDEAR refresh failed", e); }
  try { await refreshCrypto(); } catch (e) { console.error("wealth snapshot: crypto refresh failed", e); }

  const w = await getCurrentWealth();
  const values = {
    date,
    stocksUsd: round2(w.stocksUsd),
    bondsUsd: round2(w.bondsUsd),
    cryptoUsd: round2(w.cryptoUsd),
    cashUsd: round2(w.cashUsd),
    source: "auto" as const,
    updatedAt: new Date().toISOString(),
  };
  await db.insert(wealthSnapshots).values(values);

  return NextResponse.json({ ok: true, ...values });
}
```

- [ ] **Step 5: Cron en vercel.json**

En `vercel.json`, agregar al array `crons`:

```json
    {
      "path": "/api/wealth/snapshot",
      "schedule": "0 13 1 3,9 *"
    }
```

- [ ] **Step 6: Verificar con el dev server**

Run (background): `npm run dev`, luego:

```bash
curl -s http://localhost:3000/api/wealth/scenarios | head -c 300; echo
curl -s http://localhost:3000/api/wealth/snapshot; echo
curl -s -X PUT http://localhost:3000/api/wealth/snapshots -H 'Content-Type: application/json' -d '{"date":"2026-04-01","stocksUsd":1}'; echo
curl -s -X POST http://localhost:3000/api/wealth/scenarios -H 'Content-Type: application/json' -d '{"name":"x","startYear":2025,"startValue":1,"rate":10,"contribution":0,"endYear":2030}'; echo
```
Expected:
1. JSON array de 6 escenarios con `bonusSchedule` como array y `visible` booleano.
2. `{"ok":true,"skipped":true,"reason":"not a cut date",...}` (hoy no es 1/3 ni 1/9).
3. `{"error":"La fecha tiene que ser 1/3 o 1/9 ..."}`.
4. `{"error":"Tasa inválida (fracción: 0.10 = 10%)"}`.

- [ ] **Step 7: Checkpoint (sin commit)**

Run: `npx tsc --noEmit -p . && npm test` → sin errores, tests en verde.

---

### Task 5: Mover BOLSA a `/bolsa`, nav y esqueleto de HOME con patrimonio

**Files:**
- Move: `src/app/page.tsx` → `src/app/bolsa/page.tsx`
- Create: `src/app/bolsa/loading.tsx` (copia de `src/app/loading.tsx`)
- Create: `src/app/page.tsx` (HOME)
- Modify: `src/components/nav-bar.tsx:8-12`
- Modify: `src/app/globals.css:45-46`
- Create: `src/components/home/format.ts`, `panel.tsx`, `home-dashboard.tsx`, `wealth-header.tsx`

**Interfaces:**
- Consumes: `getWealthOverview()`, `WealthOverview`, `CurrentWealth` (wealth-data.ts — en componentes cliente solo con `import type`).
- Produces:
  - `format.ts`: `fmtUsd(v: number): string`, `fmtSignedUsd(v: number): string`, `fmtPct(v: number): string`, `fmtK(v: number): string`, `fmtCut(date: string): string`
  - `panel.tsx`: `Panel({ title, right?, children })`, `INPUT_STYLE`, `BTN_STYLE`, `TH_STYLE`, `TD_STYLE` (CSSProperties)
  - `HomeDashboard({ overview }: { overview: WealthOverview })`
  - `WealthHeader({ today }: { today: CurrentWealth })`

- [ ] **Step 1: Mover la página de acciones**

```bash
mkdir -p src/app/bolsa
git mv src/app/page.tsx src/app/bolsa/page.tsx
cp src/app/loading.tsx src/app/bolsa/loading.tsx
```

En `src/app/bolsa/page.tsx` renombrar la función: `export default async function Home()` → `export default async function BolsaPage()`.

- [ ] **Step 2: Nav**

En `src/components/nav-bar.tsx`, reemplazar el array `sections`:

```ts
const sections = [
  { href: "/", label: "HOME" },
  { href: "/bolsa", label: "BOLSA" },
  { href: "/crypto", label: "CRYPTO" },
  { href: "/gastos", label: "GASTOS" },
];
```

(La lógica de activo ya trata `/` como exacto: `s.href === "/" ? pathname === "/" : pathname.startsWith(s.href)`.)

- [ ] **Step 3: Blur de montos en HOME**

En `src/app/globals.css`, reemplazar el selector:

```css
.hide-money [data-section="investments"] [data-money],
.hide-money [data-section="crypto"] [data-money],
.hide-money [data-section="home"] [data-money] {
```

- [ ] **Step 4: Formateadores**

Crear `src/components/home/format.ts`:

```ts
export function fmtUsd(v: number): string {
  return "$" + Math.round(v).toLocaleString("en-US");
}

export function fmtSignedUsd(v: number): string {
  return (v >= 0 ? "+" : "−") + fmtUsd(Math.abs(v));
}

export function fmtPct(v: number): string {
  return (v >= 0 ? "+" : "") + v.toFixed(1) + "%";
}

export function fmtK(v: number): string {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${Math.round(v / 1e3)}k`;
  return `$${Math.round(v)}`;
}

const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

// "2027-03-01" → "MAR 27"
export function fmtCut(date: string): string {
  return `${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(2, 4)}`;
}
```

- [ ] **Step 5: Panel y estilos compartidos**

Crear `src/components/home/panel.tsx`:

```tsx
import type { CSSProperties, ReactNode } from "react";

const MONO = "var(--font-jetbrains, monospace)";

export const INPUT_STYLE: CSSProperties = {
  background: "#1a2030",
  border: "1px solid #2a3545",
  color: "var(--text)",
  fontSize: 11,
  padding: "3px 6px",
  fontFamily: MONO,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

export const BTN_STYLE: CSSProperties = {
  background: "#1a2030",
  border: "1px solid #2a3545",
  color: "var(--text)",
  fontSize: 9.5,
  letterSpacing: 0.8,
  padding: "4px 10px",
  cursor: "pointer",
  fontFamily: MONO,
  whiteSpace: "nowrap",
};

export const TH_STYLE: CSSProperties = {
  padding: "6px 10px",
  borderBottom: "1px solid var(--border)",
  fontWeight: 500,
  color: "var(--text-mute)",
  fontSize: 9.5,
  letterSpacing: 0.8,
  textAlign: "right",
  whiteSpace: "nowrap",
};

export const TD_STYLE: CSSProperties = {
  padding: "6px 10px",
  textAlign: "right",
  whiteSpace: "nowrap",
};

export function Panel({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border)", fontFamily: MONO }}>
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: "var(--accent)", fontSize: 10, letterSpacing: 1, fontWeight: 600, textTransform: "uppercase" }}>
          {title}
        </span>
        {right}
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 6: Header de patrimonio**

Crear `src/components/home/wealth-header.tsx`:

```tsx
import type { CurrentWealth } from "@/lib/wealth-data";
import { fmtUsd } from "./format";

const CLASSES = [
  { key: "stocksUsd", label: "ACCIONES", color: "#4a9eff" },
  { key: "bondsUsd", label: "BONOS", color: "#a78bfa" },
  { key: "cryptoUsd", label: "CRYPTO", color: "#e8a317" },
  { key: "cashUsd", label: "CASH", color: "#2bb673" },
] as const;

export function WealthHeader({ today }: { today: CurrentWealth }) {
  const pct = (v: number) => (today.total > 0 ? (v / today.total) * 100 : 0);
  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--border)",
        padding: "14px 16px",
        fontFamily: "var(--font-jetbrains, monospace)",
      }}
    >
      <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: 1, fontWeight: 600 }}>PATRIMONIO TOTAL · HOY</div>
      <div style={{ fontSize: 32, fontWeight: 500, marginTop: 4, fontVariantNumeric: "tabular-nums" }} data-money>
        {fmtUsd(today.total)}
      </div>

      <div style={{ display: "flex", height: 8, marginTop: 12, background: "var(--border)" }}>
        {CLASSES.map((c) =>
          today[c.key] > 0 ? (
            <div key={c.key} style={{ width: `${pct(today[c.key])}%`, background: c.color }} title={`${c.label} ${pct(today[c.key]).toFixed(1)}%`} />
          ) : null
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 10,
          marginTop: 12,
          fontSize: 11,
        }}
      >
        {CLASSES.map((c) => (
          <div key={c.key}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9.5, color: "var(--text-dim)", letterSpacing: 0.8 }}>
              <span style={{ width: 8, height: 8, background: c.color, display: "inline-block" }} />
              {c.label}
            </div>
            <div style={{ marginTop: 3, fontVariantNumeric: "tabular-nums" }}>
              <span data-money>{fmtUsd(today[c.key])}</span>
              <span style={{ color: "var(--text-dim)", marginLeft: 6 }}>{pct(today[c.key]).toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Dashboard (versión inicial) y página**

Crear `src/components/home/home-dashboard.tsx`:

```tsx
import type { WealthOverview } from "@/lib/wealth-data";
import { WealthHeader } from "./wealth-header";

export function HomeDashboard({ overview }: { overview: WealthOverview }) {
  return (
    <div className="page-wrap" style={{ padding: 14, display: "grid", gap: 12, maxWidth: 1600, margin: "0 auto" }}>
      <WealthHeader today={overview.today} />
    </div>
  );
}
```

Crear `src/app/page.tsx`:

```tsx
import { getWealthOverview } from "@/lib/wealth-data";
import { HomeDashboard } from "@/components/home/home-dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const overview = await getWealthOverview();
  return (
    <main data-section="home" style={{ minHeight: "100vh" }}>
      <HomeDashboard overview={overview} />
    </main>
  );
}
```

- [ ] **Step 8: Verificar**

Con el dev server corriendo:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/bolsa
curl -s http://localhost:3000/ | grep -o "PATRIMONIO TOTAL · HOY\|HOME\|BOLSA" | sort | uniq -c
curl -s http://localhost:3000/bolsa | grep -o "Prom EEUU" | head -1
```
Expected: `200`; aparecen "PATRIMONIO TOTAL · HOY", "HOME", "BOLSA"; `/bolsa` contiene "Prom EEUU".

Run: `npx tsc --noEmit -p .` → sin errores.

- [ ] **Step 9: Checkpoint (sin commit)**

---

### Task 6: Gráfico objetivos vs real y tarjetas por escenario

**Files:**
- Create: `src/components/home/goals-chart.tsx`
- Create: `src/components/home/scenario-cards.tsx`
- Modify: `src/components/home/home-dashboard.tsx`

**Interfaces:**
- Consumes: `projectScenario`, `targetAt`, `nextTarget`, `BIRTH_YEAR`, `Scenario` (goals.ts); `WealthSnapshot`, `CurrentWealth` (tipos); `Panel`, `BTN_STYLE`; `fmtUsd`, `fmtSignedUsd`, `fmtPct`, `fmtK`, `fmtCut`.
- Produces: `GoalsChart({ scenarios, snapshots, today })`, `ScenarioCards({ scenarios, today })`.

- [ ] **Step 1: Gráfico**

Crear `src/components/home/goals-chart.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { projectScenario, BIRTH_YEAR, type Scenario } from "@/lib/goals";
import type { CurrentWealth, WealthSnapshot } from "@/lib/wealth-data";
import { Panel, BTN_STYLE } from "./panel";
import { fmtUsd, fmtK } from "./format";

const AXIS_TICK = { fill: "#4a5159", fontSize: 10, fontFamily: "var(--font-jetbrains, monospace)" };
const TOOLTIP_STYLE = {
  backgroundColor: "#0a0e0d",
  border: "1px solid #2a323b",
  borderRadius: 0,
  fontFamily: "var(--font-jetbrains, monospace)",
  fontSize: 11,
  color: "#d4d6d9",
};
const REAL_COLOR = "#2bb673";

interface Props {
  scenarios: Scenario[];
  snapshots: WealthSnapshot[];
  today: CurrentWealth;
}

export function GoalsChart({ scenarios, snapshots, today }: Props) {
  const [log, setLog] = useState(false);

  const series = useMemo(
    () =>
      scenarios
        .filter((s) => s.visible)
        .map((s) => ({ s, data: projectScenario(s).map((p) => ({ t: Date.parse(p.date), value: p.value })) })),
    [scenarios]
  );

  const real = useMemo(
    () =>
      [
        ...snapshots.map((s) => ({ t: Date.parse(s.date), value: s.total })),
        { t: Date.parse(today.date), value: today.total },
      ].sort((a, b) => a.t - b.t),
    [snapshots, today]
  );

  const ticks = useMemo(() => {
    const all = [...real.map((p) => p.t), ...series.flatMap((x) => x.data.map((p) => p.t))];
    const minY = new Date(Math.min(...all)).getUTCFullYear();
    const maxY = new Date(Math.max(...all)).getUTCFullYear();
    const out: number[] = [];
    for (let y = minY; y <= maxY; y += 2) out.push(Date.UTC(y, 2, 1));
    return out;
  }, [real, series]);

  return (
    <Panel
      title="OBJETIVOS VS REAL"
      right={
        <button onClick={() => setLog((l) => !l)} style={{ ...BTN_STYLE, color: log ? "var(--accent)" : "var(--text-dim)" }}>
          {log ? "ESCALA LOG" : "ESCALA LINEAL"}
        </button>
      }
    >
      <div style={{ padding: "12px 8px 4px", height: 340 }} data-money>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
            <CartesianGrid stroke="#1f262e" vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              ticks={ticks}
              tickFormatter={(t: number) => {
                const y = new Date(t).getUTCFullYear();
                return `${y} · ${y - BIRTH_YEAR}`;
              }}
              tick={AXIS_TICK}
              stroke="#2a323b"
              allowDuplicatedCategory={false}
            />
            <YAxis
              type="number"
              scale={log ? "log" : "linear"}
              domain={log ? ["auto", "auto"] : [0, "auto"]}
              allowDataOverflow
              tickFormatter={fmtK}
              tick={AXIS_TICK}
              stroke="#2a323b"
              width={56}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelFormatter={(t) => new Date(Number(t)).toISOString().slice(0, 10)}
              formatter={(v) => fmtUsd(Number(v))}
            />
            {series.map(({ s, data }) => (
              <Line
                key={s.id}
                data={data}
                dataKey="value"
                name={s.name}
                stroke={s.color}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                isAnimationActive={false}
              />
            ))}
            <Line
              data={real}
              dataKey="value"
              name="Real"
              stroke={REAL_COLOR}
              strokeWidth={2.5}
              dot={{ r: 3, fill: REAL_COLOR }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, padding: "6px 14px 12px", fontSize: 10, color: "var(--text-dim)" }}>
        <Legend color={REAL_COLOR} label="REAL" solid />
        {series.map(({ s }) => (
          <Legend key={s.id} color={s.color} label={s.name} />
        ))}
      </div>
    </Panel>
  );
}

function Legend({ color, label, solid }: { color: string; label: string; solid?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 16, borderTop: `2px ${solid ? "solid" : "dashed"} ${color}`, display: "inline-block" }} />
      {label}
    </span>
  );
}
```

- [ ] **Step 2: Tarjetas**

Crear `src/components/home/scenario-cards.tsx`:

```tsx
import { projectScenario, targetAt, nextTarget, type Scenario } from "@/lib/goals";
import type { CurrentWealth } from "@/lib/wealth-data";
import { Panel } from "./panel";
import { fmtUsd, fmtSignedUsd, fmtPct, fmtCut } from "./format";

const LABEL = { fontSize: 9, color: "var(--text-dim)", letterSpacing: 0.8, marginTop: 8 } as const;

export function ScenarioCards({ scenarios, today }: { scenarios: Scenario[]; today: CurrentWealth }) {
  const cards = scenarios
    .filter((s) => s.visible)
    .map((s) => {
      const points = projectScenario(s);
      return { s, next: nextTarget(points, today.date), targetNow: targetAt(points, today.date) };
    })
    .filter((c) => c.next !== null);

  if (cards.length === 0) {
    return (
      <Panel title="ESCENARIOS">
        <div style={{ padding: 16, textAlign: "center", color: "var(--text-mute)", fontSize: 10, letterSpacing: 1 }}>
          SIN ESCENARIOS VISIBLES CON OBJETIVOS FUTUROS
        </div>
      </Panel>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
      {cards.map(({ s, next, targetNow }) => {
        const diff = targetNow != null ? today.total - targetNow : null;
        const diffPct = diff != null && targetNow ? (diff / targetNow) * 100 : null;
        const remaining = next!.value - today.total;
        const up = diff != null && diff >= 0;
        return (
          <div
            key={s.id}
            style={{
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderTop: `2px solid ${s.color}`,
              padding: "10px 14px 12px",
              fontFamily: "var(--font-jetbrains, monospace)",
              fontSize: 12,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <div style={{ color: s.color, fontWeight: 700, fontSize: 11, letterSpacing: 0.6 }}>{s.name}</div>

            <div style={LABEL}>OBJETIVO {fmtCut(next!.date)}</div>
            <div data-money>{fmtUsd(next!.value)}</div>

            <div style={LABEL}>HOY VS OBJETIVO</div>
            {diff == null || diffPct == null ? (
              <div style={{ color: "var(--text-dim)" }}>—</div>
            ) : (
              <div style={{ color: up ? "var(--up)" : "var(--down)", fontWeight: 600 }}>
                {fmtPct(diffPct)} <span data-money style={{ fontWeight: 400 }}>({fmtSignedUsd(diff)})</span>
              </div>
            )}

            <div style={LABEL}>FALTA</div>
            {remaining <= 0 ? (
              <div style={{ color: "var(--up)", fontWeight: 600 }}>ALCANZADO ✓</div>
            ) : (
              <div data-money>{fmtUsd(remaining)}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Agregar al dashboard**

Reemplazar `src/components/home/home-dashboard.tsx`:

```tsx
import type { WealthOverview } from "@/lib/wealth-data";
import { WealthHeader } from "./wealth-header";
import { GoalsChart } from "./goals-chart";
import { ScenarioCards } from "./scenario-cards";

export function HomeDashboard({ overview }: { overview: WealthOverview }) {
  const { today, snapshots, scenarios } = overview;
  return (
    <div className="page-wrap" style={{ padding: 14, display: "grid", gap: 12, maxWidth: 1600, margin: "0 auto" }}>
      <WealthHeader today={today} />
      <GoalsChart scenarios={scenarios} snapshots={snapshots} today={today} />
      <ScenarioCards scenarios={scenarios} today={today} />
    </div>
  );
}
```

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit -p .` → sin errores (si recharts 3 se queja del tipo de `formatter`/`labelFormatter`, tipar los parámetros como `(v: unknown)` y castear con `Number(v)`).

Con el dev server: `curl -s http://localhost:3000/ | grep -o "OBJETIVOS VS REAL\|OBJETIVO MAR 27" | sort | uniq -c` → aparecen ambos.

Abrir http://localhost:3000 en el navegador y verificar: línea real verde con 7 puntos (6 cortes + hoy), 3 líneas punteadas (10%, 15%, MELI 18k + bono), toggle LOG cambia el eje Y, tarjetas muestran objetivo MAR 27 (10% ≈ $105,130; 15% ≈ $113,743; MELI 18k + bono ≈ $141,266).

- [ ] **Step 5: Checkpoint (sin commit)**

---

### Task 7: Tabla de cortes editable y gestor de escenarios

**Files:**
- Create: `src/components/home/snapshots-table.tsx`
- Create: `src/components/home/scenario-manager.tsx`
- Modify: `src/components/home/home-dashboard.tsx`

**Interfaces:**
- Consumes: `projectScenario`, `targetAt`, `ageAt`, `Scenario` (goals.ts); `WealthSnapshot` (tipo); API `PUT/DELETE /api/wealth/snapshots`, `POST/PUT/DELETE /api/wealth/scenarios`; `Panel`, `INPUT_STYLE`, `BTN_STYLE`, `TH_STYLE`, `TD_STYLE`; `fmtUsd`, `fmtPct`, `fmtCut`.
- Produces: `SnapshotsTable({ snapshots, scenarios })`, `ScenarioManager({ scenarios })`.

- [ ] **Step 1: Tabla de cortes**

Crear `src/components/home/snapshots-table.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { projectScenario, targetAt, ageAt, type Scenario } from "@/lib/goals";
import type { WealthSnapshot } from "@/lib/wealth-data";
import { Panel, INPUT_STYLE, BTN_STYLE, TH_STYLE, TD_STYLE } from "./panel";
import { fmtUsd, fmtPct, fmtCut } from "./format";

const FIELDS = [
  ["stocksUsd", "ACCIONES"],
  ["bondsUsd", "BONOS"],
  ["cryptoUsd", "CRYPTO"],
  ["cashUsd", "CASH"],
] as const;

type Draft = { date: string; stocksUsd: string; bondsUsd: string; cryptoUsd: string; cashUsd: string };

export function SnapshotsTable({ snapshots, scenarios }: { snapshots: WealthSnapshot[]; scenarios: Scenario[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const visible = scenarios.filter((s) => s.visible).map((s) => ({ s, points: projectScenario(s) }));

  function startEdit(snap?: WealthSnapshot) {
    setError(null);
    setIsNew(!snap);
    setDraft(
      snap
        ? {
            date: snap.date,
            stocksUsd: String(snap.stocksUsd),
            bondsUsd: String(snap.bondsUsd),
            cryptoUsd: String(snap.cryptoUsd),
            cashUsd: String(snap.cashUsd),
          }
        : { date: "", stocksUsd: "", bondsUsd: "", cryptoUsd: "", cashUsd: "" }
    );
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/wealth/snapshots", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Error al guardar");
      return;
    }
    setDraft(null);
    router.refresh();
  }

  async function remove(id: number) {
    if (!confirm("¿Borrar este corte?")) return;
    await fetch(`/api/wealth/snapshots?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  const editInputs = (
    <>
      {FIELDS.map(([key]) => (
        <td key={key} style={TD_STYLE}>
          <input
            style={{ ...INPUT_STYLE, width: 90, textAlign: "right" }}
            type="number"
            min="0"
            step="0.01"
            value={draft?.[key] ?? ""}
            onChange={(e) => setDraft((d) => (d ? { ...d, [key]: e.target.value } : d))}
          />
        </td>
      ))}
      <td style={TD_STYLE} colSpan={2 + visible.length}>
        <button style={BTN_STYLE} onClick={save} disabled={saving}>{saving ? "..." : "GUARDAR"}</button>{" "}
        <button style={BTN_STYLE} onClick={() => setDraft(null)}>CANCELAR</button>
      </td>
    </>
  );

  return (
    <Panel title={`CORTES · ${snapshots.length}`} right={<button style={BTN_STYLE} onClick={() => startEdit()}>+ CORTE</button>}>
      {error && <div style={{ padding: "6px 14px", color: "var(--down)", fontSize: 11 }}>{error}</div>}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, fontVariantNumeric: "tabular-nums" }}>
          <thead>
            <tr>
              <th style={{ ...TH_STYLE, textAlign: "left" }}>FECHA</th>
              <th style={TH_STYLE}>EDAD</th>
              {FIELDS.map(([key, label]) => (
                <th key={key} style={TH_STYLE}>{label}</th>
              ))}
              <th style={TH_STYLE}>TOTAL</th>
              {visible.map(({ s }) => (
                <th key={s.id} style={{ ...TH_STYLE, color: s.color }}>VS {s.name}</th>
              ))}
              <th style={TH_STYLE} />
            </tr>
          </thead>
          <tbody>
            {isNew && draft && (
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ ...TD_STYLE, textAlign: "left" }}>
                  <input
                    style={{ ...INPUT_STYLE, width: 130 }}
                    type="date"
                    value={draft.date}
                    onChange={(e) => setDraft((d) => (d ? { ...d, date: e.target.value } : d))}
                  />
                </td>
                <td style={TD_STYLE} />
                {editInputs}
              </tr>
            )}
            {snapshots.map((snap) => {
              const editing = !isNew && draft?.date === snap.date;
              return (
                <tr key={snap.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ ...TD_STYLE, textAlign: "left", fontWeight: 600 }}>
                    {fmtCut(snap.date)}
                    {snap.source === "auto" && <span style={{ color: "var(--text-mute)", fontSize: 9, marginLeft: 6 }}>AUTO</span>}
                  </td>
                  <td style={{ ...TD_STYLE, color: "var(--text-dim)" }}>{ageAt(snap.date)}</td>
                  {editing ? (
                    editInputs
                  ) : (
                    <>
                      {FIELDS.map(([key]) => (
                        <td key={key} style={{ ...TD_STYLE, color: "var(--text-dim)" }}>
                          <span data-money>{fmtUsd(snap[key])}</span>
                        </td>
                      ))}
                      <td style={{ ...TD_STYLE, fontWeight: 600 }}>
                        <span data-money>{fmtUsd(snap.total)}</span>
                      </td>
                      {visible.map(({ s, points }) => {
                        const target = targetAt(points, snap.date);
                        if (target == null) return <td key={s.id} style={{ ...TD_STYLE, color: "var(--text-mute)" }}>—</td>;
                        const pct = (snap.total / target - 1) * 100;
                        return (
                          <td key={s.id} style={{ ...TD_STYLE, color: pct >= 0 ? "var(--up)" : "var(--down)" }}>
                            {fmtPct(pct)}
                          </td>
                        );
                      })}
                      <td style={{ ...TD_STYLE, color: "var(--text-mute)" }}>
                        <button style={{ ...BTN_STYLE, padding: "2px 6px" }} onClick={() => startEdit(snap)}>✎</button>{" "}
                        <button style={{ ...BTN_STYLE, padding: "2px 6px" }} onClick={() => remove(snap.id)}>✕</button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
```

- [ ] **Step 2: Gestor de escenarios**

Crear `src/components/home/scenario-manager.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Scenario } from "@/lib/goals";
import { Panel, INPUT_STYLE, BTN_STYLE } from "./panel";

type Draft = {
  id: number | null;
  name: string;
  color: string;
  visible: boolean;
  startYear: string;
  startValue: string;
  ratePct: string;
  contribution: string;
  bonusFactor: string;
  bonusSchedule: string;
  endYear: string;
  sortOrder: number;
};

function toDraft(s: Scenario): Draft {
  return {
    id: s.id,
    name: s.name,
    color: s.color,
    visible: s.visible,
    startYear: String(s.startYear),
    startValue: String(s.startValue),
    ratePct: String(Math.round(s.rate * 100 * 10000) / 10000),
    contribution: String(s.contribution),
    bonusFactor: String(s.bonusFactor),
    bonusSchedule: s.bonusSchedule.join(", "),
    endYear: String(s.endYear),
    sortOrder: s.sortOrder,
  };
}

// UI works in % for the rate; the API expects a fraction
function toBody(d: Draft) {
  return {
    id: d.id,
    name: d.name,
    color: d.color,
    visible: d.visible,
    startYear: Number(d.startYear),
    startValue: Number(d.startValue),
    rate: Number(d.ratePct) / 100,
    contribution: Number(d.contribution),
    bonusFactor: d.bonusFactor === "" ? 0 : Number(d.bonusFactor),
    bonusSchedule: d.bonusSchedule.split(",").map((x) => x.trim()).filter(Boolean).map(Number),
    endYear: Number(d.endYear),
    sortOrder: d.sortOrder,
  };
}

const FIELDS: [keyof Draft, string][] = [
  ["name", "NOMBRE"],
  ["startYear", "AÑO INICIAL"],
  ["startValue", "VALOR INICIAL"],
  ["ratePct", "TASA % ANUAL"],
  ["contribution", "APORTE / AÑO"],
  ["bonusFactor", "FACTOR BONO"],
  ["bonusSchedule", "BONO POR AÑO (desde 2025)"],
  ["endYear", "AÑO FINAL"],
];

export function ScenarioManager({ scenarios }: { scenarios: Scenario[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(method: "POST" | "PUT", d: Draft) {
    setError(null);
    const res = await fetch("/api/wealth/scenarios", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toBody(d)),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Error al guardar");
      return false;
    }
    router.refresh();
    return true;
  }

  async function save() {
    if (!draft) return;
    if (await send(draft.id == null ? "POST" : "PUT", draft)) setDraft(null);
  }

  async function toggleVisible(s: Scenario) {
    await send("PUT", { ...toDraft(s), visible: !s.visible });
  }

  async function remove(s: Scenario) {
    if (!confirm(`¿Borrar el escenario "${s.name}"?`)) return;
    await fetch(`/api/wealth/scenarios?id=${s.id}`, { method: "DELETE" });
    router.refresh();
  }

  function startNew() {
    setError(null);
    setDraft({
      id: null, name: "Nuevo", color: "#4a9eff", visible: true, startYear: "2025", startValue: "",
      ratePct: "10", contribution: "0", bonusFactor: "0", bonusSchedule: "", endYear: "2045",
      sortOrder: scenarios.length,
    });
  }

  return (
    <Panel
      title={`ESCENARIOS · ${scenarios.length}`}
      right={
        <span style={{ display: "flex", gap: 6 }}>
          {open && <button style={BTN_STYLE} onClick={startNew}>+ ESCENARIO</button>}
          <button style={BTN_STYLE} onClick={() => setOpen((o) => !o)}>{open ? "CERRAR" : "EDITAR"}</button>
        </span>
      }
    >
      {open && (
        <div style={{ padding: "8px 14px 12px", fontSize: 11 }}>
          {error && <div style={{ color: "var(--down)", marginBottom: 8 }}>{error}</div>}
          {scenarios.map((s) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
              <input type="checkbox" checked={s.visible} onChange={() => toggleVisible(s)} title="Mostrar en gráfico" />
              <span style={{ width: 10, height: 10, background: s.color, display: "inline-block" }} />
              <span style={{ flex: 1 }}>{s.name}</span>
              <span style={{ color: "var(--text-dim)", fontSize: 10 }}>
                {(s.rate * 100).toFixed(1)}% · +{s.contribution.toLocaleString("en-US")}
                {s.bonusFactor > 0 ? ` · bono×${s.bonusFactor}` : ""} · {s.startYear}–{s.endYear}
              </span>
              <button style={{ ...BTN_STYLE, padding: "2px 6px" }} onClick={() => { setError(null); setDraft(toDraft(s)); }}>✎</button>
              <button style={{ ...BTN_STYLE, padding: "2px 6px" }} onClick={() => remove(s)}>✕</button>
            </div>
          ))}

          {draft && (
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
              {FIELDS.map(([key, label]) => (
                <label key={key} style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 9, color: "var(--text-dim)", letterSpacing: 0.6 }}>
                  {label}
                  <input
                    style={INPUT_STYLE}
                    value={String(draft[key])}
                    onChange={(e) => setDraft((d) => (d ? { ...d, [key]: e.target.value } : d))}
                  />
                </label>
              ))}
              <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 9, color: "var(--text-dim)", letterSpacing: 0.6 }}>
                COLOR
                <input
                  type="color"
                  style={{ ...INPUT_STYLE, height: 24, padding: 0 }}
                  value={draft.color}
                  onChange={(e) => setDraft((d) => (d ? { ...d, color: e.target.value } : d))}
                />
              </label>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
                <button style={BTN_STYLE} onClick={save}>GUARDAR</button>
                <button style={BTN_STYLE} onClick={() => setDraft(null)}>CANCELAR</button>
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
```

- [ ] **Step 3: Agregar al dashboard**

En `src/components/home/home-dashboard.tsx`, agregar los imports y las dos secciones al final del grid:

```tsx
import { SnapshotsTable } from "./snapshots-table";
import { ScenarioManager } from "./scenario-manager";
```

```tsx
      <ScenarioCards scenarios={scenarios} today={today} />
      <SnapshotsTable snapshots={snapshots} scenarios={scenarios} />
      <ScenarioManager scenarios={scenarios} />
```

- [ ] **Step 4: Verificar en el navegador**

Run: `npx tsc --noEmit -p .` → sin errores.

En http://localhost:3000:
1. Tabla muestra 6 cortes (MAR 24 … SEP 26) con totales 41,079 … 141,271 y columnas "VS 10%", "VS 15%", "VS MELI 18k + bono"; MAR 24 y SEP 24 muestran "—" para todos (antes del primer objetivo).
2. ✎ en SEP 26 → cambiar BONOS a 100 → GUARDAR → total pasa a 141,371. Volver a poner 0.
3. + CORTE con fecha 2026-04-01 → GUARDAR → aparece el error "La fecha tiene que ser 1/3 o 1/9…". CANCELAR.
4. EDITAR escenarios → destildar "15%" → desaparece del gráfico, de las tarjetas y de la tabla. Volver a tildar.
5. ✎ en "10%" → TASA % ANUAL = 12 → GUARDAR → curva se recalcula; volver a 10.
6. Ocultar montos (toggle del nav) → los montos de HOME se blurean.
7. Vista mobile (DevTools 390px): sin scroll horizontal de página; la tabla scrollea dentro de su panel.

- [ ] **Step 5: Checkpoint (sin commit)**

---

### Task 8: Verificación final

**Files:** ninguno nuevo.

- [ ] **Step 1: Tests y tipos**

Run: `npm test && npx tsc --noEmit -p .`
Expected: todos los tests en verde, sin errores de tipos.

- [ ] **Step 2: Build de producción**

Run: `npx next build 2>&1 | tail -40`
Expected: build OK; rutas incluyen `ƒ /`, `ƒ /bolsa`, `ƒ /api/wealth/snapshot`, `ƒ /api/wealth/snapshots`, `ƒ /api/wealth/scenarios`.

- [ ] **Step 3: Actualizar CLAUDE.md**

En `CLAUDE.md`, sección "Key Files", agregar:

```markdown
- `src/lib/goals.ts` — Proyección de escenarios de objetivos (pura, testeada con `npm test`)
- `src/lib/wealth-data.ts` — Patrimonio total (CEDEARs + crypto + cash + bonos del último corte)
- `src/app/page.tsx` — HOME (patrimonio + objetivos); la página de acciones vive en `src/app/bolsa/page.tsx`
```

Y una sección nueva:

```markdown
## Patrimonio y Objetivos
- Tablas `wealth_snapshots` (cortes 1/3 y 1/9, auto vía cron `/api/wealth/snapshot` o manuales) y `goal_scenarios` (parámetros)
- Fórmula anual: `valor × (1 + tasa) + aporte + bono[año] × factorBono`; el año X se mide el 1/3 de X+1
- Bonos no se trackean en la app: se cargan a mano en los cortes
```

- [ ] **Step 4: Preguntar al usuario**

Mostrar resumen y preguntar si commitear / pushear / deployar (no hacerlo sin confirmación).
