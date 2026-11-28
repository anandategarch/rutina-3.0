import { NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";
import { withDbRetry } from "@/lib/rutina/db-retry";

export const dynamic = "force-dynamic";

/**
 * POST /api/danger/reset — hapus seluruh data aktivitas pengguna.
 * Wajib konfirmasi eksplisit `{ confirm: "RESET RUTINA" }`.
 * (audit B1-Medium, diperbarui audit G) cek same-origin lokal dihapus — gate
 * CSRF kini di src/proxy.ts (konvensi Next.js 16), ditambah gerbang destruktif
 * `x-rutina-client` untuk /api/danger/* dan /api/import.
 * Tabel konten sistem (Quote) dan referensi (Profile, Exercise, FoodItem) dipertahankan.
 * Piala (Achievement) dipertahankan definisinya, namun status unlock di-reset
 * agar konsisten dengan data yang baru dikosongkan.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || body.confirm !== "RESET RUTINA") {
      return NextResponse.json(
        { error: "Ketik RESET RUTINA untuk konfirmasi" },
        { status: 400 }
      );
    }

    // audit 3-a#2: transaksi reset rawan P2034/SQLITE_BUSY bila penulis lain
    // berjalan bersamaan — withDbRetry menyerap konflik transien.
    await withDbRetry(() =>
      db.$transaction([
      db.habitLog.deleteMany({}),
      db.transaction.deleteMany({}),
      db.habit.deleteMany({}),
      db.workout.deleteMany({}),
      db.foodEntry.deleteMany({}),
      db.checkIn.deleteMany({}),
      db.bodyMetric.deleteMany({}),
      db.budget.deleteMany({}),
      db.savingsGoal.deleteMany({}),
      db.journalEntry.deleteMany({}),
      db.wallet.deleteMany({}),
      db.achievement.updateMany({ data: { unlockedAt: null } }),
    ]));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("danger reset error", e);
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
  }
}
