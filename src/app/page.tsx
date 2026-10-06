import { getPortfolioSummary, getInvestmentsByDate, getAllTransactions, getRealizedPnl } from "@/lib/calculations";
import { db } from "@/db";
import { species } from "@/db/schema";
import { DashboardHeader } from "@/components/dashboard-header";
import { PositionsTable } from "@/components/positions-table";
import { SummaryCards } from "@/components/summary-cards";
import { InvestmentsByDate } from "@/components/investments-by-date";
import { OperationsHistory } from "@/components/operations-history";
import { RefreshButton } from "@/components/refresh-button";
import { PortfolioCharts } from "@/components/portfolio-charts";
import { RealizedPnl } from "@/components/realized-pnl";
import { PriceAlerts } from "@/components/price-alerts";
import { getDividendSummary } from "@/lib/dividend-data";
import { DividendsPanel } from "@/components/dividends-panel";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [summary, investments, txns, speciesList, realizedPnl] = await Promise.all([
    getPortfolioSummary(),
    getInvestmentsByDate(),
    getAllTransactions(),
    db.select({ ticker: species.ticker, name: species.name }).from(species),
    getRealizedPnl(),
  ]);
  const dividends = await getDividendSummary(summary.positions, summary.totalValue);

  return (
    <main data-section="investments" style={{ minHeight: "100vh" }}>
      <DashboardHeader summary={summary} />

      <div className="page-wrap" style={{ padding: "14px", display: "grid", gap: 12, maxWidth: 1600, margin: "0 auto" }}>
        {/* Refresh button */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <RefreshButton lastUpdated={summary.lastUpdated} />
        </div>

        {/* Positions table (main content) */}
        <PositionsTable
          positions={summary.positions}
          transactions={txns}
          speciesList={speciesList}
          dividends={dividends.tickers}
        />

        {/* Monthly gain right after holdings */}
        <PortfolioCharts snapshots={summary.monthlyStats} show="gain" />

        {/* Dividends (estimated) */}
        <DividendsPanel summary={dividends} stocksValue={summary.totalValue} />

        {/* Allocation panels */}
        <SummaryCards
          byCountry={summary.byCountry.map((c) => ({ label: c.country, value: c.value, pct: c.pct }))}
          bySector={summary.bySector.map((s) => ({ label: s.sector, value: s.value, pct: s.pct }))}
        />

        {/* Portfolio evolution vs S&P 500 */}
        <PortfolioCharts snapshots={summary.monthlyStats} show="evolution" />

        {/* Deposits by date */}
        <InvestmentsByDate byDate={investments.byDate} byMonth={investments.byMonth} />

        {/* Operations history */}
        <OperationsHistory transactions={txns} speciesList={speciesList} />

        {/* Realized P&L */}
        <RealizedPnl data={realizedPnl} />

        {/* Price alerts */}
        <PriceAlerts />
      </div>
    </main>
  );
}
