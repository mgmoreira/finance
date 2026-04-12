CREATE TABLE `monthly_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`year_month` text NOT NULL,
	`portfolio_value_usd` real NOT NULL,
	`deposits_usd` real NOT NULL,
	`gain_usd` real NOT NULL,
	`gain_pct` real NOT NULL,
	`sp500_value` real,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `monthly_snapshots_year_month_unique` ON `monthly_snapshots` (`year_month`);--> statement-breakpoint
CREATE TABLE `price_cache` (
	`ticker` text PRIMARY KEY NOT NULL,
	`price_usd` real,
	`price_ars` real,
	`parity` real,
	`exchange_rate_mep` real,
	`ath` real,
	`month_start_price` real,
	`sp500_month_start` real,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `species` (
	`ticker` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sector` text NOT NULL,
	`country` text NOT NULL,
	`parity` real DEFAULT 1 NOT NULL,
	`dividend_yield` real DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticker` text NOT NULL,
	`type` text NOT NULL,
	`quantity` integer NOT NULL,
	`price_ars` real NOT NULL,
	`price_usd` real NOT NULL,
	`currency` text NOT NULL,
	`total_ars` real NOT NULL,
	`total_usd` real NOT NULL,
	`exchange_rate` real NOT NULL,
	`date` text NOT NULL,
	`created_at` text NOT NULL
);
