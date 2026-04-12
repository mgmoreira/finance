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
