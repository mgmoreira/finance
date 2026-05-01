import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { expenseCategories } from "@/db/schema";

export async function GET() {
  try {
    const categories = await db.select().from(expenseCategories);
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, color } = await request.json();

    if (!name || !color) {
      return NextResponse.json({ error: "Missing required fields: name, color" }, { status: 400 });
    }

    const [created] = await db.insert(expenseCategories).values({ name, color }).returning();
    return NextResponse.json(created);
  } catch (error) {
    console.error("Failed to create category:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
