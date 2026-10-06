import type { WealthOverview } from "@/lib/wealth-data";
import { sortByGoal } from "@/lib/goals";
import { WealthHeader } from "./wealth-header";
import { GoalsChart } from "./goals-chart";
import { ScenarioCards } from "./scenario-cards";
import { SnapshotsTable } from "./snapshots-table";
import { ScenarioManager } from "./scenario-manager";

export function HomeDashboard({ overview }: { overview: WealthOverview }) {
  const { today, snapshots } = overview;
  const scenarios = sortByGoal(overview.scenarios);
  return (
    <div className="page-wrap" style={{ padding: 14, display: "grid", gap: 12, maxWidth: 1600, margin: "0 auto" }}>
      <WealthHeader today={today} />
      <GoalsChart scenarios={scenarios} snapshots={snapshots} today={today} />
      <ScenarioCards scenarios={scenarios} today={today} contributions12m={overview.contributions12m} />
      <SnapshotsTable snapshots={snapshots} scenarios={scenarios} />
      <ScenarioManager scenarios={scenarios} />
    </div>
  );
}
