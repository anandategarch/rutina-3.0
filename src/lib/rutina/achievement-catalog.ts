/**
 * Katalog piala/prestasi (data referensi aplikasi) — sumber acuan Rutina.
 *
 * Definisi ini diimpor otomatis ke tabel `Achievement` saat katalog belum
 * lengkap (lihat GET /api/stats) dan oleh scripts/seed.ts — sehingga
 * "Koleksi Piala" di layar Statistik selalu punya definisi lengkap tanpa
 * langkah manual, di lingkungan mana pun (SQLite lokal maupun Turso).
 *
 * `unlockedAt` TIDAK ikut katalog — status terbuka adalah progres pengguna
 * (di-seed demo oleh scripts/seed.ts, dipulihkan dari cadangan oleh
 * POST /api/import), definisi katalog selalu terkunci (null).
 */

export type AchievementCatalogItem = {
  key: string;
  title: string;
  description: string;
  icon: string;
};

export const ACHIEVEMENT_CATALOG: AchievementCatalogItem[] = [
  {
    key: "first-habit",
    title: "Langkah Pertama",
    description: "Ciptakan kebiasaan pertamamu di Taman.",
    icon: "sprout",
  },
  {
    key: "streak-7",
    title: "Api Menyala — 7 Hari",
    description: "Jaga satu kebiasaan tanpa putus selama 7 hari.",
    icon: "flame",
  },
  {
    key: "workout-10",
    title: "10 Sesi Latihan",
    description: "Selesaikan 10 sesi olahraga tercatat.",
    icon: "dumbbell",
  },
  {
    key: "xp-500",
    title: "500 XP Terkumpul",
    description: "Kumpulkan 500 XP dari seluruh aktivitas.",
    icon: "medal",
  },
  {
    key: "journal-5",
    title: "Sang Penulis — 5 Entri",
    description: "Tulis 5 entri jurnal di Ruang Tulis.",
    icon: "pen-line",
  },
  {
    key: "saver-1jt",
    title: "Menabung Rp1 Juta",
    description: "Total setoran tabungan mencapai Rp1 juta.",
    icon: "piggy-bank",
  },
  {
    key: "streak-30",
    title: "Streak 30 Hari",
    description: "Pertahankan kebiasaan selama satu bulan penuh.",
    icon: "trophy",
  },
  {
    key: "habit-master",
    title: "Master Kebiasaan",
    description: "Selesaikan 100 hari total untuk semua kebiasaan.",
    icon: "crown",
  },
  {
    key: "checkin-30",
    title: "30 Hari Rajin Check-in",
    description: "Isi check-in harian selama 30 hari berturut-turut.",
    icon: "heart-pulse",
  },
];
