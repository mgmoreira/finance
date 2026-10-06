import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addYears, addDays, quantityAt, defaultWithholding, candidateEvents, buildDividendSummary, capitalForIncome,
  type DivSource, type DivTxn, type DivHolding,
} from "./dividends";

const TODAY = "2026-10-06";
const r2 = (n: number) => Math.round(n * 100) / 100;

test("addYears maneja 29/02 y addDays cruza meses", () => {
  assert.equal(addYears("2028-02-29", 1), "2029-02-28");
  assert.equal(addYears("2026-09-04", 1), "2027-09-04");
  assert.equal(addDays("2026-09-30", 1), "2026-10-01");
});

test("quantityAt cuenta solo operaciones anteriores a la fecha de corte", () => {
  const txns: DivTxn[] = [
    { ticker: "X", type: "BUY", quantity: 100, date: "2026-01-10" },
    { ticker: "X", type: "BUY", quantity: 50, date: "2026-09-04" }, // mismo día del corte: no cobra
    { ticker: "X", type: "SELL", quantity: 30, date: "2026-05-01" },
    { ticker: "Y", type: "BUY", quantity: 999, date: "2026-01-01" },
  ];
  assert.equal(quantityAt(txns, "X", "2026-09-04"), 70);
  assert.equal(quantityAt(txns, "X", "2026-01-10"), 0);
});

test("defaultWithholding por ticker y país", () => {
  assert.equal(defaultWithholding("PEP", "EEUU"), 35);
  assert.equal(defaultWithholding("VALE", "BRASIL"), 25);
  assert.equal(defaultWithholding("EWZ", "BRASIL"), 35);
  assert.equal(defaultWithholding("ASML", "EUROPA"), 20);
  assert.equal(defaultWithholding("TGS", "ARG"), 7);
  assert.equal(defaultWithholding("ZZZ", "LATINO"), 35);
});

const pep: DivSource = { ticker: "PEP", events: [{ exDate: "2026-09-04", amount: 1.48 }], nextExDate: null, nextPayDate: null, payLagDays: 26 };
const unh: DivSource = { ticker: "UNH", events: [{ exDate: "2026-09-14", amount: 2.32 }], nextExDate: null, nextPayDate: null, payLagDays: 8 };
const pbr: DivSource = { ticker: "PBR", events: [{ exDate: "2026-08-25", amount: 0.53 }], nextExDate: null, nextPayDate: null, payLagDays: 126 };
const txns: DivTxn[] = [
  { ticker: "PEP", type: "BUY", quantity: 305, date: "2025-01-01" },
  { ticker: "UNH", type: "BUY", quantity: 293, date: "2025-01-01" },
  { ticker: "PBR", type: "BUY", quantity: 107, date: "2025-01-01" },
];
const holdings: DivHolding[] = [
  { ticker: "PEP", quantity: 305, parity: 18, stockPriceUsd: 125.77, withholdingPct: 35 },
  { ticker: "UNH", quantity: 293, parity: 33, stockPriceUsd: 375.22, withholdingPct: 35 },
  { ticker: "PBR", quantity: 107, parity: 1, stockPriceUsd: 23.97, withholdingPct: 25 },
];

test("reproduce los cobros reales: PEP 1/10 ≈ 16,27 y UNH 23/9 ≈ 13,37", () => {
  const s = buildDividendSummary([pep, unh], holdings, txns, 50000, TODAY);
  const p = s.paid.find((x) => x.ticker === "PEP")!;
  assert.equal(p.payDate, "2026-10-01");
  assert.equal(r2(p.gross), 25.08);
  assert.equal(r2(p.net), 16.3);
  const u = s.paid.find((x) => x.ticker === "UNH")!;
  assert.equal(u.payDate, "2026-09-23");
  assert.equal(r2(u.net), 13.39);
});

test("PBR: corte en agosto, pago en diciembre → cuenta como próximo, con la cantidad al corte", () => {
  const s = buildDividendSummary([pbr], holdings, txns, 50000, TODAY);
  const p = s.upcoming.find((x) => x.exDate === "2026-08-25")!;
  assert.equal(p.payDate, "2026-12-30");
  assert.equal(p.cedears, 107);
  assert.equal(r2(p.gross), 56.71);
  assert.equal(s.paid.length, 0);
});

test("proyección: repite el último año y la fecha confirmada reemplaza a la proyectada", () => {
  const msft: DivSource = {
    ticker: "MSFT",
    events: [{ exDate: "2025-11-20", amount: 0.91 }, { exDate: "2026-02-19", amount: 0.91 }],
    nextExDate: "2026-11-19", nextPayDate: "2026-12-10", payLagDays: 21,
  };
  const c = candidateEvents(msft, TODAY);
  const future = c.filter((x) => x.exDate > TODAY).map((x) => x.exDate).sort();
  assert.deepEqual(future, ["2026-11-19", "2027-02-19"]);
  const confirmed = c.find((x) => x.exDate === "2026-11-19")!;
  assert.equal(confirmed.usPayDate, "2026-12-10");
  assert.equal(confirmed.dateConfirmed, true);
  assert.equal(confirmed.amountEstimated, true);
});

test("resumen: totales, rendimiento, por mes, % por acción", () => {
  const s = buildDividendSummary([pep, unh, pbr], holdings, txns, 50000, TODAY);
  assert.equal(r2(s.last12Net), r2(16.3 + 13.39 + 0));
  assert.ok(s.next12Net > 0);
  assert.equal(r2(s.netYieldPct), r2((s.next12Net / 50000) * 100));
  assert.equal(s.byMonth[0].month, "2026-10");
  assert.equal(r2(s.byMonth.reduce((a, m) => a + m.net, 0)), r2(s.next12Net));
  const total = s.tickers.reduce((a, t) => a + t.sharePct, 0);
  assert.ok(Math.abs(total - 100) < 0.01);
  const t = s.tickers.find((x) => x.ticker === "PEP")!;
  assert.equal(r2(t.grossYieldPct), r2((1.48 / 125.77) * 100));
});

test("vendida antes del corte → no genera pago", () => {
  const sold: DivTxn[] = [...txns, { ticker: "PEP", type: "SELL", quantity: 305, date: "2026-08-01" }];
  const s = buildDividendSummary([pep], holdings, sold, 50000, TODAY);
  assert.equal(s.paid.length, 0);
});

test("capitalForIncome", () => {
  assert.equal(capitalForIncome(1000, 2), 50000);
  assert.equal(capitalForIncome(1000, 0), null);
});

test("fecha de pago vieja de Yahoo (anterior al corte) se ignora: el pago sigue siendo próximo", () => {
  const src: DivSource = {
    ticker: "PEP",
    events: [{ exDate: "2025-10-08", amount: 1.42 }],
    nextExDate: "2026-10-09", nextPayDate: "2026-08-01", payLagDays: 26,
  };
  const c = candidateEvents(src, TODAY).find((x) => x.exDate === "2026-10-09")!;
  assert.equal(c.usPayDate, "2026-11-04");
  assert.equal(c.dateConfirmed, false);
  const s = buildDividendSummary([src], holdings, txns, 50000, TODAY);
  assert.ok(s.upcoming.some((p) => p.exDate === "2026-10-09"));
  assert.ok(!s.paid.some((p) => p.exDate === "2026-10-09"));
});
