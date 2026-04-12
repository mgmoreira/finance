# Portfolio Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal CEDEAR investment portfolio web app that replaces a Google Sheets spreadsheet, with real-time prices, balance tracking, and operation management.

**Architecture:** Next.js 15 App Router with Server Components for data fetching, Turso/SQLite for persistence via Drizzle ORM, and client components only for interactive elements (tables, modals). External APIs (data912, Yahoo Finance) feed a price_cache table that decouples live prices from page renders.

**Tech Stack:** Next.js 15, TypeScript, Turso, Drizzle ORM, Tailwind CSS v4, data912 API, Yahoo Finance API

**Spec:** `docs/superpowers/specs/2026-04-12-portfolio-tracker-design.md`

---

## File Structure

```
finance/
├── src/
│   ├── app/
│   │   ├── layout.tsx              — Root layout, fonts, global styles
│   │   ├── page.tsx                — Main dashboard (server component)
│   │   ├── api/
│   │   │   ├── refresh-prices/
│   │   │   │   └── route.ts        — GET: refresh price_cache from APIs
│   │   │   └── transactions/
│   │   │       └── route.ts        — POST: create transaction, DELETE: remove
│   │   └── globals.css             — Tailwind imports
│   ├── db/
│   │   ├── schema.ts               — Drizzle table definitions
│   │   ├── index.ts                — Turso client + Drizzle instance
│   │   └── seed.ts                 — Seed script with all historical data
│   ├── lib/
│   │   ├── data912.ts              — data912 API client
│   │   ├── yahoo.ts                — Yahoo Finance API client
│   │   ├── calculations.ts         — Portfolio calculation functions
│   │   └── format.ts               — Number/currency formatting helpers
│   └── components/
│       ├── dashboard-header.tsx     — Balance, gains, monthly stats (server)
│       ├── positions-table.tsx      — Main positions table (client, interactive)
│       ├── species-detail.tsx       — Expandable row detail panel
│       ├── summary-cards.tsx        — Country/sector breakdown (server)
│       ├── investments-by-date.tsx  — Investment timeline table (server)
│       ├── operations-history.tsx   — Transaction history (client, interactive)
│       ├── new-operation-modal.tsx  — Modal form for new buy/sell
│       └── refresh-button.tsx       — Manual price refresh + stale check
├── drizzle.config.ts               — Drizzle Kit configuration
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── .env.local                      — TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `.env.local`, `.gitignore`

- [ ] **Step 1: Create Next.js project**

```bash
cd /Users/martinmoreira/Proyectos/finance
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```

This will scaffold into the current directory. Say yes to overwrite if prompted.

- [ ] **Step 2: Install dependencies**

```bash
npm install @libsql/client drizzle-orm yahoo-finance2
npm install -D drizzle-kit
```

- [ ] **Step 3: Create `.env.local`**

```env
TURSO_DATABASE_URL=libsql://your-db-name-your-username.turso.io
TURSO_AUTH_TOKEN=your-token-here
```

Leave placeholders for now — we'll fill in after Turso setup.

- [ ] **Step 4: Create `drizzle.config.ts`**

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
});
```

- [ ] **Step 5: Update `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Portfolio Tracker",
  description: "CEDEAR investment portfolio tracker",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Set `src/app/page.tsx` to a placeholder**

```tsx
export default function Home() {
  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold">Portfolio Tracker</h1>
      <p className="text-gray-400">Loading...</p>
    </main>
  );
}
```

- [ ] **Step 7: Verify it runs**

```bash
npm run dev
```

Open http://localhost:3000 — should show "Portfolio Tracker" on a dark background.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Tailwind and Drizzle deps"
```

---

### Task 2: Database Schema

**Files:**
- Create: `src/db/schema.ts`, `src/db/index.ts`

- [ ] **Step 1: Create `src/db/schema.ts`**

```typescript
import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticker: text("ticker").notNull(),
  type: text("type", { enum: ["BUY", "SELL"] }).notNull(),
  quantity: integer("quantity").notNull(),
  priceArs: real("price_ars").notNull(),
  priceUsd: real("price_usd").notNull(),
  currency: text("currency", { enum: ["ARS", "USD"] }).notNull(),
  totalArs: real("total_ars").notNull(),
  totalUsd: real("total_usd").notNull(),
  exchangeRate: real("exchange_rate").notNull(),
  date: text("date").notNull(), // ISO format YYYY-MM-DD
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const species = sqliteTable("species", {
  ticker: text("ticker").primaryKey(),
  name: text("name").notNull(),
  sector: text("sector").notNull(), // TECNOLOGIA, ENERGIA, E-COMMERCE, SALUD, CONSUMO, AGRO, MINERIA, ETF
  country: text("country").notNull(), // EEUU, ARG, BRASIL, CHINA, EUROPA, ASIA, LATINO
  parity: real("parity").notNull().default(1),
  dividendYield: real("dividend_yield").default(0),
});

export const priceCache = sqliteTable("price_cache", {
  ticker: text("ticker").primaryKey(),
  priceUsd: real("price_usd"),
  priceArs: real("price_ars"),
  parity: real("parity"),
  exchangeRateMep: real("exchange_rate_mep"),
  ath: real("ath"),
  monthStartPrice: real("month_start_price"),
  sp500MonthStart: real("sp500_month_start"),
  updatedAt: text("updated_at"),
});

export const monthlySnapshots = sqliteTable("monthly_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  yearMonth: text("year_month").notNull().unique(),
  portfolioValueUsd: real("portfolio_value_usd").notNull(),
  depositsUsd: real("deposits_usd").notNull(),
  gainUsd: real("gain_usd").notNull(),
  gainPct: real("gain_pct").notNull(),
  sp500Value: real("sp500_value"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
```

- [ ] **Step 2: Create `src/db/index.ts`**

```typescript
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const db = drizzle(client, { schema });
```

- [ ] **Step 3: Set up Turso database**

```bash
# Install Turso CLI if not installed
brew install tursodatabase/tap/turso

# Login (opens browser for GitHub auth)
turso auth signup
# or if already have account:
turso auth login

# Create database
turso db create finance-portfolio

# Get credentials
turso db show finance-portfolio --url
turso db tokens create finance-portfolio
```

Copy the URL and token into `.env.local`.

- [ ] **Step 4: Generate and push migration**

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

- [ ] **Step 5: Verify tables exist**

```bash
turso db shell finance-portfolio "SELECT name FROM sqlite_master WHERE type='table';"
```

Expected: `transactions`, `species`, `price_cache`, `monthly_snapshots`

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts src/db/index.ts drizzle.config.ts drizzle/
git commit -m "feat: add database schema with Drizzle ORM + Turso"
```

---

### Task 3: Seed Data

**Files:**
- Create: `src/db/seed.ts`

- [ ] **Step 1: Create `src/db/seed.ts`**

This file contains all ~100 historical transactions, 29 species, and 9 monthly snapshots from the spreadsheet.

```typescript
import { db } from "./index";
import { transactions, species, monthlySnapshots } from "./schema";

