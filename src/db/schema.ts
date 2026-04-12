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
