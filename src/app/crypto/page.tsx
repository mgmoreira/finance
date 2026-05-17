import { getCryptoSummary, getCryptoMonthlySnapshots } from "@/lib/crypto-data";
import { CryptoPortfolio } from "@/components/crypto-portfolio";

export const dynamic = "force-dynamic";

export default async function CryptoPage() {
  const [summary, monthlySnapshots] = await Promise.all([
    getCryptoSummary(),
    getCryptoMonthlySnapshots(),
  ]);

  return (
    <main className="min-h-screen" data-section="crypto">
      <CryptoPortfolio summary={summary} monthlySnapshots={monthlySnapshots} />
    </main>
  );
}