const seedSpecies = [
  { ticker: "YPF", name: "YPF S.A.", sector: "ENERGIA", country: "ARG", parity: 1, dividendYield: 0 },
  { ticker: "EWZ", name: "iShares MSCI Brazil ETF", sector: "ETF", country: "BRASIL", parity: 1, dividendYield: 0 },
  { ticker: "PBR", name: "Petrobras", sector: "ENERGIA", country: "BRASIL", parity: 1, dividendYield: 0 },
  { ticker: "INTC", name: "Intel Corp", sector: "TECNOLOGIA", country: "EEUU", parity: 15, dividendYield: 0 },
  { ticker: "MUX", name: "McEwen Mining", sector: "MINERIA", country: "EEUU", parity: 1, dividendYield: 0 },
  { ticker: "TGS", name: "Transportadora de Gas del Sur", sector: "ENERGIA", country: "ARG", parity: 5, dividendYield: 0 },
  { ticker: "CRESY", name: "Cresud", sector: "AGRO", country: "ARG", parity: 10, dividendYield: 0 },
  { ticker: "TSLA", name: "Tesla Inc", sector: "TECNOLOGIA", country: "EEUU", parity: 15, dividendYield: 0 },
  { ticker: "AMZN", name: "Amazon.com", sector: "E-COMMERCE", country: "EEUU", parity: 144, dividendYield: 0 },
  { ticker: "NKE", name: "Nike Inc", sector: "CONSUMO", country: "EEUU", parity: 3, dividendYield: 2.14 },
  { ticker: "LLY", name: "Eli Lilly", sector: "SALUD", country: "EEUU", parity: 2, dividendYield: 0.79 },
  { ticker: "GPRK", name: "GeoPark Ltd", sector: "ENERGIA", country: "LATINO", parity: 5, dividendYield: 9.2 },
  { ticker: "UNH", name: "UnitedHealth Group", sector: "SALUD", country: "EEUU", parity: 2, dividendYield: 3.72 },
  { ticker: "PEP", name: "PepsiCo Inc", sector: "CONSUMO", country: "EEUU", parity: 5, dividendYield: 4.09 },
  { ticker: "JD", name: "JD.com", sector: "E-COMMERCE", country: "CHINA", parity: 3, dividendYield: 3.17 },
  { ticker: "BABA", name: "Alibaba Group", sector: "E-COMMERCE", country: "CHINA", parity: 12, dividendYield: 0.8 },
  { ticker: "PFE", name: "Pfizer Inc", sector: "SALUD", country: "EEUU", parity: 5, dividendYield: 7.32 },
  { ticker: "FXI", name: "iShares China Large-Cap ETF", sector: "ETF", country: "CHINA", parity: 1, dividendYield: 2.61 },
  { ticker: "GGB", name: "Gerdau S.A.", sector: "MINERIA", country: "BRASIL", parity: 1, dividendYield: 0 },
  { ticker: "BG", name: "Bunge Global", sector: "AGRO", country: "EUROPA", parity: 2, dividendYield: 3.59 },
  { ticker: "ASML", name: "ASML Holding", sector: "TECNOLOGIA", country: "EUROPA", parity: 4, dividendYield: 0.84 },
  { ticker: "TSM", name: "Taiwan Semiconductor", sector: "TECNOLOGIA", country: "ASIA", parity: 1, dividendYield: 0.88 },
  { ticker: "VIST", name: "Vista Energy", sector: "ENERGIA", country: "ARG", parity: 3, dividendYield: 0 },
  { ticker: "PAGS", name: "PagSeguro Digital", sector: "E-COMMERCE", country: "BRASIL", parity: 1, dividendYield: 0 },
  { ticker: "VALE", name: "Vale S.A.", sector: "MINERIA", country: "BRASIL", parity: 1, dividendYield: 0 },
  { ticker: "MELI", name: "MercadoLibre", sector: "E-COMMERCE", country: "ARG", parity: 120, dividendYield: 0 },
  { ticker: "PG", name: "Procter & Gamble", sector: "CONSUMO", country: "EEUU", parity: 5, dividendYield: 2.89 },
  { ticker: "MSFT", name: "Microsoft Corp", sector: "TECNOLOGIA", country: "EEUU", parity: 10, dividendYield: 0 },
];

