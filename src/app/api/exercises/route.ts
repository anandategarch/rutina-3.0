import { NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";

export const dynamic = "force-dynamic";

// GET /api/exercises → { exercises } library gerakan beban
export async function GET() {
  try {
    const exercises = await db.exercise.findMany({
      orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ exercises });
  } catch (e) {
    console.error("exercises GET error", e);
    return NextResponse.json({ error: "Gagal memuat library gerakan" }, { status: 500 });
  }
}
