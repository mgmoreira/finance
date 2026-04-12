import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, species } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchMep, fetchCedearHistory } from "@/lib/data912";
import { fetchQuotes } from "@/lib/yahoo";

// Map US ticker → BYMA ticker when they differ
const usToBymaTicker: Record<string, string> = {
  BG: "BNG",
  CRESY: "CRES",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticker, type, quantity, price, currency, date, exchangeRate: manualRate, newSpecies } = body;

    // Validate required fields (price is optional — auto-fetched if missing)
    if (!ticker || !type || !quantity || !date) {
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

    if (price) {
      // User provided a price
      const cur = currency || "ARS";
      if (cur === "ARS") {
        priceArs = price;
        priceUsd = price / exchangeRate;
      } else {
        priceUsd = price;
        priceArs = price * exchangeRate;
      }
    } else {
      // No price provided — fetch historical CEDEAR ARS price for that date
      try {
        const bymaTicker = usToBymaTicker[ticker] ?? ticker;
        const history = await fetchCedearHistory(bymaTicker);
        const sorted = history.sort((a, b) => a.date.localeCompare(b.date));
        let match = sorted.find((h) => h.date === date);
        if (!match) {
          const before = sorted.filter((h) => h.date <= date);
          match = before.length > 0 ? before[before.length - 1] : undefined;
        }
        if (!match || !match.close) {
          return NextResponse.json({ error: `No se encontró precio para ${ticker} en ${date}. Ingresá el precio manualmente.` }, { status: 400 });
        }
        priceArs = match.close;
        priceUsd = priceArs / exchangeRate;
      } catch {
        return NextResponse.json({ error: `No se pudo buscar el precio de ${ticker}. Ingresá el precio manualmente.` }, { status: 400 });
      }
    }

    const totalArs = quantity * priceArs;
    const totalUsd = quantity * priceUsd;

    // Fetch current US stock price for reference
    let stockPriceUsd: number | null = null;
    try {
      const quotes = await fetchQuotes([ticker]);
      stockPriceUsd = quotes.get(ticker)?.regularMarketPrice ?? null;
    } catch {
      // Non-critical, continue without it
    }

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
      stockPriceUsd,
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
