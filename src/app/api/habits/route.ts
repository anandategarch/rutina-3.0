import { NextResponse } from "next/server";
import { db, computeHabitStreaks, computeStreaks } from "@/lib/rutina/server";
import { ensureBootData } from "@/lib/rutina/boot";
import { withDbRetry } from "@/lib/rutina/db-retry";
import {
  addDays,
  dayOfWeek,
  jakartaDateStr,
  jakartaToday,
  isValidTimeStr,
  rangeDays,
} from "@/lib/rutina/format";

export const dynamic = "force-dynamic";

const TIME_OF_DAY = ["morning", "afternoon", "evening", "anytime"];
const CATEGORIES = ["health", "productivity", "mind", "finance", "social", "learning"];
const COLORS = ["emerald", "amber", "teal", "rose", "orange", "stone"];
// isValidTimeStr kini helper bersama di lib/rutina/format (dipakai POST & PATCH)

/**
 * Pola lupa (30 hari lampau, hari ini dikecualikan): weekday terjadwal yang
 * paling sering bolong. Menonjol bila >=2 bolong pada weekday yang sama.
 * Habit yang dibuat setelah tanggal ds tidak dihitung (belum terjadwal saat itu).
 */
function computeMissPattern(h: {
  createdAt: Date;
  scheduleType: string;
  daysOfWeek: string;
  unitTarget: number | null;
}, logs: { date: string; status: string; value: number | null }[], today: string) {
  const byDate = new Map(logs.map((l) => [l.date, l]));
  const perDow = new Array<number>(7).fill(0);
  const schedPerDow = new Array<number>(7).fill(0);
  const isDone = (l?: { status: string; value: number | null }) =>
    !!l && (l.status === "done" || (h.unitTarget !== null && (l.value ?? 0) >= h.unitTarget));
  for (const ds of rangeDays(addDays(today, -29), addDays(today, -1))) {
    if (jakartaDateStr(h.createdAt) > ds) continue;
    const dow = dayOfWeek(ds);
    if (h.scheduleType !== "daily" && !h.daysOfWeek.split(",").map(Number).includes(dow)) continue;
    schedPerDow[dow]++;
    if (!isDone(byDate.get(ds))) perDow[dow]++;
  }
  const max = Math.max(0, ...perDow);
  if (max < 2) return null;
  const weekday = perDow.indexOf(max);
  return { weekday, count: max, scheduled: schedPerDow[weekday], rate: schedPerDow[weekday] > 0 ? 1 - max / schedPerDow[weekday] : 0 };
}

/**
 * GET /api/habits
 * Semua habit (termasuk yang diarsipkan) beserta logs 35 hari terakhir,
 * pelindung Rumah Kaca (35 hari), dan pola lupa per habit.
 * Response: { habits: Habit[] }
 */
export async function GET() {
  try {
    // audit E-B1: tunggu seeding boot (profil + katalog) selesai dulu —
    // sebelumnya request ini (read-only) bisa kalah balapan lock dengan
    // transaksi tulis seeding dari GET paralel lain di SQLite non-WAL →
    // SQLITE_BUSY → 500 "Gagal memuat kebiasaan". ensureBootData memoized,
    // jadi setelah boot pertama ini praktis gratis.
    await ensureBootData();

    // Jendela 35 hari mengikuti zona WIB (bukan TZ server), konsisten dengan hari ini WIB
    const sinceStr = addDays(jakartaToday(), -34); // 35 hari inklusif
    const today = jakartaToday();

    const [habitsRaw, streaks, overallStreak, lifetimeDone] = await withDbRetry(() =>
      Promise.all([
      db.habit.findMany({
        include: {
          logs: {
            // audit B2-H3: log masa depan tidak boleh tampil di daftar kebiasaan
            where: { date: { gte: sinceStr, lte: today } },
            orderBy: { date: "asc" },
          },
          shields: {
            where: { date: { gte: sinceStr, lte: today } },
            orderBy: { date: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      // Streak dihitung dari SELURUH riwayat di server — klien tak lagi capped 35 hari
      computeHabitStreaks(),
      // audit D-M2: runtun keseluruhan (semua habit aktif, riwayat penuh) dari
      // server — satu sumber kebenaran yang sama dengan Beranda & Statistik.
      // Sebelumnya klien menghitung sendiri dari jendela log 35 hari: streak
      // "Terbaik" mentok 35 dan ikut menghitung habit yang diarsipkan.
      computeStreaks(),
      // audit D-M2: jumlah check-in SEUMUR HIDUP untuk tahap Taman Pertumbuhan.
      // Threshold tahap berbentuk lifetime, sementara logs pada payload hanya
      // 35 hari — tanpa angka ini taman bisa "mundur" saat log lama keluar
      // jendela (user dengan 300 check-in tampil "Tunas").
      db.habitLog.count({ where: { status: "done" } }),
      ])
    );

    const habits = habitsRaw.map((h) => ({
      ...h,
      streak: streaks[h.id] ?? { current: 0, best: 0 },
      shields: h.shields.map((s) => s.date),
      missPattern: computeMissPattern(h, h.logs, today),
    }));

    return NextResponse.json({
      habits,
      overallStreak,
      lifetimeCheckIns: lifetimeDone,
    });
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
          body.unitTarget !== undefined &&
          body.unitTarget !== null &&
          // audit B2-M5: Infinity lolos dari `> 0` — wajib Number.isFinite
          Number.isFinite(Number(body.unitTarget)) &&
          Number(body.unitTarget) > 0
            ? Number(body.unitTarget)
            : null,
        unitStep:
          body.unitStep !== undefined &&
          body.unitStep !== null &&
          Number.isFinite(Number(body.unitStep)) &&
          Number(body.unitStep) > 0
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
