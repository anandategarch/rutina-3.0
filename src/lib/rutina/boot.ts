import { db } from "@/lib/db";
import { withDbRetry } from "@/lib/rutina/db-retry";
import {
  ensureAchievementCatalog,
  ensureExerciseCatalog,
  ensureFoodCatalog,
  ensureQuoteCatalog,
  isP2002,
} from "@/lib/rutina/catalog-ensure";

/**
 * ensureBootData — satu gerbang untuk semua penulisan boot pertama.
 *
 * Akar masalah "Gagal memuat kebiasaan" (audit E-B1): pada DB yang baru
 * (hasil reset sandbox / db push), tiap GET paralel pertama meng-seed sendiri
 * (profile.upsert di /api/home & /api/profile, createMany katalog di
 * /api/stats, /api/quote, /api/exercises, /api/food-items) di journal mode
 * `delete` — penulis memblokir pembaca → SQLITE_BUSY → 500 di route yang
 * sepenuhnya read-only seperti /api/habits.
 *
 * Desain perbaikan:
 * 1. Satu promise singleton per proses (di globalThis — kebal HMR Next dev)
 *    yang di-await oleh SEMUA route GET. Request pertama menjalankan seeding,
 *    request paralel lain hanya menunggu — tidak ada lagi tulisan balapan.
 * 2. Semua langkah seeding BERURUTAN (satu penulis pada satu waktu) dan
 *    dibungkus withDbRetry untuk menyerap sisa kontensi transien.
 * 3. WAL dipasang sekali per boot (persisten di header file DB): pembaca
 *    tidak pernah diblokir penulis lagi. Di-bypass bila memakai Turso.
 * 4. GET tidak lagi menulis apa pun — jalur GET murni baca.
 *
 * Kegagalan sungguhan (mis. file DB korup) menghapus singleton sehingga
 * request berikutnya mencoba lagi — tidak ada status "mati permanen".
 */

/** Profil default — mirror default kolom di prisma/schema.prisma. */
export const DEFAULT_PROFILE = {
  id: "main",
  name: "Sahabat Rutina",
  identityVoice: "Aku adalah orang yang konsisten, disiplin, dan tumbuh setiap hari.",
  dailyMissionTarget: 4,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

/**
 * WAL persisten: journal_mode tersimpan di header file DB, jadi sekali
 * terpasang semua koneksi berikutnya (pool Prisma termasuk) otomatis WAL.
 * Idempoten — PRAGMA pada DB yang sudah WAL cuma mengembalikan "wal".
 */
async function enableWalIfLocalSqlite(): Promise<void> {
  if (process.env.TURSO_DATABASE_URL) return; // Turso mengelola konkurensi sendiri
  try {
    await db.$queryRawUnsafe("PRAGMA journal_mode=WAL");
  } catch {
    // Bukan fatal — jalur utama tetap benar lewat PRAGMA eksternal sekali.
  }
}

async function runBootData(): Promise<void> {
  await enableWalIfLocalSqlite();

  // Profil default: create-if-missing. P2002 berarti request/proses lain
  // lebih dulu membuatnya — bukan error. (Menggantikan profile.upsert yang
  // membuka transaksi tulis BEGIN IMMEDIATE di SETIAP GET /api/home.)
  await withDbRetry(async () => {
    try {
      await db.profile.create({ data: { id: "main" } });
    } catch (e) {
      if (!isP2002(e)) throw e;
    }
  });

  // Katalog referensi — berurutan, tidak pernah balapan antar request.
  await withDbRetry(ensureQuoteCatalog);
  await withDbRetry(ensureFoodCatalog);
  await withDbRetry(ensureAchievementCatalog);
  await withDbRetry(ensureExerciseCatalog);
}

const g = globalThis as unknown as { __rutinaBoot?: Promise<void> };

/** Await di awal SETIAP route GET — murah setelah boot pertama (memoized). */
export function ensureBootData(): Promise<void> {
  g.__rutinaBoot ??= runBootData().catch((e) => {
    g.__rutinaBoot = undefined; // gagal sungguhan → boleh dicoba lagi nanti
    throw e;
  });
  return g.__rutinaBoot;
}

/**
 * Baca profil untuk kebutuhan GET — selalu ada nilainya (tidak pernah null,
 * tidak pernah menulis). Dipakai /api/home dan /api/profile.
 */
export async function getProfile() {
  await ensureBootData();
  const profile = await db.profile.findUnique({ where: { id: "main" } });
  return profile ?? DEFAULT_PROFILE;
}
