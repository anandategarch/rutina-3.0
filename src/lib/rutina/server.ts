import { db } from "@/lib/db";
import { addDays, jakartaToday, parseDateStr, rangeDays, toDateStr } from "@/lib/rutina/format";

/**
 * Aturan XP Rutina (satu sumber kebenaran untuk semua endpoint):
 * - Habit log done  = 10 XP
 * - Workout         = 25 XP
 * - Jurnal entry    = 15 XP
 * - Check-in        = 5 XP
 * - Level = floor(xp / 500) + 1 ; progres level = (xp % 500) / 500
 */
export function levelFromXp(xp: number) {
  const level = Math.floor(xp / 500) + 1;
  const levelProgress = (xp % 500) / 500;
  const xpToNextLevel = 500 - (xp % 500);
  return { level, levelProgress, xpToNextLevel };
}

export function computeXp(args: {
  habitDone: number;
  workouts: number;
  journals: number;
  checkins: number;
}) {
  return args.habitDone * 10 + args.workouts * 25 + args.journals * 15 + args.checkins * 5;
}

export async function getXpData() {
  const [habitDone, workouts, journals, checkins] = await Promise.all([
    db.habitLog.count({ where: { status: "done" } }),
    db.workout.count(),
    db.journalEntry.count(),
    db.checkIn.count(),
  ]);
  const xp = computeXp({ habitDone, workouts, journals, checkins });
  return { xp, ...levelFromXp(xp) };
}

/** Streak: hari berturut-turut (berakhir hari ini/kemarin) dengan >=1 habit done. */
export async function computeStreaks() {
  // GroupBy per tanggal: cukup daftar tanggal unik, tanpa memuat seluruh baris log.
  // Log milik habit yang diarsipkan tidak dihitung.
  // audit B2-H3: log bertanggal masa depan tidak boleh menggelembungkan streak
  const rows = await db.habitLog.groupBy({
    by: ["date"],
    where: { status: "done", habit: { archived: false }, date: { lte: jakartaToday() } },
  });
  const dates = rows.map((r) => r.date).sort();
  const dateSet = new Set(dates);

  // current streak — "hari ini" mengikuti zona waktu pengguna (Asia/Jakarta)
  const cursor = parseDateStr(jakartaToday());
  if (!dateSet.has(toDateStr(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let current = 0;
  while (dateSet.has(toDateStr(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // best streak
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of dates) {
    if (prev && addDays(prev, 1) === d) run++;
    else run = 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current, best };
}

export { db };

/**
 * Streak PER-HABIT dari SELURUH riwayat log (bukan hanya 35 hari).
 * Sumber kebenaran tunggal untuk /api/habits — semantik sama dengan versi klien:
 * - hanya hari terjadwal yang dihitung (daily / daysOfWeek)
 * - done = status "done" ATAU value >= unitTarget (habit terukur)
 * - hari ini yang belum selesai diberi grace (tidak memutus streak)
 * - hari bolong berpelindung "Rumah Kaca" di-skip: runtun tidak putus,
 *   namun juga tidak bertambah (netral, seperti hari non-terjadwal)
 */
export async function computeHabitStreaks(): Promise<Record<string, { current: number; best: number }>> {
  const today = jakartaToday();
  const [habits, logs, shieldRows] = await Promise.all([
    db.habit.findMany({
      select: { id: true, createdAt: true, scheduleType: true, daysOfWeek: true, unitTarget: true },
    }),
    db.habitLog.findMany({
      // audit B2-H3: log masa depan tidak boleh ikut menghitung streak per-habit
      where: { date: { lte: today } },
      select: { habitId: true, date: true, status: true, value: true },
    }),
    db.habitShield.findMany({ select: { habitId: true, date: true } }),
  ]);

  const logsByHabit = new Map<string, Map<string, { status: string; value: number | null }>>();
  for (const l of logs) {
    let m = logsByHabit.get(l.habitId);
    if (!m) {
      m = new Map();
      logsByHabit.set(l.habitId, m);
    }
    m.set(l.date, { status: l.status, value: l.value });
  }

  const shieldsByHabit = new Map<string, Set<string>>();
  for (const s of shieldRows) {
    let set = shieldsByHabit.get(s.habitId);
    if (!set) {
      set = new Set();
      shieldsByHabit.set(s.habitId, set);
    }
    set.add(s.date);
  }

  const isScheduled = (daysOfWeek: string, scheduleType: string, ds: string) => {
    if (scheduleType === "daily") return true;
    const days = daysOfWeek.split(",").map(Number);
    return days.includes(parseDateStr(ds).getDay());
  };
  const isDone = (
    unitTarget: number | null,
    log?: { status: string; value: number | null } | null
  ) => {
    if (!log) return false;
    if (log.status === "done") return true;
    return unitTarget !== null && (log.value ?? 0) >= unitTarget;
  };

  const out: Record<string, { current: number; best: number }> = {};
  for (const h of habits) {
    const m = logsByHabit.get(h.id) ?? new Map<string, { status: string; value: number | null }>();
    const shieldSet = shieldsByHabit.get(h.id) ?? new Set<string>();

    // ---- current streak (jalan mundur dari hari ini, dengan grace hari ini) ----
    let current = 0;
    let cursor = today;
    for (let i = 0; i < 3650; i++) {
      if (!isScheduled(h.daysOfWeek, h.scheduleType, cursor)) {
        cursor = addDays(cursor, -1);
        continue;
      }
      if (isDone(h.unitTarget, m.get(cursor))) {
        current++;
        cursor = addDays(cursor, -1);
        continue;
      }
      // Rumah Kaca: hari bolong terlindungi netral — runtun tetap berjalan.
      // Hari ini tidak pernah berpelindung (shield hanya untuk hari lampau).
      if (cursor !== today && shieldSet.has(cursor)) {
        cursor = addDays(cursor, -1);
        continue;
      }
      if (cursor === today && current === 0) {
        cursor = addDays(cursor, -1); // grace: hari ini belum selesai
        continue;
      }
      break;
    }

    // ---- best streak (jalan maju sejak log done pertama, semantik identik dengan
    //      klien: hari non-terjadwal & hari berpelindung di-skip tanpa memutus run;
    //      log backfill tetap dihitung) ----
    const doneSet = new Set(
      Array.from(m.entries())
        .filter(([, l]) => isDone(h.unitTarget, l))
        .map(([ds]) => ds)
    );
    let best = 0;
    let run = 0;
    if (doneSet.size > 0) {
      const firstDone = Array.from(doneSet).sort()[0];
      for (const ds of rangeDays(firstDone, today)) {
        if (!isScheduled(h.daysOfWeek, h.scheduleType, ds)) continue;
        if (doneSet.has(ds)) {
          run++;
          best = Math.max(best, run);
        } else if (shieldSet.has(ds)) {
          // dilindungi: run dilanjutkan tanpa menambah hitungan
        } else {
          run = 0;
        }
      }
    }

    out[h.id] = { current, best };
  }
  return out;
}
