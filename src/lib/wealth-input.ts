import type { ScenarioParams, WealthParts } from "./goals";

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
export type SnapshotInput = { date: string } & WealthParts;

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

function num(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// For form inputs: blank or non-numeric → null (so the server rejects it instead of storing 0)
export function numOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function isCutDate(date: string): boolean {
  return /^\d{4}-(03|09)-01$/.test(date);
}

export function parseSnapshotInput(body: unknown): Result<SnapshotInput> {
  if (!body || typeof body !== "object") return fail("Body inválido");
  const b = body as Record<string, unknown>;
  const date = typeof b.date === "string" ? b.date : "";
  if (!isCutDate(date)) return fail("La fecha tiene que ser 1/3 o 1/9 (YYYY-03-01 o YYYY-09-01)");

  const parts: WealthParts = { stocksUsd: 0, bondsUsd: 0, cryptoUsd: 0, cashUsd: 0 };
  const labels = { stocksUsd: "ACCIONES", bondsUsd: "BONOS", cryptoUsd: "CRYPTO", cashUsd: "CASH" } as const;
  for (const key of ["stocksUsd", "bondsUsd", "cryptoUsd", "cashUsd"] as const) {
    const raw = b[key];
    const n = raw === undefined ? 0 : num(raw);
    if (n === null || n < 0) return fail(`${labels[key]} tiene que ser un número >= 0`);
    parts[key] = n;
  }
  return { ok: true, value: { date, ...parts } };
}

export function parseScenarioInput(body: unknown): Result<ScenarioParams> {
  if (!body || typeof body !== "object") return fail("Body inválido");
  const b = body as Record<string, unknown>;

  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return fail("Falta el nombre");

  const startYear = num(b.startYear);
  if (startYear === null || !Number.isInteger(startYear) || startYear < 2000 || startYear > 2100) {
    return fail("Año inicial inválido");
  }
  const endYear = num(b.endYear);
  if (endYear === null || !Number.isInteger(endYear) || endYear < startYear || endYear > 2100) {
    return fail("El año final tiene que ser >= año inicial");
  }

  const startValue = num(b.startValue);
  if (startValue === null || startValue <= 0) return fail("El valor inicial tiene que ser > 0");

  const rate = num(b.rate);
  if (rate === null || rate <= -1 || rate > 1) return fail("Tasa inválida (fracción: 0.10 = 10%)");

  const contribution = num(b.contribution);
  if (contribution === null) return fail("Aporte inválido");

  const bonusFactor = b.bonusFactor === undefined ? 0 : num(b.bonusFactor);
  if (bonusFactor === null || bonusFactor < 0) return fail("Factor de bono inválido");

  const rawSchedule = b.bonusSchedule === undefined ? [] : b.bonusSchedule;
  if (!Array.isArray(rawSchedule)) return fail("Calendario de bono inválido");
  const bonusSchedule: number[] = [];
  for (const x of rawSchedule) {
    const n = num(x);
    if (n === null || n < 0) return fail("Calendario de bono inválido");
    bonusSchedule.push(n);
  }

  const color = typeof b.color === "string" && /^#[0-9a-fA-F]{6}$/.test(b.color) ? b.color : "#4a9eff";
  const visible = b.visible === undefined ? true : b.visible === true || b.visible === 1;
  const sortOrder = Math.trunc(num(b.sortOrder) ?? 0);

  return {
    ok: true,
    value: { name, startYear, startValue, rate, contribution, bonusFactor, bonusSchedule, endYear, color, visible, sortOrder },
  };
}
