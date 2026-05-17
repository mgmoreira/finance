import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { priceAlerts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchQuotes } from "@/lib/yahoo";

async function sendTelegram(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message }),
  });
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const active = await db
    .select()
    .from(priceAlerts)
    .where(eq(priceAlerts.active, 1));

  if (active.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, triggered: 0 });
  }

  const uniqueTickers = [...new Set(active.map((a) => a.ticker))];
  const prices = await fetchQuotes(uniqueTickers);

  const triggered: string[] = [];

  for (const alert of active) {
    const quote = prices.get(alert.ticker);
    if (!quote || !quote.regularMarketPrice) continue;

    const price = quote.regularMarketPrice;
    const fired =
      (alert.condition === "above" && price >= alert.targetPrice) ||
      (alert.condition === "below" && price <= alert.targetPrice);

    if (fired) {
      const dir = alert.condition === "above" ? "superó" : "bajó de";
      await sendTelegram(
        `🚨 ${alert.ticker} ${dir} $${alert.targetPrice}\nPrecio actual: $${price.toFixed(2)}`
      );
      await db
        .update(priceAlerts)
        .set({ active: 0, triggeredAt: new Date().toISOString() })
        .where(eq(priceAlerts.id, alert.id));
      triggered.push(alert.ticker);
    }
  }

  return NextResponse.json({ ok: true, checked: active.length, triggered: triggered.length, tickers: triggered });
}
