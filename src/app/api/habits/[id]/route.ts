import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/rutina/server";
import { isValidTimeStr } from "@/lib/rutina/format";

export const dynamic = "force-dynamic";

const TIME_OF_DAY = ["morning", "afternoon", "evening", "anytime"];
// audit B2-M1: set validasi sama dengan POST /api/habits (paritas PATCH)
const CATEGORIES = ["health", "productivity", "mind", "finance", "social", "learning"];
const COLORS = ["emerald", "amber", "teal", "rose", "orange", "stone"];

/** daysOfWeek → csv ter-normalisasi berisi angka 0-6 saja (tanpa duplikat, terurut). */
function normalizeDaysOfWeek(input: unknown): string[] | null {
  const days = String(input)
    .split(",")
    .map((x) => x.trim())
    .filter((x) => /^[0-6]$/.test(x));
  return days.length > 0 ? Array.from(new Set(days)).sort() : null;
}

/**
 * PATCH /api/habits/[id]
 * Partial update — field apa pun boleh dikirim (termasuk archived).
 * Response: { habit }
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
    }

    const existing = await db.habit.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Kebiasaan tidak ditemukan" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) {
        return NextResponse.json({ error: "Nama kebiasaan tidak boleh kosong" }, { status: 400 });
      }
      // audit B2-M1: cap 80 — mirror POST
      if (name.length > 80) {
        return NextResponse.json({ error: "Nama kebiasaan maksimal 80 karakter" }, { status: 400 });
      }
      data.name = name;
    }
    // audit B2-M1: kategori/warna di luar set valid → abaikan (pertahankan nilai lama,
    // pendekatan fallback yang sama seperti POST)
    if (
      body.category !== undefined &&
      typeof body.category === "string" &&
      CATEGORIES.includes(body.category)
    ) {
      data.category = body.category;
    }
    if (body.icon !== undefined && typeof body.icon === "string" && body.icon) {
      data.icon = body.icon.slice(0, 40); // audit B2-M1: cap 40 seperti POST
    }
    if (
      body.color !== undefined &&
      typeof body.color === "string" &&
      COLORS.includes(body.color)
    ) {
      data.color = body.color;
    }
    if (body.scheduleType !== undefined) {
      data.scheduleType = body.scheduleType === "custom" ? "custom" : "daily";
    }
    if (body.daysOfWeek !== undefined && body.daysOfWeek !== null) {
      const days = normalizeDaysOfWeek(body.daysOfWeek);
      if (!days) {
        return NextResponse.json({ error: "Pilihan hari tidak valid" }, { status: 400 });
      }
      data.daysOfWeek = days.join(",");
    }
    if (body.timeOfDay !== undefined && TIME_OF_DAY.includes(body.timeOfDay)) {
      data.timeOfDay = body.timeOfDay;
    }
    if (body.unitLabel !== undefined) {
      data.unitLabel =
        typeof body.unitLabel === "string" && body.unitLabel.trim() !== ""
          ? body.unitLabel.trim().slice(0, 24) // audit B2-M1: cap 24 seperti POST
          : null;
    }
    if (body.unitTarget !== undefined) {
      // audit B2-M5: Infinity/NaN tidak boleh lolos dari `> 0` — wajib Number.isFinite
      const n = Number(body.unitTarget);
      data.unitTarget = body.unitTarget !== null && Number.isFinite(n) && n > 0 ? n : null;
    }
    if (body.unitStep !== undefined) {
      const n = Number(body.unitStep);
      data.unitStep = body.unitStep !== null && Number.isFinite(n) && n > 0 ? n : 1;
    }
    if (body.reminderTime !== undefined) {
      if (typeof body.reminderTime === "string" && body.reminderTime.trim() !== "") {
        const reminderTime = body.reminderTime.trim();
        // audit B2-M1: validasi HH:MM sungguhan via isValidTimeStr — paritas dgn POST
        if (!isValidTimeStr(reminderTime)) {
          return NextResponse.json(
            { error: "Format waktu pengingat tidak valid (HH:MM)" },
            { status: 400 }
          );
        }
        data.reminderTime = reminderTime;
      } else {
        data.reminderTime = null;
      }
    }
    if (body.stackAfter !== undefined) {
      data.stackAfter =
        typeof body.stackAfter === "string" && body.stackAfter.trim() !== ""
          ? body.stackAfter.trim().slice(0, 120) // audit B2-M1: cap 120 seperti POST
          : null;
    }
    if (body.archived !== undefined) {
      data.archived = body.archived === true;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ habit: existing });
    }

    try {
      const habit = await db.habit.update({ where: { id }, data });
      return NextResponse.json({ habit });
    } catch (err) {
      // audit B2-M9: baris dihapus request lain antara cek & update (TOCTOU) → 404
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        return NextResponse.json({ error: "Kebiasaan tidak ditemukan" }, { status: 404 });
      }
      throw err;
    }
  } catch (e) {
    console.error("habits PATCH error", e);
    return NextResponse.json({ error: "Gagal memperbarui kebiasaan" }, { status: 500 });
  }
}

/**
 * DELETE /api/habits/[id]
 * Hard delete — logs ikut terhapus (cascade).
 * Response: { ok: true }
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await db.habit.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Kebiasaan tidak ditemukan" }, { status: 404 });
    }
    try {
      await db.habit.delete({ where: { id } }); // HabitLog cascade via schema
    } catch (err) {
      // audit B2-M9: baris dihapus request lain antara cek & delete (TOCTOU) → 404
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        return NextResponse.json({ error: "Kebiasaan tidak ditemukan" }, { status: 404 });
      }
      throw err;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("habits DELETE error", e);
    return NextResponse.json({ error: "Gagal menghapus kebiasaan" }, { status: 500 });
  }
}