// All historical transactions from spreadsheet
// Format: [ticker, type, quantity, priceArs, currency, exchangeRate, date]
// priceUsd, totalArs, totalUsd are calculated
const seedTransactionsRaw: [string, "BUY"|"SELL", number, number, "ARS"|"USD", number, string][] = [
  ["YPF", "BUY", 11, 8980, "ARS", 671, "2023-08-30"],
  ["YPF", "BUY", 23, 16960, "ARS", 961, "2023-12-18"],
  ["EWZ", "BUY", 5, 21002, "ARS", 1216, "2024-01-02"],
  ["EWZ", "BUY", 12, 20445, "ARS", 1170, "2024-01-06"],
  ["YPF", "BUY", 14, 18479, "ARS", 1204, "2024-01-16"],
  ["PBR", "BUY", 13, 19697, "ARS", 1204, "2024-01-16"],
  ["YPF", "BUY", 6, 22617, "ARS", 1227, "2024-02-02"],
  ["PBR", "BUY", 6, 22166, "ARS", 1227, "2024-02-02"],
  ["EWZ", "BUY", 8, 16717, "ARS", 1008, "2024-03-06"],
  ["PBR", "BUY", 7, 17070, "ARS", 998, "2024-03-06"],
  ["YPF", "BUY", 7, 18786, "ARS", 997, "2024-03-06"],
  ["PBR", "BUY", 26, 15696, "ARS", 1032, "2024-03-18"],
  ["YPF", "BUY", 13, 22071, "ARS", 1028, "2024-03-21"],
  ["PBR", "BUY", 8, 16283, "ARS", 1028, "2024-03-21"],
  ["PBR", "BUY", 3, 17882, "ARS", 1254, "2024-06-13"],
  ["INTC", "BUY", 71, 4900, "ARS", 1155, "2025-05-08"],
  ["MUX", "BUY", 93, 4300, "ARS", 1155, "2025-05-08"],
  ["TGS", "BUY", 64, 6200, "ARS", 1155, "2025-05-08"],
  ["PBR", "BUY", 25, 13525, "ARS", 1155, "2025-05-08"],
  ["YPF", "BUY", 41, 35755, "ARS", 1155, "2025-05-08"],
  ["CRESY", "BUY", 273, 1280, "ARS", 1155, "2025-05-08"],
  ["TSLA", "BUY", 13, 23100, "ARS", 1155, "2025-05-08"],
  ["AMZN", "BUY", 261, 1530, "ARS", 1155, "2025-05-09"],
  ["INTC", "BUY", 98, 5060, "ARS", 1155, "2025-05-16"],
  ["MUX", "BUY", 95, 4180, "ARS", 1155, "2025-05-16"],
  ["TGS", "BUY", 41, 7200, "ARS", 1155, "2025-05-16"],
  ["PBR", "BUY", 28, 14194, "ARS", 1155, "2025-05-16"],
  ["CRESY", "BUY", 224, 1335, "ARS", 1155, "2025-05-16"],
  ["TSLA", "BUY", 6, 27125, "ARS", 1155, "2025-05-16"],
  ["NKE", "BUY", 111, 6237, "ARS", 1155, "2025-05-16"],
  ["EWZ", "BUY", 17, 16500, "ARS", 1155, "2025-05-16"],
  ["LLY", "BUY", 37, 15825, "ARS", 1155, "2025-05-16"],
  ["INTC", "BUY", 119, 4819, "ARS", 1185, "2025-06-04"],
  ["MUX", "BUY", 106, 5406, "ARS", 1185, "2025-06-04"],
  ["TGS", "BUY", 84, 6794, "ARS", 1185, "2025-06-04"],
  ["PBR", "BUY", 41, 13725, "ARS", 1185, "2025-06-04"],
  ["AMZN", "BUY", 336, 1710, "ARS", 1185, "2025-06-04"],
  ["TSLA", "BUY", 21, 26350, "ARS", 1185, "2025-06-04"],
  ["NKE", "BUY", 91, 6260, "ARS", 1185, "2025-06-04"],
  ["YPF", "BUY", 13, 42300, "ARS", 1185, "2025-06-04"],
  ["LLY", "BUY", 30, 16367, "ARS", 1192, "2025-06-24"],
  ["GPRK", "BUY", 96, 8296, "ARS", 1192, "2025-06-24"],
  ["UNH", "BUY", 91, 10900, "ARS", 1192, "2025-06-24"],
  ["PEP", "BUY", 116, 8610, "ARS", 1192, "2025-06-24"],
  ["NKE", "BUY", 49, 6040, "ARS", 1192, "2025-06-24"],
  ["PEP", "BUY", 57, 8600, "ARS", 1192, "2025-06-24"],
  ["JD", "BUY", 82, 9640, "ARS", 1192, "2025-06-24"],
  ["BABA", "BUY", 51, 15400, "ARS", 1192, "2025-06-24"],
  ["BABA", "BUY", 65, 15275, "ARS", 1207, "2025-07-01"],
  ["PEP", "BUY", 54, 9170, "ARS", 1207, "2025-07-01"],
  ["INTC", "BUY", 90, 5510, "ARS", 1207, "2025-07-01"],
  ["EWZ", "BUY", 57, 17400, "ARS", 1207, "2025-07-01"],
  ["PFE", "BUY", 131, 7608, "ARS", 1207, "2025-07-01"],
  ["NKE", "BUY", 33, 7380, "ARS", 1207, "2025-07-01"],
  ["PBR", "BUY", 32, 15175, "ARS", 1207, "2025-07-01"],
  ["FXI", "BUY", 77, 8940, "ARS", 1207, "2025-07-01"],
  ["GGB", "BUY", 91, 15150, "ARS", 1269, "2025-07-14"],
  ["BG", "BUY", 50, 21325, "ARS", 1364, "2025-08-01"],
  ["FXI", "BUY", 80, 10075, "ARS", 1364, "2025-08-01"],
  ["AMZN", "BUY", 530, 2046, "ARS", 1364, "2025-08-01"],
  ["TSLA", "BUY", 38, 27757, "ARS", 1364, "2025-08-01"],
  ["BABA", "BUY", 22, 17800, "ARS", 1364, "2025-08-01"],
  ["GGB", "BUY", 34, 15780, "ARS", 1364, "2025-08-01"],
  ["MUX", "BUY", 58, 6890, "ARS", 1364, "2025-08-01"],
  ["PFE", "BUY", 60, 8050, "ARS", 1364, "2025-08-01"],
  ["NKE", "BUY", 58, 8486, "ARS", 1364, "2025-08-01"],
  ["PEP", "BUY", 39, 10625, "ARS", 1364, "2025-08-01"],
  ["INTC", "BUY", 77, 5280, "ARS", 1364, "2025-08-01"],
  ["BG", "BUY", 61, 20850, "ARS", 1300, "2025-08-19"],
  ["GPRK", "BUY", 157, 8164, "ARS", 1300, "2025-08-19"],
  ["ASML", "BUY", 232, 6669, "ARS", 1300, "2025-08-19"],
  ["UNH", "BUY", 107, 12051, "ARS", 1300, "2025-08-19"],
  ["TSM", "BUY", 30, 34333, "ARS", 1300, "2025-08-19"],
  ["UNH", "BUY", 125, 12875, "ARS", 1350, "2025-09-04"],
  ["ASML", "BUY", 215, 6822, "ARS", 1350, "2025-09-04"],
  ["TSM", "BUY", 38, 36000, "ARS", 1350, "2025-09-04"],
  ["AMZN", "BUY", 276, 2155, "ARS", 1350, "2025-09-04"],
  ["INTC", "BUY", 111, 6620, "ARS", 1350, "2025-09-04"],
  ["JD", "BUY", 85, 10950, "ARS", 1350, "2025-09-04"],
  ["MUX", "BUY", 82, 9756, "ARS", 1350, "2025-09-04"],
  ["YPF", "BUY", 39, 39246, "ARS", 1520, "2025-09-19"],
  ["VIST", "BUY", 86, 17312, "ARS", 1520, "2025-09-19"],
  ["TSLA", "BUY", 32, 45700, "ARS", 1500, "2025-10-02"],
  ["VIST", "BUY", 80, 17820, "ARS", 1500, "2025-10-02"],
  ["PAGS", "BUY", 238, 4985, "ARS", 1500, "2025-10-02"],
  ["VALE", "BUY", 108, 8705, "ARS", 1500, "2025-10-02"],
  ["VIST", "BUY", 78, 17340, "ARS", 1450, "2025-10-14"],
  ["MELI", "BUY", 57, 25300, "ARS", 1460, "2025-10-16"],
  ["MELI", "BUY", 21, 25670, "ARS", 1460, "2025-10-16"],
  ["PAGS", "BUY", 223, 4720, "ARS", 1460, "2025-11-04"],
  ["BABA", "BUY", 45, 27780, "ARS", 1490, "2025-11-04"],
  ["JD", "BUY", 104, 12150, "ARS", 1490, "2025-11-04"],
  ["GGB", "BUY", 34, 20890, "ARS", 1490, "2025-11-04"],
  ["VALE", "BUY", 57, 9005, "ARS", 1490, "2025-11-04"],
  ["MUX", "SELL", 352, 13746, "ARS", 1490, "2025-11-04"],
  ["MUX", "SELL", 82, 13850, "ARS", 1490, "2025-11-04"],
  ["PAGS", "BUY", 197, 4890, "ARS", 1500, "2025-12-22"],
  ["VALE", "BUY", 71, 10360, "ARS", 1500, "2025-12-22"],
  ["JD", "BUY", 52, 11430, "ARS", 1500, "2025-12-22"],
  ["PG", "BUY", 90, 14810, "ARS", 1500, "2025-12-22"],
  ["MELI", "BUY", 81, 25560, "ARS", 1500, "2025-12-22"],
  ["MSFT", "BUY", 62, 19300, "ARS", 1430, "2026-02-19"],
  ["MELI", "BUY", 71, 23110, "ARS", 1430, "2026-02-24"],
  ["MELI", "BUY", 76, 21710, "ARS", 1430, "2026-02-25"],
  ["MSFT", "BUY", 77, 19905, "ARS", 1450, "2026-03-02"],
];

// Monthly snapshots: months from May 2025 to Jan 2026
const seedSnapshots = [
  { yearMonth: "2025-05", portfolioValueUsd: 19189, depositsUsd: 6584, gainUsd: -194, gainPct: -1.01, sp500Value: null },
  { yearMonth: "2025-06", portfolioValueUsd: 26598, depositsUsd: 8553, gainUsd: 1094, gainPct: 5.77, sp500Value: null },
  { yearMonth: "2025-07", portfolioValueUsd: 40118, depositsUsd: 5552, gainUsd: 3520, gainPct: 9.27, sp500Value: null },
  { yearMonth: "2025-08", portfolioValueUsd: 53279, depositsUsd: 10167, gainUsd: 4724, gainPct: 11.78, sp500Value: null },
  { yearMonth: "2025-09", portfolioValueUsd: 58955, depositsUsd: 7546, gainUsd: 38, gainPct: 0.07, sp500Value: null },
  { yearMonth: "2025-10", portfolioValueUsd: 60765, depositsUsd: 3342, gainUsd: -1392, gainPct: -2.29, sp500Value: null },
  { yearMonth: "2025-11", portfolioValueUsd: 71625, depositsUsd: 2891, gainUsd: 6641, gainPct: 10.94, sp500Value: null },
  { yearMonth: "2025-12", portfolioValueUsd: 72672, depositsUsd: 3797, gainUsd: 1047, gainPct: 1.46, sp500Value: null },
  { yearMonth: "2026-01", portfolioValueUsd: 72553, depositsUsd: 0, gainUsd: -119, gainPct: -0.16, sp500Value: null },
];

async function seed() {
  console.log("Seeding species...");
  for (const s of seedSpecies) {
    await db.insert(species).values(s).onConflictDoNothing();
  }

  console.log("Seeding transactions...");
  for (const [ticker, type, quantity, priceArs, currency, exchangeRate, date] of seedTransactionsRaw) {
    const priceUsd = priceArs / exchangeRate;
    const totalArs = quantity * priceArs;
    const totalUsd = quantity * priceUsd;
    await db.insert(transactions).values({
      ticker,
      type,
      quantity,
      priceArs,
      priceUsd,
      currency,
      totalArs,
      totalUsd,
      exchangeRate,
      date,
    });
  }

  console.log("Seeding monthly snapshots...");
  for (const snap of seedSnapshots) {
    await db.insert(monthlySnapshots).values(snap).onConflictDoNothing();
  }

  console.log("Seed complete!");
}

