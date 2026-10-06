import { test } from "node:test";
import assert from "node:assert/strict";
import { isCutDate, parseSnapshotInput, parseScenarioInput, numOrNull } from "./wealth-input";

test("isCutDate solo acepta 1/3 y 1/9", () => {
  assert.equal(isCutDate("2027-03-01"), true);
  assert.equal(isCutDate("2027-09-01"), true);
  assert.equal(isCutDate("2027-03-02"), false);
  assert.equal(isCutDate("2027-06-01"), false);
  assert.equal(isCutDate("01/03/2027"), false);
});

test("parseSnapshotInput acepta números y strings numéricos; clave ausente = 0", () => {
  const r = parseSnapshotInput({ date: "2027-03-01", stocksUsd: "90000", cryptoUsd: 25000.5, cashUsd: 0 });
  assert.deepEqual(r, { ok: true, value: { date: "2027-03-01", stocksUsd: 90000, bondsUsd: 0, cryptoUsd: 25000.5, cashUsd: 0 } });
});

test("parseSnapshotInput rechaza fecha inválida, negativos y texto", () => {
  assert.equal(parseSnapshotInput({ date: "2027-04-01", stocksUsd: 1 }).ok, false);
  assert.equal(parseSnapshotInput({ date: "2027-03-01", stocksUsd: -5 }).ok, false);
  assert.equal(parseSnapshotInput({ date: "2027-03-01", cashUsd: "mucho" }).ok, false);
  assert.equal(parseSnapshotInput(null).ok, false);
  const r = parseSnapshotInput({ date: "2027-04-01" });
  assert.ok(!r.ok && r.error.includes("1/3"));
});

const valid = {
  name: "MELI con bono", startYear: 2025, startValue: 108000, rate: 0.1, contribution: 25000,
  bonusFactor: 0.67, bonusSchedule: [3333, 6666], endYear: 2041, color: "#e8a317", visible: false, sortOrder: 3,
};

test("parseScenarioInput acepta un escenario válido", () => {
  assert.deepEqual(parseScenarioInput(valid), { ok: true, value: valid });
});

test("parseScenarioInput aplica defaults de color/visible/bono/orden", () => {
  const r = parseScenarioInput({ name: " X ", startYear: 2025, startValue: 1, rate: 0, contribution: 0, endYear: 2030 });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.name, "X");
    assert.equal(r.value.color, "#4a9eff");
    assert.equal(r.value.visible, true);
    assert.deepEqual(r.value.bonusSchedule, []);
    assert.equal(r.value.bonusFactor, 0);
    assert.equal(r.value.sortOrder, 0);
  }
});

test("parseScenarioInput rechaza tasa en porcentaje, años invertidos, nombre vacío y bono no numérico", () => {
  assert.equal(parseScenarioInput({ ...valid, rate: 10 }).ok, false);
  assert.equal(parseScenarioInput({ ...valid, endYear: 2020 }).ok, false);
  assert.equal(parseScenarioInput({ ...valid, name: "  " }).ok, false);
  assert.equal(parseScenarioInput({ ...valid, bonusSchedule: [1, null] }).ok, false);
  assert.equal(parseScenarioInput({ ...valid, startYear: 2025.5 }).ok, false);
});

test("parseSnapshotInput rechaza campos vacíos (input borrado o tipeo inválido) con nombre legible", () => {
  const r = parseSnapshotInput({ date: "2026-09-01", stocksUsd: "85116", bondsUsd: "", cryptoUsd: "1", cashUsd: "1" });
  assert.ok(!r.ok && r.error.includes("BONOS"));
  assert.equal(parseSnapshotInput({ date: "2026-09-01", stocksUsd: "85.116,5", bondsUsd: "0", cryptoUsd: "0", cashUsd: "0" }).ok, false);
});

test("parseScenarioInput rechaza valor inicial vacío/null o <= 0", () => {
  assert.equal(parseScenarioInput({ ...valid, startValue: null }).ok, false);
  assert.equal(parseScenarioInput({ ...valid, startValue: 0 }).ok, false);
});

test("numOrNull: vacío o inválido → null, número → número", () => {
  assert.equal(numOrNull(""), null);
  assert.equal(numOrNull("  "), null);
  assert.equal(numOrNull("abc"), null);
  assert.equal(numOrNull("12.5"), 12.5);
  assert.equal(numOrNull("0"), 0);
});
