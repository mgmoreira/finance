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
  stockPriceUsd: real("stock_price_usd"), // US stock price at time of purchase (reference)
  date: text("date").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const species = sqliteTable("species", {
  ticker: text("ticker").primaryKey(),
  name: text("name").notNull(),
  sector: text("sector").notNull(),
  country: text("country").notNull(),
  parity: real("parity").notNull().default(1),
  dividendYield: real("dividend_yield").default(0),
  withholdingPct: real("withholding_pct"), // effective dividend withholding %, null = default by country
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

export const cashMovements = sqliteTable("cash_movements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type", { enum: ["SELL", "WITHDRAWAL", "ADJUSTMENT"] }).notNull(),
  amount: real("amount").notNull(),
  currency: text("currency", { enum: ["ARS", "USD"] }).notNull().default("USD"),
  description: text("description"),
  date: text("date").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ── Home Finance (Gastos) ──

export const expenseCategories = sqliteTable("expense_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  color: text("color").notNull(),
});

export const expenseTemplates = sqliteTable("expense_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  categoryId: integer("category_id").references(() => expenseCategories.id),
  isActive: integer("is_active").notNull().default(1),
});

export const monthlyBudgets = sqliteTable("monthly_budgets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  yearMonth: text("year_month").notNull().unique(),
  salary: real("salary").notNull(),
  mercadoPago: real("mercado_pago"),
  exchangeRateUsd: real("exchange_rate_usd"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  budgetId: integer("budget_id").references(() => monthlyBudgets.id).notNull(),
  templateId: integer("template_id").references(() => expenseTemplates.id),
  name: text("name").notNull(),
  categoryId: integer("category_id").references(() => expenseCategories.id),
  amount: real("amount"),
  date: text("date"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const investmentTransfers = sqliteTable("investment_transfers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  budgetId: integer("budget_id").references(() => monthlyBudgets.id).notNull(),
  amountArs: real("amount_ars").notNull(),
  amountUsd: real("amount_usd"),
  exchangeRate: real("exchange_rate"),
  currency: text("currency", { enum: ["ARS", "USD"] }).notNull(),
  date: text("date").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const cryptoHoldings = sqliteTable("crypto_holdings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticker: text("ticker").notNull().unique(),
  name: text("name").notNull(),
  yahooTicker: text("yahoo_ticker"),
  quantity: real("quantity").notNull(),
  entryValueUsd: real("entry_value_usd").notNull(),
  entryPriceUsd: real("entry_price_usd"),
  entryDate: text("entry_date").notNull(),
});

export const cryptoPriceCache = sqliteTable("crypto_price_cache", {
  ticker: text("ticker").primaryKey(),
  priceUsd: real("price_usd"),
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

export const priceAlerts = sqliteTable("price_alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticker: text("ticker").notNull(),
  condition: text("condition", { enum: ["above", "below"] }).notNull(),
  targetPrice: real("target_price").notNull(),
  active: integer("active").notNull().default(1),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  triggeredAt: text("triggered_at"),
});

export const cryptoMonthlySnapshots = sqliteTable("crypto_monthly_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  yearMonth: text("year_month").notNull().unique(),
  totalValueUsd: real("total_value_usd").notNull(),
  totalInvestedUsd: real("total_invested_usd").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

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

export const dividendCache = sqliteTable("dividend_cache", {
  ticker: text("ticker").primaryKey(),
  events: text("events").notNull().default("[]"), // JSON [{ exDate, amount }]
  nextExDate: text("next_ex_date"),
  nextPayDate: text("next_pay_date"),
  payLagDays: integer("pay_lag_days").notNull().default(25),
  updatedAt: text("updated_at").notNull(),
});
