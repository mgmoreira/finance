import { getPortfolioSummary, getInvestmentsByDate, getAllTransactions } from "@/lib/calculations";
import { db } from "@/db";
import { species } from "@/db/schema";
import { DashboardHeader } from "@/components/dashboard-header";
import { PositionsTable } from "@/components/positions-table";
import { SummaryCards } from "@/components/summary-cards";
import { InvestmentsByDate } from "@/components/investments-by-date";
import { OperationsHistory } from "@/components/operations-history";
import { RefreshButton } from "@/components/refresh-button";
import { PortfolioCharts } from "@/components/portfolio-charts";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [summary, investments, txns, speciesList] = await Promise.all([
    getPortfolioSummary(),
    getInvestmentsByDate(),
    getAllTransactions(),
    db.select({ ticker: species.ticker, name: species.name }).from(species),
  ]);

  return (
    <main className="min-h-screen" data-section="investments">
      <DashboardHeader summary={summary} />

      <div className="px-4 py-4 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex justify-end">
          <RefreshButton lastUpdated={summary.lastUpdated} />
        </div>

        <section>
          <h2 className="text-sm font-semibold text-gray-400 mb-2">POSICIONES</h2>
          <PositionsTable positions={summary.positions} />
        </section>

        <SummaryCards
          byCountry={summary.byCountry.map((c) => ({ label: c.country, value: c.value, pct: c.pct }))}
          bySector={summary.bySector.map((s) => ({ label: s.sector, value: s.value, pct: s.pct }))}
        />

        <PortfolioCharts snapshots={summary.monthlyStats} />

        <InvestmentsByDate byDate={investments.byDate} byMonth={investments.byMonth} />

        <OperationsHistory transactions={txns} speciesList={speciesList} />
      </div>
    </main>
  );
}
