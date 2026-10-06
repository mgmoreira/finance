import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { goalScenarios } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseScenarioInput } from "@/lib/wealth-input";
import { getScenarios } from "@/lib/wealth-data";
import type { ScenarioParams } from "@/lib/goals";

function toRow(v: ScenarioParams) {
  return { ...v, bonusSchedule: JSON.stringify(v.bonusSchedule), visible: v.visible ? 1 : 0 };
}

export async function GET() {
  return NextResponse.json(await getScenarios());
}

export async function POST(request: NextRequest) {
  const parsed = parseScenarioInput(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const [row] = await db.insert(goalScenarios).values(toRow(parsed.value)).returning();
  return NextResponse.json(row, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const id = Number(body?.id);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const parsed = parseScenarioInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  await db.update(goalScenarios).set(toRow(parsed.value)).where(eq(goalScenarios.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await db.delete(goalScenarios).where(eq(goalScenarios.id, id));
  return NextResponse.json({ ok: true });
}
