// Pure goal-projection logic — safe to import from client and server.

export interface Scenario {
  id: number;
  name: string;
  startYear: number;
  startValue: number;
  rate: number; // annual, fraction (0.10 = 10%)
  contribution: number; // USD added per year
  bonusFactor: number; // share of bonus that gets invested (0 = no bonus)
  bonusSchedule: number[]; // bonus per year from BONUS_START_YEAR; last value repeats
  endYear: number;
  color: string;
  visible: boolean;
  sortOrder: number;
}

export type ScenarioParams = Omit<Scenario, "id">;

export interface ProjectionPoint {
  year: number; // scenario year label
  date: string; // YYYY-MM-DD when this year's value is measured (1/3 of year+1)
  value: number;
}

export interface WealthParts {
  stocksUsd: number;
  bondsUsd: number;
  cryptoUsd: number;
  cashUsd: number;
}

export const BIRTH_YEAR = 1993;
export const BONUS_START_YEAR = 2025;

export function bonusFor(schedule: number[], year: number): number {
  if (schedule.length === 0) return 0;
  const i = year - BONUS_START_YEAR;
  if (i < 0) return 0;
  return schedule[Math.min(i, schedule.length - 1)];
}

export function measureDate(year: number): string {
  return `${year + 1}-03-01`;
}

export function projectScenario(
  s: Pick<Scenario, "startYear" | "startValue" | "rate" | "contribution" | "bonusFactor" | "bonusSchedule" | "endYear">
): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  let value = s.startValue;
  for (let year = s.startYear; year <= s.endYear; year++) {
    if (year > s.startYear) {
      value = value * (1 + s.rate) + s.contribution + bonusFor(s.bonusSchedule, year) * s.bonusFactor;
    }
    points.push({ year, date: measureDate(year), value });
  }
  return points;
}

export const GOAL = 1_000_000;
const MAX_YEAR = 2100;

// Project year by year until the goal is crossed (inclusive), regardless of endYear; stops at MAX_YEAR
export function projectToGoal(
  s: Pick<Scenario, "startYear" | "startValue" | "rate" | "contribution" | "bonusFactor" | "bonusSchedule">,
  goal: number = GOAL
): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  let value = s.startValue;
  for (let year = s.startYear; year <= MAX_YEAR; year++) {
    if (year > s.startYear) {
      value = value * (1 + s.rate) + s.contribution + bonusFor(s.bonusSchedule, year) * s.bonusFactor;
    }
    points.push({ year, date: measureDate(year), value });
    if (value >= goal) break;
  }
  return points;
}

export function reachGoal(points: ProjectionPoint[], goal: number = GOAL): ProjectionPoint | null {
  return points.find((p) => p.value >= goal) ?? null;
}

// Earliest to reach the goal first; scenarios that never reach it go last
export function sortByGoal<T extends Pick<Scenario, "startYear" | "startValue" | "rate" | "contribution" | "bonusFactor" | "bonusSchedule">>(
  scenarios: T[]
): T[] {
  const reach = (s: T) => reachGoal(projectToGoal(s))?.date ?? "9999";
  return [...scenarios].sort((a, b) => reach(a).localeCompare(reach(b)));
}

// Target for any date: exact on a 1/3, linear between adjacent 1/3s, null outside the range
export function targetAt(points: ProjectionPoint[], date: string): number | null {
  const t = Date.parse(date);
  for (let i = 0; i < points.length; i++) {
    const pt = Date.parse(points[i].date);
    if (pt === t) return points[i].value;
    if (pt > t) {
      if (i === 0) return null;
      const prev = points[i - 1];
      const prevT = Date.parse(prev.date);
      return prev.value + ((points[i].value - prev.value) * (t - prevT)) / (pt - prevT);
    }
  }
  return null;
}

export function nextTarget(points: ProjectionPoint[], date: string): ProjectionPoint | null {
  return points.find((p) => p.date > date) ?? null;
}

export function ageAt(date: string): number {
  return Number(date.slice(0, 4)) - BIRTH_YEAR;
}

export function partsTotal(p: WealthParts): number {
  return Math.round((p.stocksUsd + p.bondsUsd + p.cryptoUsd + p.cashUsd) * 100) / 100;
}

export interface ContributionRow {
  date: string;
  amountUsd: number | null;
  amountArs: number;
  rate: number | null; // transfer rate, or the month's budget rate as fallback
}

// USD sent to investments in the last 12 months (rows without any USD value or rate are skipped)
export function sumContributions(rows: ContributionRow[], today: string): number {
  const yearAgo = `${Number(today.slice(0, 4)) - 1}${today.slice(4)}`;
  let total = 0;
  for (const r of rows) {
    if (r.date <= yearAgo || r.date > today) continue;
    if (r.amountUsd != null) total += r.amountUsd;
    else if (r.rate && r.rate > 0) total += r.amountArs / r.rate;
  }
  return total;
}
