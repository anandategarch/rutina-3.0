import { NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/danger/reset — hapus seluruh data aktivitas pengguna.
 * Tabel konten sistem (Quote) dan referensi (Profile, Exercise, FoodItem) dipertahankan.
 * Piala (Achievement) dipertahankan definisinya, namun status unlock di-reset
 * agar konsisten dengan data yang baru dikosongkan.
 */
export async function POST() {
  try {
    await db.habitLog.deleteMany({});
    await db.transaction.deleteMany({});
    await db.habit.deleteMany({});
    await db.workout.deleteMany({});
    await db.foodEntry.deleteMany({});
    await db.checkIn.deleteMany({});
    await db.bodyMetric.deleteMany({});
    await db.budget.deleteMany({});
    await db.savingsGoal.deleteMany({});
    await db.journalEntry.deleteMany({});
    await db.wallet.deleteMany({});
    await db.achievement.updateMany({ data: { unlockedAt: null } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("danger reset error", e);
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
  }
}
