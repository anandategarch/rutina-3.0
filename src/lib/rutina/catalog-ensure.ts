import { db } from "@/lib/db";
import { QUOTE_CATALOG } from "@/lib/rutina/quote-catalog";
import { FOOD_CATALOG } from "@/lib/rutina/food-catalog";
import { ACHIEVEMENT_CATALOG } from "@/lib/rutina/achievement-catalog";

/**
 * Top-up katalog referensi aplikasi (satu pola dengan ensureExerciseCatalog
 * di GET /api/exercises).
 *
 * Katalog adalah data referensi aplikasi — bukan data pengguna — sehingga
 * tidak ikut backup/restore; cara ini membuat kutipan harian, saran makanan,
 * dan definisi piala selalu terisi di lingkungan mana pun (SQLite lokal
 * maupun Turso) tanpa langkah manual.
 *
 * Semantik top-up: hanya baris yang belum ada (nama/teks/kunci) yang
 * diimpor — item buatan pengguna dan status piala yang sudah ada tidak
 * tersentuh. Murah: satu COUNT dulu; query lanjutan hanya bila katalog
 * belum lengkap.
 */

export async function ensureQuoteCatalog(): Promise<number> {
  const count = await db.quote.count();
  if (count >= QUOTE_CATALOG.length) return 0;
  const existing = await db.quote.findMany({ select: { text: true } });
  const have = new Set(existing.map((q) => q.text.toLowerCase()));
  const missing = QUOTE_CATALOG.filter((q) => !have.has(q.text.toLowerCase()));
  if (missing.length === 0) return 0;
  // audit D-M6: dua request bersamaan bisa lolos check-then-create → P2002.
  // skipDuplicates membuat top-up idempoten tanpa try/catch (SQLite didukung).
  await db.quote.createMany({ data: missing, skipDuplicates: true });
  return missing.length;
}

export async function ensureFoodCatalog(): Promise<number> {
  const count = await db.foodItem.count();
  if (count >= FOOD_CATALOG.length) return 0;
  const existing = await db.foodItem.findMany({ select: { name: true } });
  const have = new Set(existing.map((f) => f.name.toLowerCase()));
  const missing = FOOD_CATALOG.filter((f) => !have.has(f.name.toLowerCase()));
  if (missing.length === 0) return 0;
  // audit D-M6: idempoten terhadap race (lihat ensureQuoteCatalog).
  // CATATAN: FoodItem.name belum @unique — skipDuplicates hanya menahan
  // duplikasi antar-baris payload yang sama; race lintar-request masih bisa
  // menyisip dua kali bila filter `have` dihitung sebelum insert lawan.
  // Kolisi P2002 tertangkap di bawah agar /api/stats tetap hidup.
  try {
    await db.foodItem.createMany({ data: missing, skipDuplicates: true });
  } catch (e) {
    if (!isP2002(e)) throw e;
  }
  return missing.length;
}

export async function ensureAchievementCatalog(): Promise<number> {
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
      skipDuplicates: true,
    });
  } catch (e) {
    if (!isP2002(e)) throw e;
  }
  return missing.length;
}

/** Prisma unique-constraint violation → race antar request, anggap sukses. */
function isP2002(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: string }).code === "P2002"
  );
}
