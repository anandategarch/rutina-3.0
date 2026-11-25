import { db } from "@/lib/db";
import { addDays, jakartaToday, parseDateStr, toDateStr } from "@/lib/rutina/format";

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
  const rows = await db.habitLog.groupBy({
    by: ["date"],
    where: { status: "done", habit: { archived: false } },
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
