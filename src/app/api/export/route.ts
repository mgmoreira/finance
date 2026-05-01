import { NextResponse } from "next/server";
import { getPortfolioSummary } from "@/lib/calculations";

function fmt(n: number, decimals = 0): string {
  return n.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function pct(n: number): string {
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
}

export async function GET() {
  const s = await getPortfolioSummary();

  const lines: string[] = [];

  lines.push("# Portfolio CEDEAR — Resumen para análisis");
  lines.push(`Fecha: ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`Dólar MEP: $${fmt(s.mepRate)}`);
  lines.push("");

  lines.push("## Balance general");
  lines.push(`- Valor total: USD ${fmt(s.totalValue)}`);
  lines.push(`- Invertido (costo): USD ${fmt(s.totalInvested)}`);
  lines.push(`- Ganancia: USD ${fmt(s.totalGain)} (${pct(s.totalGainPct)})`);
  lines.push(`- Efectivo USD: USD ${fmt(s.cashBalanceUsd)}`);
  if (s.cashBalanceArs > 0) {
    lines.push(`- Efectivo ARS: ARS ${fmt(s.cashBalanceArs)}`);
  }
  lines.push(`- Efectivo total (equiv USD): USD ${fmt(s.cashBalanceTotal)}`);
  lines.push("");

  lines.push("## Posiciones");
  lines.push("| Ticker | Nombre | Sector | País | Cantidad | Invertido USD | Valor actual USD | P&L USD | P&L % | % Portfolio | Div Yield |");
  lines.push("|--------|--------|--------|------|----------|---------------|------------------|---------|-------|-------------|-----------|");
  for (const p of s.positions) {
    lines.push(
      `| ${p.ticker} | ${p.name} | ${p.sector} | ${p.country} | ${p.quantity} | ${fmt(p.invested)} | ${fmt(p.currentValue)} | ${fmt(p.pnl)} | ${pct(p.pnlPct)} | ${p.portfolioPct.toFixed(1)}% | ${p.dividendYield.toFixed(1)}% |`
    );
  }
  lines.push("");

  lines.push("## Distribución por país");
  for (const c of s.byCountry) {
    lines.push(`- ${c.country}: USD ${fmt(c.value)} (${c.pct.toFixed(1)}%)`);
  }
  lines.push("");

  lines.push("## Distribución por sector");
  for (const sec of s.bySector) {
    lines.push(`- ${sec.sector}: USD ${fmt(sec.value)} (${sec.pct.toFixed(1)}%)`);
  }
  lines.push("");

  lines.push("## Performance mensual");
  lines.push("| Mes | Valor portfolio | Ganancia USD | Ganancia % |");
  lines.push("|-----|-----------------|--------------|------------|");
  for (const m of s.monthlyStats) {
    lines.push(`| ${m.yearMonth} | USD ${fmt(m.portfolioValue)} | ${fmt(m.gainUsd)} | ${pct(m.gainPct)} |`);
  }
  lines.push("");

  lines.push("## Distancia al ATH (máximo histórico US)");
  const sorted = [...s.positions].sort((a, b) => b.athDistance - a.athDistance);
  for (const p of sorted) {
    if (p.ath > 0) {
      lines.push(`- ${p.ticker}: precio US ${fmt(p.stockPriceUsd, 2)} vs ATH ${fmt(p.ath, 2)} (${pct(-p.athDistance)} del máximo)`);
    }
  }
  lines.push("");

  lines.push("## Contexto");
  lines.push("- Inversor argentino operando CEDEARs y acciones locales en BYMA (Bolsa de Buenos Aires)");
  lines.push("- Los precios se calculan en USD vía dólar MEP (tipo de cambio financiero argentino)");
  lines.push("- CEDEARs son certificados que representan acciones extranjeras, con una paridad (ratio) respecto a la acción original");
  lines.push("- Las acciones argentinas (YPF, TGS, CRESY) cotizan directamente en pesos en BYMA");

  const text = lines.join("\n");

  return new NextResponse(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