seed().catch(console.error);
```

- [ ] **Step 2: Add seed script to `package.json`**

Add to `"scripts"` in `package.json`:

```json
"seed": "npx tsx src/db/seed.ts"
```

- [ ] **Step 3: Install tsx and run seed**

```bash
npm install -D tsx
npm run seed
```

Expected: "Seed complete!" with no errors.

- [ ] **Step 4: Verify seeded data**

```bash
turso db shell finance-portfolio "SELECT COUNT(*) FROM transactions;"
turso db shell finance-portfolio "SELECT COUNT(*) FROM species;"
turso db shell finance-portfolio "SELECT COUNT(*) FROM monthly_snapshots;"
```

Expected: ~103 transactions, 29 species, 9 snapshots.

- [ ] **Step 5: Commit**

```bash
git add src/db/seed.ts package.json
git commit -m "feat: add seed data with all historical transactions and species"
```

---

### Task 4: External API Clients

**Files:**
- Create: `src/lib/data912.ts`, `src/lib/yahoo.ts`

- [ ] **Step 1: Create `src/lib/data912.ts`**

```typescript
const BASE_URL = "https://data912.com";

export interface CedearLive {
  ticker: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  ratio: number; // parity
}

export interface MepLive {
  bid: number;
  ask: number;
  last: number;
}

export interface HistoricalOHLC {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function fetchCedears(): Promise<CedearLive[]> {
  const res = await fetch(`${BASE_URL}/live/arg_cedears`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`data912 cedears failed: ${res.status}`);
  return res.json();
}

export async function fetchMep(): Promise<MepLive> {
  const res = await fetch(`${BASE_URL}/live/mep`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`data912 mep failed: ${res.status}`);
  return res.json();
}

export async function fetchCedearHistory(ticker: string): Promise<HistoricalOHLC[]> {
  const res = await fetch(`${BASE_URL}/historical/cedears/${ticker}`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`data912 history failed for ${ticker}: ${res.status}`);
  return res.json();
}
```

- [ ] **Step 2: Create `src/lib/yahoo.ts`**

Uses the free `query1.finance.yahoo.com` endpoint (no API key needed).

```typescript
export interface YahooQuote {
  symbol: string;
  regularMarketPrice: number;
  fiftyTwoWeekHigh: number;
  trailingAnnualDividendYield: number | null;
}

// Uses yahoo-finance2 npm package (more reliable than raw API)
// Install: npm install yahoo-finance2

export async function fetchQuotes(tickers: string[]): Promise<Map<string, YahooQuote>> {
  const yahooFinance = (await import("yahoo-finance2")).default;
  const quotes = new Map<string, YahooQuote>();

  // Fetch in batches to avoid rate limits
  const results = await yahooFinance.quote(tickers);
  const resultArray = Array.isArray(results) ? results : [results];

  for (const q of resultArray) {
    if (!q.symbol) continue;
    quotes.set(q.symbol, {
      symbol: q.symbol,
      regularMarketPrice: q.regularMarketPrice ?? 0,
      fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? 0,
      trailingAnnualDividendYield: q.trailingAnnualDividendYield ?? null,
    });
  }

  return quotes;
}

export async function fetchSP500Price(): Promise<number> {
  const quotes = await fetchQuotes(["SPY"]);
  return quotes.get("SPY")?.regularMarketPrice ?? 0;
}
```

- [ ] **Step 3: Test API clients manually**

Create a quick test script `src/lib/test-apis.ts`:

```typescript
import { fetchCedears, fetchMep } from "./data912";
import { fetchQuotes, fetchSP500Price } from "./yahoo";

async function test() {
  console.log("Testing data912 MEP...");
  const mep = await fetchMep();
  console.log("MEP:", mep);

  console.log("\nTesting data912 CEDEARs (first 3)...");
  const cedears = await fetchCedears();
  console.log(cedears.slice(0, 3));

  console.log("\nTesting Yahoo Finance...");
  const quotes = await fetchQuotes(["YPF", "TSLA", "MELI"]);
  console.log(Object.fromEntries(quotes));

  console.log("\nTesting S&P500...");
  const sp500 = await fetchSP500Price();
  console.log("SPY:", sp500);
}

test().catch(console.error);
```

```bash
npx tsx src/lib/test-apis.ts
```

Expected: MEP rate, CEDEAR prices, Yahoo quotes, and SPY price logged. If Yahoo v7 endpoint fails (it sometimes does), we'll fall back to `v8/finance/chart` in a later step.

- [ ] **Step 4: Delete test script and commit**

```bash
rm src/lib/test-apis.ts
git add src/lib/data912.ts src/lib/yahoo.ts
git commit -m "feat: add data912 and Yahoo Finance API clients"
```

---

### Task 5: Price Refresh API Route

**Files:**
- Create: `src/app/api/refresh-prices/route.ts`

- [ ] **Step 1: Create `src/app/api/refresh-prices/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { priceCache, species } from "@/db/schema";
import { fetchCedears, fetchMep } from "@/lib/data912";
import { fetchQuotes } from "@/lib/yahoo";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    // 1. Get all species tickers
    const allSpecies = await db.select().from(species);
    const tickers = allSpecies.map((s) => s.ticker);

    // 2. Fetch data from APIs in parallel
    const [cedears, mep, yahooQuotes] = await Promise.all([
      fetchCedears().catch(() => []),
      fetchMep().catch(() => ({ last: 0 })),
      fetchQuotes(tickers).catch(() => new Map()),
    ]);

    // Build CEDEAR lookup by ticker
    const cedearMap = new Map<string, { last: number; ratio: number }>();
    for (const c of cedears) {
      cedearMap.set(c.ticker, { last: c.last, ratio: c.ratio });
    }

    const now = new Date().toISOString();
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    // 3. Update price_cache for each ticker
    for (const ticker of tickers) {
      const yahoo = yahooQuotes.get(ticker);
      const cedear = cedearMap.get(ticker);

      const priceUsd = yahoo?.regularMarketPrice ?? 0;
      const priceArs = cedear?.last ?? 0;
      const parity = cedear?.ratio ?? 1;

      // Get existing cache to preserve month_start_price
      const existing = await db.select().from(priceCache).where(eq(priceCache.ticker, ticker)).get();

      // month_start_price: keep existing if same month, otherwise set to current
      let monthStartPrice = existing?.monthStartPrice ?? priceUsd;
      const existingMonth = existing?.updatedAt?.slice(0, 7);
      if (existingMonth && existingMonth !== currentMonth) {
        // New month — set month start price to current
        monthStartPrice = priceUsd;
      }

      await db
        .insert(priceCache)
        .values({
          ticker,
          priceUsd,
          priceArs,
          parity,
          exchangeRateMep: mep.last,
          ath: yahoo?.fiftyTwoWeekHigh ?? existing?.ath ?? 0,
          monthStartPrice,
          sp500MonthStart: existing?.sp500MonthStart ?? 0,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: priceCache.ticker,
          set: {
            priceUsd,
            priceArs,
            parity,
            exchangeRateMep: mep.last,
            ath: yahoo?.fiftyTwoWeekHigh ?? existing?.ath ?? 0,
            monthStartPrice,
            updatedAt: now,
          },
        });
    }

    // 4. Update SPY month start separately
    const spyQuote = await fetchQuotes(["SPY"]).catch(() => new Map());
    const spyPrice = spyQuote.get("SPY")?.regularMarketPrice ?? 0;
    const existingSpy = await db.select().from(priceCache).where(eq(priceCache.ticker, "__SPY__")).get();
    const spyMonthStart = existingSpy?.updatedAt?.slice(0, 7) !== currentMonth
      ? spyPrice
      : existingSpy?.monthStartPrice ?? spyPrice;

