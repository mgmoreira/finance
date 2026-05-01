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

// Historical prices fetched from Yahoo Finance for 2024-03-01
const entryPrices: Record<string, number | null> = {
  ADA:   0.71908098,
  XRP:   0.54799002,
  LINK:  20.06,
  TRX:   0.14160,
  ETH:   2216.64,
  DOT:   8.67,
  XVS:   12.91,
  LUNC:  0.000157,
  LUNA:  null, // N/A — will use entryValueUsd / quantity
  USTC:  0.036935,
  IOTA:  0.315,
  SLP:   0.004562,
  AXS:   9.906,
  RON:   1.525804,
  GOHM:  3381.21,
  AURORA: null, // N/A — will use entryValueUsd / quantity
};

async function migrate() {
  // Add entry_price_usd column
  await client.execute("ALTER TABLE crypto_holdings ADD COLUMN entry_price_usd REAL").catch((e) => {
    if (String(e).includes("duplicate column")) console.log("entry_price_usd already exists");
    else throw e;
  });

  // Fetch current holdings to compute fallback prices
  const holdings = await client.execute("SELECT ticker, quantity, entry_value_usd FROM crypto_holdings");

  for (const row of holdings.rows) {
    const ticker = row.ticker as string;
    const quantity = row.quantity as number;
    const entryValueUsd = row.entry_value_usd as number;

    let priceUsd = entryPrices[ticker];

    // For LUNA and AURORA: derive from entry value / quantity
    if (priceUsd == null) {
      priceUsd = entryValueUsd / quantity;
      console.log(`${ticker}: fallback price = ${priceUsd.toFixed(8)} (${entryValueUsd} / ${quantity})`);
    } else {
      console.log(`${ticker}: entry price = ${priceUsd}`);
    }

    await client.execute({
      sql: "UPDATE crypto_holdings SET entry_price_usd = ? WHERE ticker = ?",
      args: [priceUsd, ticker],
    });
  }

  // Fix LUNC quantity: $2000 / $0.000157
  const luncQty = 2000 / 0.000157;
  await client.execute({
    sql: "UPDATE crypto_holdings SET quantity = ? WHERE ticker = 'LUNC'",
    args: [luncQty],
  });
  console.log(`LUNC quantity updated to ${luncQty.toFixed(0)}`);

  // Fix GOHM quantity: $182 / $3381.21
  const gohmQty = 182 / 3381.21;
  await client.execute({
    sql: "UPDATE crypto_holdings SET quantity = ? WHERE ticker = 'GOHM'",
    args: [gohmQty],
  });
  console.log(`GOHM quantity updated to ${gohmQty.toFixed(6)}`);

  console.log("\nMigration complete!");
  const result = await client.execute("SELECT ticker, quantity, entry_value_usd, entry_price_usd FROM crypto_holdings ORDER BY ticker");
  for (const r of result.rows) {
    console.log(`  ${r.ticker}: qty=${Number(r.quantity).toFixed(4)}, entryVal=$${r.entry_value_usd}, entryPrice=$${Number(r.entry_price_usd).toFixed(6)}`);
  }
}

migrate().catch(console.error);
