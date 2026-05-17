import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, species, cashMovements, priceCache } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
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
    const { ticker, type, quantity, price, currency: rawCurrency, date, exchangeRate: manualRate, newSpecies } = body;
    const currency: "ARS" | "USD" = rawCurrency || "ARS";

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
        exchangeRate = 0;
      }
      // Holiday / market-closed fallback: read from most recent transaction's stored rate
      if (!exchangeRate || exchangeRate <= 0) {
        const recentTxns = await db
          .select({ rate: transactions.exchangeRate })
          .from(transactions)
          .orderBy(desc(transactions.date))
          .limit(20);
        const validTxn = recentTxns.find((t) => (t.rate ?? 0) > 100);
        exchangeRate = validTxn?.rate ?? 0;
      }
      if (!exchangeRate || exchangeRate <= 0) {
        return NextResponse.json({ error: "No se pudo obtener el tipo de cambio MEP. Ingresalo manualmente." }, { status: 400 });
      }
    }

    // Calculate prices
    let priceArs = 0;
    let priceUsd = 0;

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
      // No price provided — fetch CEDEAR ARS price for that date
      try {
        const today = new Date().toISOString().slice(0, 10);
        const bymaTicker = usToBymaTicker[ticker] ?? ticker;
        let resolvedFromCache = false;

        // For today's date, the historical endpoint may have incomplete intraday data.
        // Use the live price from cache instead (refreshed by the refresh-prices button).
        if (date === today) {
          const cached = await db.select().from(priceCache).where(eq(priceCache.ticker, ticker)).get();
          if (cached?.priceArs && cached.priceArs > 0) {
            priceArs = cached.priceArs;
            priceUsd = priceArs / exchangeRate;
            resolvedFromCache = true;
          }
        }

        if (!resolvedFromCache) {
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
        }
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

    // Update cash balance
    if (type === "SELL") {
      await db.insert(cashMovements).values({
        type: "SELL",
        amount: totalUsd,
        description: `Venta ${quantity} ${ticker}`,
        date,
      });
    } else {
      // BUY: deduct from USD cash if there's cash available
      const allCash = await db.select().from(cashMovements);
      const cashBalance = allCash
        .filter((m) => (m.currency ?? "USD") === "USD")
        .reduce((sum, m) => sum + m.amount, 0);
      if (cashBalance > 0) {
        const deduction = Math.min(cashBalance, totalUsd);
        await db.insert(cashMovements).values({
          type: "ADJUSTMENT",
          amount: -deduction,
          description: `Compra ${quantity} ${ticker}`,
          date,
        });
      }
    }

    return NextResponse.json({ ok: true, transaction: result[0] });
  } catch (error) {
    console.error("Transaction creation failed:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ticker, type, quantity, priceArs, exchangeRate, stockPriceUsd, date } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    if (!exchangeRate || exchangeRate <= 0) {
      return NextResponse.json({ error: "Tipo de cambio inválido." }, { status: 400 });
    }
    const priceUsd = priceArs / exchangeRate;
    const totalArs = quantity * priceArs;
    const totalUsd = quantity * priceUsd;

    await db.update(transactions)
      .set({
        ticker,
        type,
        quantity,
        priceArs,
        priceUsd,
        totalArs,
        totalUsd,
        exchangeRate,
        stockPriceUsd: stockPriceUsd ?? null,
        date,
      })
      .where(eq(transactions.id, id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Transaction update failed:", error);
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

    // Fetch transaction before deleting so we can reverse its cash movement
    const txn = await db.select().from(transactions).where(eq(transactions.id, parseInt(id))).get();
    if (txn) {
      const expectedDescription = txn.type === "SELL"
        ? `Venta ${txn.quantity} ${txn.ticker}`
        : `Compra ${txn.quantity} ${txn.ticker}`;
      await db.delete(cashMovements).where(
        and(
          eq(cashMovements.description, expectedDescription),
          eq(cashMovements.date, txn.date),
        )
      );
    }

    await db.delete(transactions).where(eq(transactions.id, parseInt(id)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
