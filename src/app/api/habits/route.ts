import { NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";

export const dynamic = "force-dynamic";

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const TIME_OF_DAY = ["morning", "afternoon", "evening", "anytime"];

/**
 * GET /api/habits
 * Semua habit (termasuk yang diarsipkan) beserta logs 35 hari terakhir.
 * Response: { habits: Habit[] }
 */
export async function GET() {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 34); // 35 hari inklusif
    const sinceStr = localDateStr(since);

    const habits = await db.habit.findMany({
      include: {
        logs: {
          where: { date: { gte: sinceStr } },
          orderBy: { date: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ habits });
  } catch (e) {
    console.error("habits GET error", e);
    return NextResponse.json({ error: "Gagal memuat kebiasaan" }, { status: 500 });
  }
}

/**
 * POST /api/habits
 * Buat habit baru dari body JSON.
 * Response: { habit }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Nama kebiasaan wajib diisi" }, { status: 400 });
    }

    // daysOfWeek: terima array angka atau csv string → csv ter-normalisasi "0,1,2,..."
    let daysOfWeek = "0,1,2,3,4,5,6";
    if (body.daysOfWeek !== undefined && body.daysOfWeek !== null) {
      const days = String(body.daysOfWeek)
        .split(",")
        .map((x: string) => x.trim())
        .filter((x: string) => /^[0-6]$/.test(x));
      if (days.length === 0) {
        return NextResponse.json({ error: "Pilihan hari tidak valid" }, { status: 400 });
      }
      daysOfWeek = Array.from(new Set(days)).sort().join(",");
    }

    // reminderTime wajib berformat "HH:MM" bila diisi
    const reminderTime =
      typeof body.reminderTime === "string" && body.reminderTime.trim() !== ""
        ? body.reminderTime.trim()
        : null;
    if (reminderTime && !/^\d{2}:\d{2}$/.test(reminderTime)) {
      return NextResponse.json({ error: "Format waktu pengingat tidak valid" }, { status: 400 });
    }

    const habit = await db.habit.create({
      data: {
        name,
        category: typeof body.category === "string" && body.category ? body.category : "health",
        icon: typeof body.icon === "string" && body.icon ? body.icon : "sprout",
        color: typeof body.color === "string" && body.color ? body.color : "emerald",
        scheduleType: body.scheduleType === "custom" ? "custom" : "daily",
        daysOfWeek,
        timeOfDay: TIME_OF_DAY.includes(body.timeOfDay) ? body.timeOfDay : "anytime",
        unitLabel:
          typeof body.unitLabel === "string" && body.unitLabel.trim() !== ""
            ? body.unitLabel.trim()
            : null,
        unitTarget:
          body.unitTarget !== undefined && body.unitTarget !== null && Number(body.unitTarget) > 0
            ? Number(body.unitTarget)
            : null,
        unitStep:
          body.unitStep !== undefined && body.unitStep !== null && Number(body.unitStep) > 0
            ? Number(body.unitStep)
            : 1,
        reminderTime,
        stackAfter:
          typeof body.stackAfter === "string" && body.stackAfter.trim() !== ""
            ? body.stackAfter.trim()
            : null,
        archived: body.archived === true,
      },
    });

    return NextResponse.json({ habit }, { status: 201 });
  } catch (e) {
    console.error("habits POST error", e);
    return NextResponse.json({ error: "Gagal membuat kebiasaan" }, { status: 500 });
  }
}
