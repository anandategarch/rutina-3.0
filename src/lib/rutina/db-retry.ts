/**
 * withDbRetry — lapisan ketahanan terhadap error SQLite yang transien.
 *
 * Konteks (audit E-B1): pada boot dingin di sandbox yang baru di-reset, GET
 * paralel (habits/home/stats/quote/…) pernah beradu dengan transaksi tulis
 * seeding di journal mode `delete` → SQLITE_BUSY "database is locked" → 500
 * "Gagal memuat kebiasaan". WAL + ensureBootData (boot.ts) menghilangkan
 * sumber utamanya; helper ini menyerap sisa jendela sempit (kontensi
 * lintas-proses, mis. `prisma db push` / skrip seed saat server melayani).
 *
 * Error yang dianggap transien:
 * - P2024 (timed out fetching connection dari pool)
 * - P1001/P1008 (koneksi gagal dibuka / melebihi batas waktu)
 * - P2034 (write conflict / kontensi transaksi)
 * - pesan SQLite BUSY/LOCKED pada driver
 */
export function isTransientDbError(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const { code, message } = e as { code?: string; message?: string };
  if (code === "P2024" || code === "P1001" || code === "P1008" || code === "P2034") {
    return true;
  }
  const m = (message ?? "").toLowerCase();
  return (
    m.includes("database is locked") ||
    m.includes("database table is locked") ||
    m.includes("sqlite_busy") ||
    m.includes("timed out fetching")
  );
}

/**
 * Jalankan `fn` dengan retry ber-backoff (default 3 percobaan: 0ms → ~120ms →
 * ~240ms + jitter). Error non-transien langsung dilempar — bug validasi atau
 * data korup tidak boleh disembunyikan di sini.
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseMs = 120
): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= attempts - 1 || !isTransientDbError(e)) throw e;
      await new Promise((r) => setTimeout(r, baseMs * 2 ** i + Math.random() * 80));
    }
  }
}