    await db
      .insert(priceCache)
      .values({
        ticker: "__SPY__",
        priceUsd: spyPrice,
        priceArs: 0,
        parity: 1,
        exchangeRateMep: mep.last,
        ath: 0,
        monthStartPrice: spyMonthStart,
        sp500MonthStart: spyMonthStart,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: priceCache.ticker,
        set: {
          priceUsd: spyPrice,
          monthStartPrice: spyMonthStart,
          sp500MonthStart: spyMonthStart,
          updatedAt: now,
        },
      });

    return NextResponse.json({ ok: true, updated: tickers.length, timestamp: now });
  } catch (error) {
    console.error("Price refresh failed:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
```

- [ ] **Step 2: Test the endpoint**

```bash
npm run dev &
curl http://localhost:3000/api/refresh-prices | jq .
```

Expected: `{ "ok": true, "updated": 29, "timestamp": "..." }`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/refresh-prices/route.ts
git commit -m "feat: add price refresh API route with data912 + Yahoo"
```

---

### Task 6: Portfolio Calculations

**Files:**
- Create: `src/lib/calculations.ts`, `src/lib/format.ts`

- [ ] **Step 1: Create `src/lib/calculations.ts`**

```typescript
import { db } from "@/db";
import { transactions, priceCache, species, monthlySnapshots } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";

export interface Position {
  ticker: string;
  name: string;
  sector: string;
  country: string;
  quantity: number;
  avgPriceUsd: number;
  currentPriceUsd: number;
  invested: number;
  currentValue: number;
  pnl: number;
  pnlPct: number;
  portfolioPct: number;
  // Species detail
  ath: number;
  athDistance: number;
  dividendYield: number;
  monthStartPrice: number;
  monthChangePct: number;
  parity: number;
  priceArs: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalInvested: number;
  totalGain: number;
  totalGainPct: number;
  sp500Price: number;
  sp500MonthStart: number;
  sp500MonthChangePct: number;
  positions: Position[];
  byCountry: { country: string; value: number; pct: number }[];
  bySector: { sector: string; value: number; pct: number }[];
  monthlyStats: { yearMonth: string; gainPct: number; gainUsd: number; portfolioValue: number }[];
  mepRate: number;
  lastUpdated: string | null;
}

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  // 1. Get all transactions
  const allTxns = await db.select().from(transactions);

  // 2. Get all species
  const allSpecies = await db.select().from(species);
  const speciesMap = new Map(allSpecies.map((s) => [s.ticker, s]));

  // 3. Get price cache
  const allPrices = await db.select().from(priceCache);
  const priceMap = new Map(allPrices.map((p) => [p.ticker, p]));

  // 4. Get monthly snapshots
  const snapshots = await db.select().from(monthlySnapshots).orderBy(monthlySnapshots.yearMonth);

  // 5. Calculate positions per ticker
  const tickerData = new Map<string, { buyQty: number; sellQty: number; buyTotalUsd: number; sellTotalUsd: number }>();

  for (const tx of allTxns) {
    if (!tickerData.has(tx.ticker)) {
      tickerData.set(tx.ticker, { buyQty: 0, sellQty: 0, buyTotalUsd: 0, sellTotalUsd: 0 });
    }
    const d = tickerData.get(tx.ticker)!;
    if (tx.type === "BUY") {
      d.buyQty += tx.quantity;
      d.buyTotalUsd += tx.totalUsd;
    } else {
      d.sellQty += tx.quantity;
      d.sellTotalUsd += tx.totalUsd;
    }
  }

  const positions: Position[] = [];
  let totalValue = 0;

  for (const [ticker, data] of tickerData) {
    const quantity = data.buyQty - data.sellQty;
    if (quantity <= 0) continue;

    const sp = speciesMap.get(ticker);
    const pc = priceMap.get(ticker);

    const avgPriceUsd = data.buyQty > 0 ? data.buyTotalUsd / data.buyQty : 0;
    const invested = data.buyTotalUsd - data.sellTotalUsd;
    const currentPriceUsd = pc?.priceUsd ?? 0;
    const currentValue = quantity * currentPriceUsd;

    totalValue += currentValue;

    positions.push({
      ticker,
      name: sp?.name ?? ticker,
      sector: sp?.sector ?? "N/A",
      country: sp?.country ?? "N/A",
      quantity,
      avgPriceUsd,
      currentPriceUsd,
      invested,
      currentValue,
      pnl: currentValue - invested,
      pnlPct: invested > 0 ? ((currentValue - invested) / invested) * 100 : 0,
      portfolioPct: 0, // calculated after totalValue is known
      ath: pc?.ath ?? 0,
      athDistance: pc?.ath && pc.ath > 0 ? ((pc.ath - currentPriceUsd) / pc.ath) * 100 : 0,
      dividendYield: sp?.dividendYield ?? 0,
      monthStartPrice: pc?.monthStartPrice ?? 0,
      monthChangePct: pc?.monthStartPrice && pc.monthStartPrice > 0
        ? ((currentPriceUsd - pc.monthStartPrice) / pc.monthStartPrice) * 100
        : 0,
      parity: pc?.parity ?? sp?.parity ?? 1,
      priceArs: pc?.priceArs ?? 0,
    });
  }

  // Calculate portfolio percentages
  for (const pos of positions) {
    pos.portfolioPct = totalValue > 0 ? (pos.currentValue / totalValue) * 100 : 0;
  }

  // Sort by portfolio percentage descending (default)
  positions.sort((a, b) => b.portfolioPct - a.portfolioPct);

  const totalInvested = positions.reduce((sum, p) => sum + p.invested, 0);
  const totalGain = totalValue - totalInvested;
  const totalGainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  // By country
  const countryMap = new Map<string, number>();
  for (const pos of positions) {
    countryMap.set(pos.country, (countryMap.get(pos.country) ?? 0) + pos.currentValue);
  }
  const byCountry = [...countryMap.entries()]
    .map(([country, value]) => ({ country, value, pct: totalValue > 0 ? (value / totalValue) * 100 : 0 }))
    .sort((a, b) => b.pct - a.pct);

  // By sector
  const sectorMap = new Map<string, number>();
  for (const pos of positions) {
    sectorMap.set(pos.sector, (sectorMap.get(pos.sector) ?? 0) + pos.currentValue);
  }
  const bySector = [...sectorMap.entries()]
    .map(([sector, value]) => ({ sector, value, pct: totalValue > 0 ? (value / totalValue) * 100 : 0 }))
    .sort((a, b) => b.pct - a.pct);

  // Monthly stats
  const monthlyStats = snapshots.map((s) => ({
    yearMonth: s.yearMonth,
    gainPct: s.gainPct,
    gainUsd: s.gainUsd,
    portfolioValue: s.portfolioValueUsd,
  }));

  // S&P500
  const spyCache = priceMap.get("__SPY__");
  const sp500Price = spyCache?.priceUsd ?? 0;
  const sp500MonthStart = spyCache?.sp500MonthStart ?? 0;
  const sp500MonthChangePct = sp500MonthStart > 0
    ? ((sp500Price - sp500MonthStart) / sp500MonthStart) * 100
    : 0;

  // MEP rate and last updated
  const anyPrice = allPrices.find((p) => p.ticker !== "__SPY__");
  const mepRate = anyPrice?.exchangeRateMep ?? 0;
  const lastUpdated = anyPrice?.updatedAt ?? null;

  return {
    totalValue,
    totalInvested,
    totalGain,
    totalGainPct,
    sp500Price,
    sp500MonthStart,
    sp500MonthChangePct,
    positions,
    byCountry,
    bySector,
    monthlyStats,
    mepRate,
    lastUpdated,
  };
}

export interface InvestmentByDate {
  date: string;
  totalUsd: number;
  accumulated: number;
  tickers: string[];
}

export async function getInvestmentsByDate(): Promise<{ byDate: InvestmentByDate[]; byMonth: { month: string; totalUsd: number }[] }> {
  const allTxns = await db
    .select()
    .from(transactions)
    .orderBy(transactions.date);

  const dateMap = new Map<string, { totalUsd: number; tickers: Set<string> }>();

  for (const tx of allTxns) {
    if (tx.type !== "BUY") continue;
    if (!dateMap.has(tx.date)) {
      dateMap.set(tx.date, { totalUsd: 0, tickers: new Set() });
    }
    const d = dateMap.get(tx.date)!;
    d.totalUsd += tx.totalUsd;
    d.tickers.add(tx.ticker);
  }

  let accumulated = 0;
  const byDate: InvestmentByDate[] = [];
  const monthMap = new Map<string, number>();

  for (const [date, data] of dateMap) {
    accumulated += data.totalUsd;
    byDate.push({
      date,
      totalUsd: data.totalUsd,
      accumulated,
      tickers: [...data.tickers],
    });

    const month = date.slice(0, 7);
    monthMap.set(month, (monthMap.get(month) ?? 0) + data.totalUsd);
  }

  const byMonth = [...monthMap.entries()]
    .map(([month, totalUsd]) => ({ month, totalUsd }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return { byDate, byMonth };
}

export interface TransactionRow {
  id: number;
  ticker: string;
  type: string;
  quantity: number;
  priceArs: number;
  priceUsd: number;
  totalUsd: number;
  exchangeRate: number;
  date: string;
  currency: string;
}

export async function getAllTransactions(): Promise<TransactionRow[]> {
  const rows = await db
    .select()
    .from(transactions)
    .orderBy(desc(transactions.date));

  return rows.map((r) => ({
    id: r.id,
    ticker: r.ticker,
    type: r.type,
    quantity: r.quantity,
    priceArs: r.priceArs,
    priceUsd: r.priceUsd,
    totalUsd: r.totalUsd,
    exchangeRate: r.exchangeRate,
    date: r.date,
    currency: r.currency,
  }));
}
```

- [ ] **Step 2: Create `src/lib/format.ts`**

```typescript
export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: value < 10 ? 2 : 0,
  }).format(value);
}

export function formatArs(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPct(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year.slice(2)}`;
}

export function formatMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${months[parseInt(month) - 1]}-${year.slice(2)}`;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/calculations.ts src/lib/format.ts
git commit -m "feat: add portfolio calculations and formatting utilities"
```

---

### Task 7: Transactions API Route

**Files:**
- Create: `src/app/api/transactions/route.ts`

- [ ] **Step 1: Create `src/app/api/transactions/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, species } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchMep } from "@/lib/data912";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticker, type, quantity, price, currency, date, exchangeRate: manualRate, newSpecies } = body;

    // Validate required fields
    if (!ticker || !type || !quantity || !price || !currency || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // If adding a new species
    if (newSpecies) {
      await db.insert(species).values({
        ticker,
        name: newSpecies.name || ticker,
        sector: newSpecies.sector || "N/A",
        country: newSpecies.country || "N/A",
        parity: newSpecies.parity || 1,
        dividendYield: newSpecies.dividendYield || 0,
      }).onConflictDoNothing();
    }

    // Get exchange rate: manual override or fetch from data912
    let exchangeRate = manualRate;
    if (!exchangeRate) {
      try {
        const mep = await fetchMep();
        exchangeRate = mep.last;
      } catch {
        return NextResponse.json({ error: "Could not fetch MEP rate. Please enter manually." }, { status: 400 });
      }
    }

    // Calculate prices
    let priceArs: number;
    let priceUsd: number;

    if (currency === "ARS") {
      priceArs = price;
      priceUsd = price / exchangeRate;
    } else {
      priceUsd = price;
      priceArs = price * exchangeRate;
    }

    const totalArs = quantity * priceArs;
    const totalUsd = quantity * priceUsd;

    // Insert transaction
    const result = await db.insert(transactions).values({
      ticker,
      type,
      quantity,
      priceArs,
      priceUsd,
      currency,
      totalArs,
      totalUsd,
      exchangeRate,
      date,
    }).returning();

    return NextResponse.json({ ok: true, transaction: result[0] });
  } catch (error) {
    console.error("Transaction creation failed:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await db.delete(transactions).where(eq(transactions.id, parseInt(id)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/transactions/route.ts
git commit -m "feat: add transactions CRUD API route"
```

---

### Task 8: Dashboard Header Component

**Files:**
- Create: `src/components/dashboard-header.tsx`

- [ ] **Step 1: Create `src/components/dashboard-header.tsx`**

```tsx
import { PortfolioSummary } from "@/lib/calculations";
import { formatUsd, formatPct, formatMonth } from "@/lib/format";

export function DashboardHeader({ summary }: { summary: PortfolioSummary }) {
  const gainColor = summary.totalGain >= 0 ? "text-green-400" : "text-red-400";

  return (
    <div className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800 px-4 py-3">
      {/* Balance row */}
      <div className="flex items-center gap-6 flex-wrap">
        <div>
          <span className="text-gray-400 text-sm">BALANCE</span>
          <p className="text-2xl font-bold">{formatUsd(summary.totalValue)}</p>
        </div>
        <div>
          <span className="text-gray-400 text-sm">GANANCIA</span>
          <p className={`text-xl font-semibold ${gainColor}`}>
            {formatUsd(summary.totalGain)} ({formatPct(summary.totalGainPct)})
          </p>
        </div>
        <div>
          <span className="text-gray-400 text-sm">vs S&P500 (mes)</span>
          <p className="text-lg">
            <span className={summary.sp500MonthChangePct >= 0 ? "text-green-400" : "text-red-400"}>
              SPY: {formatPct(summary.sp500MonthChangePct)}
            </span>
          </p>
        </div>
        {summary.mepRate > 0 && (
          <div>
            <span className="text-gray-400 text-sm">DOLAR MEP</span>
            <p className="text-lg">${summary.mepRate.toFixed(0)}</p>
          </div>
        )}
        {summary.lastUpdated && (
          <div className="ml-auto text-xs text-gray-500">
            Actualizado: {new Date(summary.lastUpdated).toLocaleTimeString("es-AR")}
          </div>
        )}
      </div>

      {/* Monthly stats row */}
      {summary.monthlyStats.length > 0 && (
        <div className="flex gap-2 mt-2 overflow-x-auto">
          {summary.monthlyStats.map((m) => (
            <div
              key={m.yearMonth}
              className={`text-xs px-2 py-1 rounded ${
                m.gainPct >= 0 ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
              }`}
            >
              {formatMonth(m.yearMonth)}: {formatPct(m.gainPct)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard-header.tsx
git commit -m "feat: add dashboard header with balance, gains, monthly stats"
```

---

### Task 9: Positions Table Component

**Files:**
- Create: `src/components/positions-table.tsx`, `src/components/species-detail.tsx`

- [ ] **Step 1: Create `src/components/species-detail.tsx`**

```tsx
import { Position } from "@/lib/calculations";
import { formatUsd, formatPct, formatNumber } from "@/lib/format";

export function SpeciesDetail({ position }: { position: Position }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-800/50 text-sm">
      <div>
        <span className="text-gray-400">ATH</span>
        <p>{formatUsd(position.ath)}</p>
      </div>
      <div>
        <span className="text-gray-400">Dist. ATH</span>
        <p className={position.athDistance > 0 ? "text-red-400" : "text-green-400"}>
          {position.athDistance > 0 ? "-" : "+"}{Math.abs(position.athDistance).toFixed(1)}%
        </p>
      </div>
      <div>
        <span className="text-gray-400">Dividendo</span>
        <p>{position.dividendYield > 0 ? `${position.dividendYield.toFixed(2)}%` : "—"}</p>
      </div>
      <div>
        <span className="text-gray-400">Var. mes</span>
        <p className={position.monthChangePct >= 0 ? "text-green-400" : "text-red-400"}>
          {formatUsd(position.monthStartPrice)} → {formatUsd(position.currentPriceUsd)} ({formatPct(position.monthChangePct)})
        </p>
      </div>
      <div>
        <span className="text-gray-400">Sector</span>
        <p>{position.sector}</p>
      </div>
      <div>
        <span className="text-gray-400">País</span>
        <p>{position.country}</p>
      </div>
      <div>
        <span className="text-gray-400">Paridad</span>
        <p>{position.parity}</p>
      </div>
      <div>
        <span className="text-gray-400">Precio ARS</span>
        <p>${position.priceArs.toLocaleString("es-AR")}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/positions-table.tsx`**

```tsx
"use client";

import { useState, useMemo, Fragment } from "react";
import { Position } from "@/lib/calculations";
import { formatUsd, formatPct, formatNumber } from "@/lib/format";
import { SpeciesDetail } from "./species-detail";

type SortKey = "ticker" | "quantity" | "avgPriceUsd" | "currentPriceUsd" | "invested" | "currentValue" | "pnl" | "pnlPct" | "portfolioPct";

interface Props {
  positions: Position[];
}

export function PositionsTable({ positions }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("portfolioPct");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
  const [filterSector, setFilterSector] = useState<string>("all");
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [searchTicker, setSearchTicker] = useState("");

  const sectors = useMemo(() => [...new Set(positions.map((p) => p.sector))].sort(), [positions]);
  const countries = useMemo(() => [...new Set(positions.map((p) => p.country))].sort(), [positions]);

  const filtered = useMemo(() => {
    return positions
      .filter((p) => filterSector === "all" || p.sector === filterSector)
      .filter((p) => filterCountry === "all" || p.country === filterCountry)
      .filter((p) => p.ticker.toLowerCase().includes(searchTicker.toLowerCase()))
      .sort((a, b) => {
        const aVal = a[sortKey] as number;
        const bVal = b[sortKey] as number;
        if (typeof aVal === "string") return sortDir === "asc" ? (aVal as string).localeCompare(bVal as unknown as string) : (bVal as unknown as string).localeCompare(aVal as string);
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      });
  }, [positions, sortKey, sortDir, filterSector, filterCountry, searchTicker]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-3 mb-3 flex-wrap items-center">
        <input
          type="text"
          placeholder="Buscar ticker..."
          value={searchTicker}
          onChange={(e) => setSearchTicker(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm w-40"
        />
        <select
          value={filterSector}
          onChange={(e) => setFilterSector(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm"
        >
          <option value="all">Todos los sectores</option>
          {sectors.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterCountry}
          onChange={(e) => setFilterCountry(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm"
        >
          <option value="all">Todos los países</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-left border-b border-gray-800">
              <th className="py-2 px-2 cursor-pointer hover:text-white" onClick={() => toggleSort("ticker")}>
                Ticker{sortIcon("ticker")}
              </th>
              <th className="py-2 px-2 cursor-pointer hover:text-white text-right" onClick={() => toggleSort("quantity")}>
                Cant{sortIcon("quantity")}
              </th>
              <th className="py-2 px-2 cursor-pointer hover:text-white text-right" onClick={() => toggleSort("avgPriceUsd")}>
                Prom USD{sortIcon("avgPriceUsd")}
              </th>
              <th className="py-2 px-2 cursor-pointer hover:text-white text-right" onClick={() => toggleSort("currentPriceUsd")}>
                Actual USD{sortIcon("currentPriceUsd")}
              </th>
              <th className="py-2 px-2 cursor-pointer hover:text-white text-right" onClick={() => toggleSort("invested")}>
                Invertido{sortIcon("invested")}
              </th>
              <th className="py-2 px-2 cursor-pointer hover:text-white text-right" onClick={() => toggleSort("currentValue")}>
                Valor Actual{sortIcon("currentValue")}
              </th>
              <th className="py-2 px-2 cursor-pointer hover:text-white text-right" onClick={() => toggleSort("pnl")}>
                P&L ${sortIcon("pnl")}
              </th>
              <th className="py-2 px-2 cursor-pointer hover:text-white text-right" onClick={() => toggleSort("pnlPct")}>
                P&L %{sortIcon("pnlPct")}
              </th>
              <th className="py-2 px-2 cursor-pointer hover:text-white text-right" onClick={() => toggleSort("portfolioPct")}>
                % Cartera{sortIcon("portfolioPct")}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((pos) => (
              <Fragment key={pos.ticker}>
                <tr
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer"
                  onClick={() => setExpandedTicker(expandedTicker === pos.ticker ? null : pos.ticker)}
                >
                  <td className="py-2 px-2 font-medium">{pos.ticker}</td>
                  <td className="py-2 px-2 text-right">{pos.quantity}</td>
                  <td className="py-2 px-2 text-right">{formatNumber(pos.avgPriceUsd)}</td>
                  <td className="py-2 px-2 text-right">{formatNumber(pos.currentPriceUsd)}</td>
                  <td className="py-2 px-2 text-right">{formatUsd(pos.invested)}</td>
                  <td className="py-2 px-2 text-right">{formatUsd(pos.currentValue)}</td>
                  <td className={`py-2 px-2 text-right ${pos.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {formatUsd(pos.pnl)}
                  </td>
                  <td className={`py-2 px-2 text-right ${pos.pnlPct >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {formatPct(pos.pnlPct)}
                  </td>
                  <td className="py-2 px-2 text-right font-medium">{pos.portfolioPct.toFixed(1)}%</td>
                </tr>
                {expandedTicker === pos.ticker && (
                  <tr>
                    <td colSpan={9}>
                      <SpeciesDetail position={pos} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/positions-table.tsx src/components/species-detail.tsx
git commit -m "feat: add positions table with sorting, filtering, and expandable species detail"
```

---

### Task 10: Summary Cards Component

**Files:**
- Create: `src/components/summary-cards.tsx`

- [ ] **Step 1: Create `src/components/summary-cards.tsx`**

```tsx
import { formatUsd } from "@/lib/format";

interface SummaryItem {
  label: string;
  value: number;
  pct: number;
}

export function SummaryCards({
  byCountry,
  bySector,
}: {
  byCountry: SummaryItem[];
  bySector: SummaryItem[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-gray-900 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">POR PAÍS</h3>
        <div className="space-y-2">
          {byCountry.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <span>{item.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-gray-400">{formatUsd(item.value)}</span>
                <div className="w-16 text-right font-medium">{item.pct.toFixed(1)}%</div>
                <div className="w-24 bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${Math.min(item.pct, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">POR SECTOR</h3>
        <div className="space-y-2">
          {bySector.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <span>{item.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-gray-400">{formatUsd(item.value)}</span>
                <div className="w-16 text-right font-medium">{item.pct.toFixed(1)}%</div>
                <div className="w-24 bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{ width: `${Math.min(item.pct, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/summary-cards.tsx
git commit -m "feat: add country and sector summary cards with progress bars"
```

---

### Task 11: Investments by Date Component

**Files:**
- Create: `src/components/investments-by-date.tsx`

- [ ] **Step 1: Create `src/components/investments-by-date.tsx`**

```tsx
import { InvestmentByDate } from "@/lib/calculations";
import { formatUsd, formatDate, formatMonth } from "@/lib/format";

interface Props {
  byDate: InvestmentByDate[];
  byMonth: { month: string; totalUsd: number }[];
}

export function InvestmentsByDate({ byDate, byMonth }: Props) {
  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">INVERSIONES POR FECHA</h3>

      {/* Monthly summary */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {byMonth.map((m) => (
          <div key={m.month} className="text-xs bg-gray-800 rounded px-2 py-1 whitespace-nowrap">
            {formatMonth(m.month)}: <span className="font-medium">{formatUsd(m.totalUsd)}</span>
          </div>
        ))}
      </div>

      {/* Date table */}
      <div className="overflow-x-auto max-h-64 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-900">
            <tr className="text-gray-400 text-left border-b border-gray-800">
              <th className="py-2 px-2">Fecha</th>
              <th className="py-2 px-2 text-right">Total USD</th>
              <th className="py-2 px-2 text-right">Acumulado</th>
              <th className="py-2 px-2">Tickers</th>
            </tr>
          </thead>
          <tbody>
            {byDate.map((row) => (
              <tr key={row.date} className="border-b border-gray-800/50">
                <td className="py-1.5 px-2">{formatDate(row.date)}</td>
                <td className="py-1.5 px-2 text-right">{formatUsd(row.totalUsd)}</td>
                <td className="py-1.5 px-2 text-right text-gray-400">{formatUsd(row.accumulated)}</td>
                <td className="py-1.5 px-2 text-gray-400 text-xs">{row.tickers.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/investments-by-date.tsx
git commit -m "feat: add investments by date table with monthly summary"
```

---

### Task 12: Operations History + New Operation Modal

**Files:**
- Create: `src/components/operations-history.tsx`, `src/components/new-operation-modal.tsx`

- [ ] **Step 1: Create `src/components/new-operation-modal.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Species {
  ticker: string;
  name: string;
}

export function NewOperationModal({
  speciesList,
  onClose,
}: {
  speciesList: Species[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [ticker, setTicker] = useState("");
  const [isNewTicker, setIsNewTicker] = useState(false);
  const [type, setType] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [exchangeRate, setExchangeRate] = useState("");

  // New species fields
  const [newName, setNewName] = useState("");
  const [newSector, setNewSector] = useState("");
  const [newCountry, setNewCountry] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const body: Record<string, unknown> = {
        ticker,
        type,
        quantity: parseInt(quantity),
        price: parseFloat(price),
        currency,
        date,
        exchangeRate: exchangeRate ? parseFloat(exchangeRate) : undefined,
      };

      if (isNewTicker) {
        body.newSpecies = {
          name: newName || ticker,
          sector: newSector,
          country: newCountry,
        };
      }

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.refresh();
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md border border-gray-700">
        <h2 className="text-lg font-semibold mb-4">Nueva Operación</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Ticker */}
          <div>
            <label className="text-sm text-gray-400">Ticker</label>
            {!isNewTicker ? (
              <div className="flex gap-2">
                <select
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                  required
                >
                  <option value="">Seleccionar...</option>
                  {speciesList.map((s) => (
                    <option key={s.ticker} value={s.ticker}>{s.ticker} - {s.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsNewTicker(true)}
                  className="text-xs bg-gray-700 px-3 rounded hover:bg-gray-600"
                >
                  + Nuevo
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    placeholder="TICKER"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setIsNewTicker(false)}
                    className="text-xs bg-gray-700 px-3 rounded hover:bg-gray-600"
                  >
                    Existente
                  </button>
                </div>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nombre (ej: Tesla Inc)"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                />
                <select
                  value={newSector}
                  onChange={(e) => setNewSector(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                  required
                >
                  <option value="">Sector...</option>
                  {["TECNOLOGIA", "ENERGIA", "E-COMMERCE", "SALUD", "CONSUMO", "AGRO", "MINERIA", "ETF"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                  required
                >
                  <option value="">País...</option>
                  {["EEUU", "ARG", "BRASIL", "CHINA", "EUROPA", "ASIA", "LATINO"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Type */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" value="BUY" checked={type === "BUY"} onChange={() => setType("BUY")} />
              COMPRA
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" value="SELL" checked={type === "SELL"} onChange={() => setType("SELL")} />
              VENTA
            </label>
          </div>

          {/* Quantity + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400">Cantidad</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                required
                min="1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">Precio ({currency})</label>
              <div className="flex">
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-l px-3 py-2 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setCurrency(currency === "ARS" ? "USD" : "ARS")}
                  className="bg-gray-700 px-3 rounded-r text-xs font-medium hover:bg-gray-600"
                >
                  {currency}
                </button>
              </div>
            </div>
          </div>

          {/* Date + Exchange Rate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">Dólar MEP (auto)</label>
              <input
                type="number"
                step="0.01"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                placeholder="Auto-fetch"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded bg-gray-700 hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/operations-history.tsx`**

```tsx
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
```

- [ ] **Step 3: Commit**

```bash
git add src/components/operations-history.tsx src/components/new-operation-modal.tsx
git commit -m "feat: add operations history table and new operation modal"
```

---

### Task 13: Refresh Button Component

**Files:**
- Create: `src/components/refresh-button.tsx`

- [ ] **Step 1: Create `src/components/refresh-button.tsx`**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/refresh-button.tsx
git commit -m "feat: add refresh button with auto-refresh on stale prices"
```

---

### Task 14: Main Dashboard Page (Wire Everything Together)

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update `src/app/page.tsx`**

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

export const dynamic = "force-dynamic";

export default async function Home() {
  const [summary, investments, txns, speciesList] = await Promise.all([
    getPortfolioSummary(),
    getInvestmentsByDate(),
    getAllTransactions(),
    db.select({ ticker: species.ticker, name: species.name }).from(species),
  ]);

  return (
    <main className="min-h-screen">
      <DashboardHeader summary={summary} />

      <div className="px-4 py-4 space-y-6 max-w-[1600px] mx-auto">
        {/* Refresh button */}
        <div className="flex justify-end">
          <RefreshButton lastUpdated={summary.lastUpdated} />
        </div>

        {/* Positions table */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 mb-2">POSICIONES</h2>
          <PositionsTable positions={summary.positions} />
        </section>

        {/* Summary cards */}
        <SummaryCards
          byCountry={summary.byCountry.map((c) => ({ label: c.country, value: c.value, pct: c.pct }))}
          bySector={summary.bySector.map((s) => ({ label: s.sector, value: s.value, pct: s.pct }))}
        />

        {/* Investments by date */}
        <InvestmentsByDate byDate={investments.byDate} byMonth={investments.byMonth} />

        {/* Operations history */}
        <OperationsHistory transactions={txns} speciesList={speciesList} />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Run dev server and verify**

```bash
npm run dev
```

Open http://localhost:3000. Expected:
- Dashboard header with balance (values will be $0 until price cache is populated)
- Positions table with all tickers
- Summary cards for country/sector
- Investments by date table
- Operations history with all seeded transactions

- [ ] **Step 3: Trigger price refresh**

Click "Actualizar precios" button or visit http://localhost:3000/api/refresh-prices.

After refresh, the dashboard should show actual balance values with real-time prices.

- [ ] **Step 4: Test adding a new operation**

Click "+ Nueva Operación", fill in a test buy (e.g., YPF, 10 shares, 45000 ARS, today's date). Submit and verify it appears in the operations history and the position updates.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire up main dashboard page with all components"
```

---

### Task 15: Polish and Deploy Prep

**Files:**
- Modify: `next.config.ts`, `package.json`

- [ ] **Step 1: Update `next.config.ts` for Vercel**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@libsql/client"],
  },
};

export default nextConfig;
```

- [ ] **Step 2: Test production build**

```bash
npm run build
npm start
```

Open http://localhost:3000 and verify everything works in production mode.

- [ ] **Step 3: Create `.env.example`**

```env
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token
```

- [ ] **Step 4: Update `.gitignore`**

Ensure `.env.local` is in `.gitignore` (it should be by default from create-next-app).

- [ ] **Step 5: Commit**

```bash
git add next.config.ts .env.example
git commit -m "feat: configure for Vercel deployment"
```

- [ ] **Step 6: Deploy to Vercel**

```bash
npm i -g vercel
vercel
```

Follow the prompts. Set environment variables:
- `TURSO_DATABASE_URL` → your Turso URL
- `TURSO_AUTH_TOKEN` → your Turso token

After deploy, verify the live URL works.

- [ ] **Step 7: Commit deploy config if needed**

```bash
git add -A
git commit -m "chore: finalize deployment configuration"
```
