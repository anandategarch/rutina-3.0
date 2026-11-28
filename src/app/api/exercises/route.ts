import { NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";
import { ensureBootData } from "@/lib/rutina/boot";

export const dynamic = "force-dynamic";

// GET /api/exercises → { exercises } library gerakan beban
//
// Katalog gerakan (data referensi aplikasi, bukan data pengguna) diimpor oleh
// ensureBootData (catalog-ensure.ts) — sekali per proses, berurutan, dengan
// guard P2002. Audit E-B1: fungsi ensure lokal yang dulu di sini bisa balapan
// createMany saat dua request pertama berbarengan → 500 "Gagal memuat library
// gerakan"; GET kini murni baca.
export async function GET() {
  try {
    await ensureBootData();
    const exercises = await db.exercise.findMany({
      orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
      take: 500, // audit B3-B4: batasi hasil query
    });
    return NextResponse.json({ exercises });
  } catch (e) {
    console.error("exercises GET error", e);
    return NextResponse.json({ error: "Gagal memuat library gerakan" }, { status: 500 });
  }
}
