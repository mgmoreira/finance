import { getWealthOverview } from "@/lib/wealth-data";
import { HomeDashboard } from "@/components/home/home-dashboard";

export const dynamic = "force-dynamic";

export default async function ObjetivosPage() {
  const overview = await getWealthOverview();
  return (
    <main data-section="home" style={{ minHeight: "100vh" }}>
      <HomeDashboard overview={overview} />
    </main>
  );
}
