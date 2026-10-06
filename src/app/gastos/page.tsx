import { getBudgetDetail, getCategories, getTemplates, getAllMonthSummaries, getComparisonData } from "@/lib/gastos-data";
import { GastosDashboard } from "@/components/gastos/gastos-dashboard";

export const dynamic = "force-dynamic";

function nextYearMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

export default async function GastosPage() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [categories, templates, allMonths, comparison] = await Promise.all([
    getCategories(),
    getTemplates(),
    getAllMonthSummaries(),
    getComparisonData(6),
  ]);

  // If there's a gap between the last registered month and today, start on the
  // first un-budgeted month so the user doesn't have to navigate back manually.
  let initialYearMonth = currentMonth;
  if (allMonths.length > 0) {
    const sorted = [...allMonths].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
    const afterLast = nextYearMonth(sorted[sorted.length - 1].yearMonth);
    if (afterLast < currentMonth) {
      initialYearMonth = afterLast;
    }
  }

  const budget = await getBudgetDetail(initialYearMonth);

  return (
    <main className="min-h-screen">
      <div className="px-3 md:px-4 py-3 md:py-4 space-y-6 max-w-[1600px] mx-auto">
        <GastosDashboard
          initialBudget={budget}
          initialYearMonth={initialYearMonth}
          categories={categories}
          templates={templates}
          allMonths={allMonths}
          comparison={comparison}
        />
      </div>
    </main>
  );
}
