import { db } from "@/lib/db";
import { QUOTE_CATALOG } from "@/lib/rutina/quote-catalog";
import { FOOD_CATALOG } from "@/lib/rutina/food-catalog";
import { ACHIEVEMENT_CATALOG } from "@/lib/rutina/achievement-catalog";
import { EXERCISE_CATALOG } from "@/lib/rutina/exercise-catalog";

/**
 * Top-up katalog referensi aplikasi (satu pola untuk semua katalog).
 *
 * Katalog adalah data referensi aplikasi — bukan data pengguna — sehingga
 * tidak ikut backup/restore; cara ini membuat kutipan harian, saran makanan,
 * definisi piala, dan library gerakan selalu terisi di lingkungan mana pun
 * (SQLite lokal maupun Turso) tanpa langkah manual.
 *
 * Semantik top-up: hanya baris yang belum ada (nama/teks/kunci) yang
 * diimpor — item buatan pengguna dan status piala yang sudah ada tidak
 * tersentuh. Murah: satu COUNT dulu; query lanjutan hanya bila katalog
 * belum lengkap.
 *
 * Single-flight (audit E-B1): memo globalThis memastikan tiap ensure hanya
 * berjalan SEKALI per proses — request GET paralel yang memanggil ensure
 * yang sama menunggu promise yang sama alih-alih balapan count-then-create.
 * Memo di globalThis (bukan modul) agar tidak hilang saat HMR Next dev
 * membuat ulang modul. Kegagalan sungguhan menghapus memo agar bisa dicoba
 * ulang oleh request berikutnya.
 */
const g = globalThis as unknown as {
  __rutinaEnsureMemo?: Map<string, Promise<number>>;
};
const memo = (g.__rutinaEnsureMemo ??= new Map<string, Promise<number>>());

function once(key: string, fn: () => Promise<number>): Promise<number> {
  let p = memo.get(key);
  if (!p) {
    p = fn().catch((e) => {
      memo.delete(key);
      throw e;
    });
    memo.set(key, p);
  }
  return p;
}

export async function ensureQuoteCatalog(): Promise<number> {
  return once("quote", async () => {
    const count = await db.quote.count();
    if (count >= QUOTE_CATALOG.length) return 0;
    const existing = await db.quote.findMany({ select: { text: true } });
    const have = new Set(existing.map((q) => q.text.toLowerCase()));
    const missing = QUOTE_CATALOG.filter((q) => !have.has(q.text.toLowerCase()));
    if (missing.length === 0) return 0;
    // audit D-M6: dua request bersamaan bisa lolos check-then-create → P2002.
    // Quote.text @unique — kolisi race tertangkap sebagai sukses.
    try {
      await db.quote.createMany({ data: missing });
    } catch (e) {
      if (!isP2002(e)) throw e;
    }
    return missing.length;
  });
}

export async function ensureFoodCatalog(): Promise<number> {
  return once("food", async () => {
    const count = await db.foodItem.count();
    if (count >= FOOD_CATALOG.length) return 0;
    const existing = await db.foodItem.findMany({ select: { name: true } });
    const have = new Set(existing.map((f) => f.name.toLowerCase()));
    const missing = FOOD_CATALOG.filter((f) => !have.has(f.name.toLowerCase()));
    if (missing.length === 0) return 0;
    // audit D-M6: idempoten terhadap race — FoodItem.name belum @unique (item
    // buatan pengguna boleh bernama sama dengan katalog); dengan single-flight
    // once() di atas, duplikasi lintar-request kini mustahil dalam satu proses.
    try {
      await db.foodItem.createMany({ data: missing });
    } catch (e) {
      if (!isP2002(e)) throw e;
    }
    return missing.length;
  });
}

export async function ensureAchievementCatalog(): Promise<number> {
  return once("achievement", async () => {
    const count = await db.achievement.count();
    if (count >= ACHIEVEMENT_CATALOG.length) return 0;
    const existing = await db.achievement.findMany({ select: { key: true } });
    const have = new Set(existing.map((a) => a.key));
    const missing = ACHIEVEMENT_CATALOG.filter((a) => !have.has(a.key));
    if (missing.length === 0) return 0;
    // Definisi katalog selalu terkunci — status terbuka adalah progres pengguna.
    // audit D-M6: Achievement.key @unique — dua GET stats bersamaan tanpa
    // guard ini melempar P2002 → 500 "Gagal memuat statistik" di buka pertama.
    try {
      await db.achievement.createMany({
        data: missing.map((a) => ({ ...a, unlockedAt: null })),
      });
    } catch (e) {
      if (!isP2002(e)) throw e;
    }
    return missing.length;
  });
}

/**
 * Library gerakan beban — dulunya fungsi lokal di GET /api/exercises.
 * Audit E-B1: dipindah ke sini (satu pola dengan katalog lain) plus guard
 * P2002 — Exercise.name @unique dan createMany tanpa guard bisa 500
 * "Gagal memuat library gerakan" saat dua request pertama berbarengan.
 */
export async function ensureExerciseCatalog(): Promise<number> {
  return once("exercise", async () => {
    const existing = await db.exercise.findMany({ select: { name: true }, take: 1000 });
    const have = new Set(existing.map((e) => e.name.toLowerCase()));
    const missing = EXERCISE_CATALOG.filter((e) => !have.has(e.name.toLowerCase()));
    if (missing.length === 0) return 0;
    try {
      await db.exercise.createMany({
        data: missing.map((e) => ({
          name: e.name,
          muscleGroup: e.muscleGroup,
          equipment: e.equipment,
        })),
      });
    } catch (e) {
      if (!isP2002(e)) throw e;
    }
    return missing.length;
  });
}

/** Prisma unique-constraint violation → race antar request, anggap sukses. */
export function isP2002(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: string }).code === "P2002"
  );
}

/** Prisma "record not found" (mis. race delete) → pemanggil memetakan ke 404. */
export function isP2025(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: string }).code === "P2025"
  );
}
