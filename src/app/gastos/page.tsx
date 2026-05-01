import { getBudgetDetail, getCategories, getTemplates, getAllMonthSummaries, getComparisonData } from "@/lib/gastos-data";
import { GastosDashboard } from "@/components/gastos/gastos-dashboard";

export const dynamic = "force-dynamic";

export default async function GastosPage() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [budget, categories, templates, allMonths, comparison] = await Promise.all([
    getBudgetDetail(currentMonth),
    getCategories(),
    getTemplates(),
    getAllMonthSummaries(),
    getComparisonData(6),
  ]);

  return (
    <main className="min-h-screen">
      <div className="px-4 py-4 space-y-6 max-w-[1600px] mx-auto">
        <GastosDashboard
          initialBudget={budget}
          initialYearMonth={currentMonth}
          categories={categories}
          templates={templates}
          allMonths={allMonths}
          comparison={comparison}
        />
      </div>
    </main>
  );
}
