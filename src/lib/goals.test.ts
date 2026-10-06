import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bonusFor, measureDate, projectScenario, projectToGoal, reachGoal, sortByGoal, sumContributions, GOAL, targetAt, nextTarget, ageAt, partsTotal,
} from "./goals";

const BONUS = [3333, 6666, 9999, 13333, 16666, 20000];
const base = { bonusSchedule: BONUS };

const SCENARIOS = [
  { name: "10%", startYear: 2024, startValue: 73000, rate: 0.10, contribution: 8000, bonusFactor: 0, endYear: 2047, last: 1290008.27 },
  { name: "15%", startYear: 2024, startValue: 73000, rate: 0.15, contribution: 8000, bonusFactor: 0, endYear: 2041, last: 1306173.02 },
  { name: "MELI sin bono", startYear: 2025, startValue: 108000, rate: 0.10, contribution: 25000, bonusFactor: 0, endYear: 2041, last: 1395000.33 },
  { name: "MELI con bono", startYear: 2025, startValue: 108000, rate: 0.10, contribution: 25000, bonusFactor: 0.67, endYear: 2041, last: 1791530.84 },
  { name: "MELI sin rendimiento", startYear: 2025, startValue: 108000, rate: 0, contribution: 25000, bonusFactor: 0.67, endYear: 2041, last: 700064.88 },
  { name: "MELI 18k + bono", startYear: 2025, startValue: 108000, rate: 0.10, contribution: 18000, bonusFactor: 0.67, endYear: 2041, last: 1539882.73 },
];

for (const s of SCENARIOS) {
  test(`projectScenario reproduce la planilla: ${s.name}`, () => {
    const pts = projectScenario({ ...base, ...s });
    assert.equal(pts.length, s.endYear - s.startYear + 1);
    assert.equal(pts[0].value, s.startValue);
    assert.equal(Math.round(pts.at(-1)!.value * 100) / 100, s.last);
  });
}

test("MELI con bono 2026 = 148266.22 y MELI 18k 2026 = 141266.22", () => {
  const conBono = projectScenario({ ...base, ...SCENARIOS[3] });
  const m18 = projectScenario({ ...base, ...SCENARIOS[5] });
  assert.equal(Math.round(conBono[1].value * 100) / 100, 148266.22);
  assert.equal(Math.round(m18[1].value * 100) / 100, 141266.22);
});

test("bonusFor: antes de 2025 es 0, después del calendario queda fijo", () => {
  assert.equal(bonusFor(BONUS, 2024), 0);
  assert.equal(bonusFor(BONUS, 2025), 3333);
  assert.equal(bonusFor(BONUS, 2030), 20000);
  assert.equal(bonusFor(BONUS, 2045), 20000);
  assert.equal(bonusFor([], 2030), 0);
});

test("measureDate: el año X se mide el 1/3 de X+1", () => {
  assert.equal(measureDate(2025), "2026-03-01");
  const pts = projectScenario({ ...base, ...SCENARIOS[0] });
  assert.equal(pts[0].date, "2025-03-01");
  assert.equal(pts[0].year, 2024);
});

test("targetAt: exacto en 1/3, interpolado entre 1/3, null fuera de rango", () => {
  const pts = projectScenario({ ...base, ...SCENARIOS[0] }); // 2025-03-01=73000, 2026-03-01=88300
  assert.equal(targetAt(pts, "2025-03-01"), 73000);
  assert.equal(targetAt(pts, "2026-03-01"), 88300);
  const mid = targetAt(pts, "2025-09-01")!;
  assert.ok(Math.abs(mid - (73000 + 15300 * 184 / 365)) < 0.01);
  assert.equal(targetAt(pts, "2025-02-28"), null);
  assert.equal(targetAt(pts, "2049-01-01"), null);
});

test("nextTarget: primer objetivo estrictamente posterior; null si ya pasaron todos", () => {
  const pts = projectScenario({ ...base, ...SCENARIOS[0] });
  assert.equal(nextTarget(pts, "2026-10-06")!.date, "2027-03-01");
  assert.equal(nextTarget(pts, "2027-03-01")!.date, "2028-03-01");
  assert.equal(nextTarget(pts, "2049-01-01"), null);
});

test("ageAt y partsTotal", () => {
  assert.equal(ageAt("2024-03-01"), 31);
  assert.equal(ageAt("2026-10-06"), 33);
  assert.equal(partsTotal({ stocksUsd: 85116, bondsUsd: 0, cryptoUsd: 24858.53, cashUsd: 31296 }), 141270.53);
});

test("projectToGoal proyecta hasta cruzar 1M, ignorando endYear", () => {
  const cases: [number, string][] = [[0, "2046-03-01"], [1, "2041-03-01"], [2, "2040-03-01"], [3, "2038-03-01"], [4, "2050-03-01"], [5, "2039-03-01"]];
  for (const [i, date] of cases) {
    const pts = projectToGoal({ ...base, ...SCENARIOS[i] });
    const last = pts.at(-1)!;
    assert.equal(last.date, date, SCENARIOS[i].name);
    assert.ok(last.value >= GOAL && pts.at(-2)!.value < GOAL);
    assert.deepEqual(reachGoal(pts), last);
  }
});

test("projectToGoal: escenario que nunca llega corta en 2100 y reachGoal es null", () => {
  const pts = projectToGoal({ startYear: 2025, startValue: 1000, rate: 0, contribution: 0, bonusFactor: 0, bonusSchedule: [] });
  assert.equal(pts.at(-1)!.year, 2100);
  assert.equal(reachGoal(pts), null);
});

test("sortByGoal: primero el que llega antes a 1M; los que nunca llegan al final", () => {
  const never = { name: "nunca", startYear: 2025, startValue: 1000, rate: 0, contribution: 0, bonusFactor: 0, endYear: 2030, last: 0 };
  const sorted = sortByGoal([never, ...SCENARIOS].map((s) => ({ ...base, ...s })));
  assert.deepEqual(sorted.map((s) => s.name), [
    "MELI con bono", "MELI 18k + bono", "MELI sin bono", "15%", "10%", "MELI sin rendimiento", "nunca",
  ]);
});

test("sumContributions: últimos 12 meses en USD con fallback de tipo de cambio", () => {
  const rows = [
    { date: "2026-08-10", amountUsd: 1000, amountArs: 0, rate: null },
    { date: "2026-04-10", amountUsd: null, amountArs: 1500000, rate: 1500 },
    { date: "2026-01-10", amountUsd: null, amountArs: 300000, rate: null }, // sin cotización → se ignora
    { date: "2025-09-01", amountUsd: 5000, amountArs: 0, rate: null }, // fuera de los 12 meses
  ];
  assert.equal(sumContributions(rows, "2026-10-06"), 2000);
});
