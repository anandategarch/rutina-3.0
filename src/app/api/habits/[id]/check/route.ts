import { NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/habits/[id]/check { date, value? }
 * Toggle check-in kebiasaan pada tanggal tertentu.
 * - Habit biasa: create log done / hapus log (toggle).
 * - Habit terukur: jika value dikirim, buat log dengan value tsb;
 *   toggle tetap berlaku bila log sudah ada.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const date: string = typeof body.date === "string" ? body.date : new Date().toISOString().slice(0, 10);

    const habit = await db.habit.findUnique({ where: { id } });
    if (!habit) return NextResponse.json({ error: "Kebiasaan tidak ditemukan" }, { status: 404 });

    const existing = await db.habitLog.findUnique({ where: { habitId_date: { habitId: id, date } } });

    if (existing) {
      // Jika habit terukur dan ada value lebih tinggi, update nilai; else toggle hapus
      if (
        habit.unitTarget !== null &&
        typeof body.value === "number" &&
        body.value > 0 &&
        (existing.value ?? 0) < body.value
      ) {
        const log = await db.habitLog.update({ where: { id: existing.id }, data: { value: body.value, status: "done" } });
        return NextResponse.json({ log });
      }
      await db.habitLog.delete({ where: { id: existing.id } });
      return NextResponse.json({ log: null });
    }

    const value =
      habit.unitTarget !== null
        ? typeof body.value === "number" && body.value > 0
          ? body.value
          : habit.unitTarget
        : null;

    const log = await db.habitLog.create({
      data: { habitId: id, date, status: "done", value },
    });
    return NextResponse.json({ log });
  } catch (e) {
    console.error("habit check error", e);
    return NextResponse.json({ error: "Gagal mencatat kebiasaan" }, { status: 500 });
  }
}
