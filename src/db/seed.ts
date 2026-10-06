import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const db = drizzle(client, { schema });

const seedSpecies = [
  { ticker: "YPF", name: "YPF S.A.", sector: "ENERGIA", country: "ARG", parity: 10, dividendYield: 0 },
  { ticker: "EWZ", name: "iShares MSCI Brazil ETF", sector: "ETF", country: "BRASIL", parity: 2, dividendYield: 0 },
  { ticker: "PBR", name: "Petrobras", sector: "ENERGIA", country: "BRASIL", parity: 1, dividendYield: 0 },
  { ticker: "INTC", name: "Intel Corp", sector: "TECNOLOGIA", country: "EEUU", parity: 5, dividendYield: 0 },
  { ticker: "MUX", name: "McEwen Mining", sector: "MINERIA", country: "EEUU", parity: 2, dividendYield: 0 },
  { ticker: "TGS", name: "Transportadora de Gas del Sur", sector: "ENERGIA", country: "ARG", parity: 5, dividendYield: 0 },
  { ticker: "CRESY", name: "Cresud", sector: "AGRO", country: "ARG", parity: 10, dividendYield: 0 },
  { ticker: "TSLA", name: "Tesla Inc", sector: "TECNOLOGIA", country: "EEUU", parity: 15, dividendYield: 0 },
  { ticker: "AMZN", name: "Amazon.com", sector: "E-COMMERCE", country: "EEUU", parity: 144, dividendYield: 0 },
  { ticker: "NKE", name: "Nike Inc", sector: "CONSUMO", country: "EEUU", parity: 12, dividendYield: 2.14 },
  { ticker: "LLY", name: "Eli Lilly", sector: "SALUD", country: "EEUU", parity: 56, dividendYield: 0.79 },
  { ticker: "GPRK", name: "GeoPark Ltd", sector: "ENERGIA", country: "LATINO", parity: 1, dividendYield: 9.2 },
  { ticker: "UNH", name: "UnitedHealth Group", sector: "SALUD", country: "EEUU", parity: 33, dividendYield: 3.72 },
  { ticker: "PEP", name: "PepsiCo Inc", sector: "CONSUMO", country: "EEUU", parity: 18, dividendYield: 4.09 },
  { ticker: "JD", name: "JD.com", sector: "E-COMMERCE", country: "CHINA", parity: 4, dividendYield: 3.17 },
  { ticker: "BABA", name: "Alibaba Group", sector: "E-COMMERCE", country: "CHINA", parity: 9, dividendYield: 0.8 },
  { ticker: "PFE", name: "Pfizer Inc", sector: "SALUD", country: "EEUU", parity: 4, dividendYield: 7.32 },
  { ticker: "FXI", name: "iShares China Large-Cap ETF", sector: "ETF", country: "CHINA", parity: 5, dividendYield: 2.61 },
  { ticker: "GGB", name: "Gerdau S.A.", sector: "MINERIA", country: "BRASIL", parity: 0.25, dividendYield: 0 },
  { ticker: "BG", name: "Bunge Global", sector: "AGRO", country: "EUROPA", parity: 5, dividendYield: 3.59 },
  { ticker: "ASML", name: "ASML Holding", sector: "TECNOLOGIA", country: "EUROPA", parity: 146, dividendYield: 0.84 },
  { ticker: "TSM", name: "Taiwan Semiconductor", sector: "TECNOLOGIA", country: "ASIA", parity: 9, dividendYield: 0.88 },
  { ticker: "VIST", name: "Vista Energy", sector: "ENERGIA", country: "ARG", parity: 3, dividendYield: 0 },
  { ticker: "PAGS", name: "PagSeguro Digital", sector: "E-COMMERCE", country: "BRASIL", parity: 3, dividendYield: 0 },
  { ticker: "VALE", name: "Vale S.A.", sector: "MINERIA", country: "BRASIL", parity: 2, dividendYield: 0 },
  { ticker: "MELI", name: "MercadoLibre", sector: "E-COMMERCE", country: "ARG", parity: 120, dividendYield: 0 },
  { ticker: "PG", name: "Procter & Gamble", sector: "CONSUMO", country: "EEUU", parity: 15, dividendYield: 2.89 },
  { ticker: "MSFT", name: "Microsoft Corp", sector: "TECNOLOGIA", country: "EEUU", parity: 30, dividendYield: 0 },
];

// [ticker, type, quantity, priceArs, currency, exchangeRate, date]
type TxTuple = [string, "BUY" | "SELL", number, number, "ARS" | "USD", number, string];

const rawTransactions: TxTuple[] = [
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

const seedSnapshots = [
  { yearMonth: "2025-07", portfolioValueUsd: 19189, depositsUsd: 6584, gainUsd: -194, gainPct: -1.01, sp500Value: null },
  { yearMonth: "2025-08", portfolioValueUsd: 26598, depositsUsd: 8553, gainUsd: 1094, gainPct: 5.77, sp500Value: null },
  { yearMonth: "2025-09", portfolioValueUsd: 40118, depositsUsd: 5552, gainUsd: 3520, gainPct: 9.27, sp500Value: null },
  { yearMonth: "2025-10", portfolioValueUsd: 53279, depositsUsd: 10167, gainUsd: 4724, gainPct: 11.78, sp500Value: null },
  { yearMonth: "2025-11", portfolioValueUsd: 58955, depositsUsd: 7546, gainUsd: 38, gainPct: 0.07, sp500Value: null },
  { yearMonth: "2025-12", portfolioValueUsd: 60765, depositsUsd: 3342, gainUsd: -1392, gainPct: -2.29, sp500Value: null },
  { yearMonth: "2026-01", portfolioValueUsd: 71625, depositsUsd: 2891, gainUsd: 6641, gainPct: 10.94, sp500Value: null },
  { yearMonth: "2026-02", portfolioValueUsd: 72672, depositsUsd: 3797, gainUsd: 1047, gainPct: 1.46, sp500Value: null },
  { yearMonth: "2026-03", portfolioValueUsd: 72553, depositsUsd: 0, gainUsd: -119, gainPct: -0.16, sp500Value: null },
];

async function seed() {
  console.log("Seeding species...");
  for (const s of seedSpecies) {
    await db.insert(schema.species).values(s).onConflictDoNothing();
  }
  console.log(`Inserted ${seedSpecies.length} species`);

  console.log("Seeding transactions...");
  for (const [ticker, type, quantity, priceArs, currency, exchangeRate, date] of rawTransactions) {
    const priceUsd = priceArs / exchangeRate;
    const totalArs = quantity * priceArs;
    const totalUsd = quantity * priceUsd;
    await db.insert(schema.transactions).values({
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
  console.log(`Inserted ${rawTransactions.length} transactions`);

  console.log("Seeding monthly snapshots...");
  for (const snap of seedSnapshots) {
    await db.insert(schema.monthlySnapshots).values(snap).onConflictDoNothing();
  }
  console.log(`Inserted ${seedSnapshots.length} monthly snapshots`);

  console.log("Done seeding!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
