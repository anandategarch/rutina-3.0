import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/rutina/server";
import { addDays, dayOfWeek, jakartaToday, isValidDateStr } from "@/lib/rutina/format";

export const dynamic = "force-dynamic";

/**
 * Rumah Kaca — pelindung runtun dari satu hari bolong karena lupa.
 * Kuota: 1 pemakaian per habit per 7 hari berjalan (dihitung dari createdAt
 * pelindung, bukan tanggal yang dilindungi, agar tidak bisa menumpuk kuota
 * dengan membackdate). Hari hari ini tidak pernah berpelindung — masih ada
 * grace alami sampai tengah malam WIB.
 */

// Kuota pelindung per habit dalam jendela 7 hari berjalan
const SHIELD_WINDOW_DAYS = 7;
const SHIELD_LIMIT_PER_WINDOW = 1;

/**
 * POST /api/habits/[id]/shield { date }
 * Lindungi satu hari terjadwal yang bolong (date < hari ini WIB):
 * - harus benar-benar terjadwal (daily / daysOfWeek)
 * - belum tercatat selesai
 * - belum berpelindung
 * - kuota 1 per 7 hari berjalan belum habis
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
    }

    const today = jakartaToday();
    const date = typeof body.date === "string" && isValidDateStr(body.date) ? body.date : null;
    if (!date) {
      return NextResponse.json({ error: "Format tanggal tidak valid" }, { status: 400 });
    }
    if (date >= today) {
      return NextResponse.json(
        { error: "Rumah Kaca hanya untuk hari lampau — hari ini masih bisa diisi." },
        { status: 400 }
      );
    }
    if (date < addDays(today, -60)) {
      // Perlindungan lebih dari 60 hari lampau tidak bermakna (streak sudah putus)
      return NextResponse.json({ error: "Terlalu lama — maksimal 60 hari ke belakang" }, { status: 400 });
    }

    const habit = await db.habit.findUnique({ where: { id } });
    if (!habit) return NextResponse.json({ error: "Kebiasaan tidak ditemukan" }, { status: 404 });
    if (habit.archived) {
      return NextResponse.json({ error: "Kebiasaan sudah diarsipkan" }, { status: 400 });
    }

    // Hari yang dilindungi wajib terjadwal — melindungi hari non-terjadwal tak bermakna
    const scheduled =
      habit.scheduleType === "daily" ||
      habit.daysOfWeek.split(",").map(Number).includes(dayOfWeek(date));
    if (!scheduled) {
      return NextResponse.json({ error: "Hari itu tidak terjadwal untuk kebiasaan ini" }, { status: 400 });
    }

    const log = await db.habitLog.findUnique({ where: { habitId_date: { habitId: id, date } } });
    const done =
      !!log && (log.status === "done" || (habit.unitTarget !== null && (log.value ?? 0) >= habit.unitTarget));
    if (done) {
      return NextResponse.json({ error: "Hari itu sudah tercatat selesai — tidak perlu pelindung" }, { status: 409 });
    }

    const existing = await db.habitShield.findUnique({ where: { habitId_date: { habitId: id, date } } });
    if (existing) {
      return NextResponse.json({ error: "Hari itu sudah dilindungi" }, { status: 409 });
    }

    // Kuota berjalan: pelindung yang DIBUAT dalam 7 hari terakhir (semua tanggal)
    const windowStart = new Date(Date.now() - SHIELD_WINDOW_DAYS * 86_400_000);
    const usedThisWeek = await db.habitShield.count({
      where: { habitId: id, createdAt: { gte: windowStart } },
    });
    if (usedThisWeek >= SHIELD_LIMIT_PER_WINDOW) {
      return NextResponse.json(
        { error: "Kuota Rumah Kaca pekan ini sudah terpakai (1 kali per pekan)" },
        { status: 429 }
      );
    }

    const shield = await db.habitShield.create({ data: { habitId: id, date } });
    return NextResponse.json({ shield }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Hari itu sudah dilindungi" }, { status: 409 });
    }
    console.error("habit shield POST error", e);
    return NextResponse.json({ error: "Gagal memasang Rumah Kaca" }, { status: 500 });
  }
}

/**
 * DELETE /api/habits/[id]/shield?date=YYYY-MM-DD
 * Lepas pelindung (undo salah pasang).
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const date = new URL(req.url).searchParams.get("date");
    if (!date || !isValidDateStr(date)) {
      return NextResponse.json({ error: "Format tanggal tidak valid" }, { status: 400 });
    }
    const removed = await db.habitShield.deleteMany({ where: { habitId: id, date } });
    if (removed.count === 0) {
      return NextResponse.json({ error: "Pelindung tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("habit shield DELETE error", e);
    return NextResponse.json({ error: "Gagal melepas pelindung" }, { status: 500 });
  }
}
