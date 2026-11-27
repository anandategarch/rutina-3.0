import { NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";
import { EXERCISE_CATALOG } from "@/lib/rutina/exercise-catalog";

export const dynamic = "force-dynamic";

/**
 * Impor katalog gerakan (data kategori bugar) ke library.
 *
 * Katalog adalah data referensi aplikasi — bukan data pengguna — sehingga
 * tidak ikut backup/restore; cara ini membuat library gerakan selalu terisi
 * di lingkungan mana pun (SQLite lokal maupun Turso) tanpa langkah manual.
 *
 * Semantik top-up: hanya nama yang belum ada yang diimpor, sehingga DB lama
 * (dengan katalog versi awal) ikut naik ke katalog penuh, dan nama yang
 * sudah ada — beserta riwayat latihan yang merujuknya — tidak tersentuh.
 */
async function ensureExerciseCatalog(): Promise<number> {
  const existing = await db.exercise.findMany({ select: { name: true }, take: 1000 });
  const have = new Set(existing.map((e) => e.name.toLowerCase()));
  const missing = EXERCISE_CATALOG.filter((e) => !have.has(e.name.toLowerCase()));
  if (missing.length === 0) return 0;
  await db.exercise.createMany({
    data: missing.map((e) => ({ name: e.name, muscleGroup: e.muscleGroup, equipment: e.equipment })),
  });
  return missing.length;
}

// GET /api/exercises → { exercises } library gerakan beban
export async function GET() {
  try {
    const imported = await ensureExerciseCatalog();
    const exercises = await db.exercise.findMany({
      orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
      take: 500, // audit B3-B4: batasi hasil query
    });
    return NextResponse.json({ exercises, imported });
  } catch (e) {
    console.error("exercises GET error", e);
    return NextResponse.json({ error: "Gagal memuat library gerakan" }, { status: 500 });
  }
}
