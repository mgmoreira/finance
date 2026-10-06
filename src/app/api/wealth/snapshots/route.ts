import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { wealthSnapshots } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseSnapshotInput } from "@/lib/wealth-input";

// PUT — create or edit the cut for a date (always marks it manual)
export async function PUT(request: NextRequest) {
  const parsed = parseSnapshotInput(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { date, stocksUsd, bondsUsd, cryptoUsd, cashUsd } = parsed.value;
  const now = new Date().toISOString();
  await db
    .insert(wealthSnapshots)
    .values({ date, stocksUsd, bondsUsd, cryptoUsd, cashUsd, source: "manual", updatedAt: now })
    .onConflictDoUpdate({
      target: wealthSnapshots.date,
      set: { stocksUsd, bondsUsd, cryptoUsd, cashUsd, source: "manual", updatedAt: now },
    });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await db.delete(wealthSnapshots).where(eq(wealthSnapshots.id, id));
  return NextResponse.json({ ok: true });
}
