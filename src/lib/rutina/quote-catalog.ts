/**
 * Katalog kutipan harian (data referensi aplikasi) — sumber acuan Rutina.
 *
 * Data ini diimpor otomatis ke tabel `Quote` saat tabel belum lengkap
 * (lihat GET /api/quote dan GET /api/home) dan oleh scripts/seed.ts —
 * sehingga kartu kutipan harian selalu terisi tanpa langkah manual,
 * di lingkungan mana pun (SQLite lokal maupun Turso).
 */

export type QuoteCatalogItem = {
  text: string;
  author: string;
};

export const QUOTE_CATALOG: QuoteCatalogItem[] = [
  { text: "Disiplin adalah jembatan antara tujuan dan pencapaian.", author: "Jim Rohn" },
  {
    text: "Kita adalah apa yang kita lakukan berulang-ulang. Keunggulan, maka, bukanlah tindakan melainkan kebiasaan.",
    author: "Aristoteles",
  },
  {
    text: "Jangan menyerah sebelum mencoba. Bertahanlah sedikit lebih lama dari rasa malasmu.",
    author: "Mario Teguh",
  },
  {
    text: "Pemuda yang berani dan keras kepala itulah yang kelak mengangkat derajat bangsanya.",
    author: "Soekarno",
  },
  {
    text: "Berhentilah mengeluh, mulailah bergerak. Hari terbaik adalah hari ketika kamu mulai.",
    author: "Buya Hamka",
  },
  {
    text: "Satu langkah kecil setiap hari lebih berharga daripada rencana besar yang tidak pernah dijalankan.",
    author: "Sahabat Rutina",
  },
  {
    text: "Waktu yang kamu investasikan pada dirimu sendiri tidak pernah sia-sia.",
    author: "Robin Sharma",
  },
  { text: "Pikiran yang tenang membawa kekuatan yang besar.", author: "Lao Tzu" },
  { text: "Kesehatan adalah mahkota atas segala pencapaian.", author: "Ungkapan Melayu" },
  {
    text: "Tumbuh itu tidak selalu terasa nyaman, dan rasa nyaman jarang membuatmu tumbuh.",
    author: "Anonim",
  },
];
