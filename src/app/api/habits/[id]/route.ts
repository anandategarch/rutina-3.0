import { NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";

export const dynamic = "force-dynamic";

const TIME_OF_DAY = ["morning", "afternoon", "evening", "anytime"];

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
      data.name = name;
    }
    if (body.category !== undefined && typeof body.category === "string" && body.category) {
      data.category = body.category;
    }
    if (body.icon !== undefined && typeof body.icon === "string" && body.icon) {
      data.icon = body.icon;
    }
    if (body.color !== undefined && typeof body.color === "string" && body.color) {
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
          ? body.unitLabel.trim()
          : null;
    }
    if (body.unitTarget !== undefined) {
      data.unitTarget =
        body.unitTarget !== null && Number(body.unitTarget) > 0 ? Number(body.unitTarget) : null;
    }
    if (body.unitStep !== undefined) {
      data.unitStep =
        body.unitStep !== null && Number(body.unitStep) > 0 ? Number(body.unitStep) : 1;
    }
    if (body.reminderTime !== undefined) {
      if (typeof body.reminderTime === "string" && body.reminderTime.trim() !== "") {
        const reminderTime = body.reminderTime.trim();
        if (!/^\d{2}:\d{2}$/.test(reminderTime)) {
          return NextResponse.json({ error: "Format waktu pengingat tidak valid" }, { status: 400 });
        }
        data.reminderTime = reminderTime;
      } else {
        data.reminderTime = null;
      }
    }
    if (body.stackAfter !== undefined) {
      data.stackAfter =
        typeof body.stackAfter === "string" && body.stackAfter.trim() !== ""
          ? body.stackAfter.trim()
          : null;
    }
    if (body.archived !== undefined) {
      data.archived = body.archived === true;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ habit: existing });
    }

    const habit = await db.habit.update({ where: { id }, data });
    return NextResponse.json({ habit });
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
    await db.habit.delete({ where: { id } }); // HabitLog cascade via schema
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("habits DELETE error", e);
    return NextResponse.json({ error: "Gagal menghapus kebiasaan" }, { status: 500 });
  }
}
