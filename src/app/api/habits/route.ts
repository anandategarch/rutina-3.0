import { NextResponse } from "next/server";
import { db, computeHabitStreaks } from "@/lib/rutina/server";
import { addDays, jakartaToday } from "@/lib/rutina/format";

export const dynamic = "force-dynamic";

const TIME_OF_DAY = ["morning", "afternoon", "evening", "anytime"];
const CATEGORIES = ["health", "productivity", "mind", "finance", "social", "learning"];
const COLORS = ["emerald", "amber", "teal", "rose", "orange", "stone"];

/** HH:MM sungguhan (00-23 : 00-59) — bukan hanya bentuknya. */
function isValidTimeStr(s: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(s)) return false;
  const [h, m] = s.split(":").map(Number);
  return h <= 23 && m <= 59;
}

/**
 * GET /api/habits
 * Semua habit (termasuk yang diarsipkan) beserta logs 35 hari terakhir.
 * Response: { habits: Habit[] }
 */
export async function GET() {
  try {
    // Jendela 35 hari mengikuti zona WIB (bukan TZ server), konsisten dengan hari ini WIB
    const sinceStr = addDays(jakartaToday(), -34); // 35 hari inklusif

    const [habitsRaw, streaks] = await Promise.all([
      db.habit.findMany({
        include: {
          logs: {
            where: { date: { gte: sinceStr } },
            orderBy: { date: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      // Streak dihitung dari SELURUH riwayat di server — klien tak lagi capped 35 hari
      computeHabitStreaks(),
    ]);

    const habits = habitsRaw.map((h) => ({
      ...h,
      streak: streaks[h.id] ?? { current: 0, best: 0 },
    }));

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
    if (name.length > 80) {
      return NextResponse.json({ error: "Nama kebiasaan maksimal 80 karakter" }, { status: 400 });
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
    if (reminderTime && !isValidTimeStr(reminderTime)) {
      return NextResponse.json({ error: "Format waktu pengingat tidak valid (HH:MM)" }, { status: 400 });
    }

    const habit = await db.habit.create({
      data: {
        name,
        category: CATEGORIES.includes(body.category) ? body.category : "health",
        icon: typeof body.icon === "string" && body.icon ? body.icon.slice(0, 40) : "sprout",
        color: COLORS.includes(body.color) ? body.color : "emerald",
        scheduleType: body.scheduleType === "custom" ? "custom" : "daily",
        daysOfWeek,
        timeOfDay: TIME_OF_DAY.includes(body.timeOfDay) ? body.timeOfDay : "anytime",
        unitLabel:
          typeof body.unitLabel === "string" && body.unitLabel.trim() !== ""
            ? body.unitLabel.trim().slice(0, 24)
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
            ? body.stackAfter.trim().slice(0, 120)
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
