import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/rutina/server";
import { jakartaToday, isValidDateStr } from "@/lib/rutina/format";

export const dynamic = "force-dynamic";

/**
 * POST /api/habits/[id]/check { date, value? }
 * Toggle check-in kebiasaan pada tanggal tertentu.
 * - Habit biasa: create log done / hapus log (toggle).
 * - Habit terukur: jika value dikirim (number atau numeric string), buat/update log
 *   dengan value tsb — bukan toggle; toggle tetap berlaku bila value tidak dikirim.
 * - Double-tap aman: race create ditangkap via P2002 → dihapus (toggle kedua).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
    }
    const date = isValidDateStr(body.date) ? body.date : jakartaToday();

    const habit = await db.habit.findUnique({ where: { id } });
    if (!habit) return NextResponse.json({ error: "Kebiasaan tidak ditemukan" }, { status: 404 });
    if (habit.archived) {
      return NextResponse.json({ error: "Kebiasaan sudah diarsipkan" }, { status: 400 });
    }

    // Coerce value: number atau numeric string → nilai terukur yang valid (> 0)
    const v = Number(body.value);
    const hasMeasuredValue =
      body.value !== undefined &&
      body.value !== null &&
      body.value !== "" &&
      Number.isFinite(v) &&
      v > 0;

    const existing = await db.habitLog.findUnique({ where: { habitId_date: { habitId: id, date } } });

    if (existing) {
      // Habit terukur + value valid → update nilai (bukan toggle hapus)
      if (habit.unitTarget !== null && hasMeasuredValue) {
        try {
          const log = await db.habitLog.update({
            where: { id: existing.id },
            data: { value: v, status: "done" },
          });
          return NextResponse.json({ log });
        } catch (err) {
          // Log sudah dihapus request lain saat balapan → anggap toggle
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
            return NextResponse.json({ log: null });
          }
          throw err;
        }
      }
      // deleteMany: tidak melempar P2025 bila baris sudah dihapus request lain
      await db.habitLog.deleteMany({ where: { habitId: id, date } });
      return NextResponse.json({ log: null });
    }

    const value = habit.unitTarget !== null ? (hasMeasuredValue ? v : habit.unitTarget) : null;

    try {
      const log = await db.habitLog.create({
        data: { habitId: id, date, status: "done", value },
      });
      return NextResponse.json({ log });
    } catch (err) {
      // Balapan double-tap: log sudah dibuat request lain → toggle kedua (hapus)
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        await db.habitLog.deleteMany({ where: { habitId: id, date } });
        return NextResponse.json({ log: null });
      }
      throw err;
    }
  } catch (e) {
    console.error("habit check error", e);
    return NextResponse.json({ error: "Gagal mencatat kebiasaan" }, { status: 500 });
  }
}
