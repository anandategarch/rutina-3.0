import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

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
  const logs = await db.habitLog.findMany({
    where: { status: "done" },
    select: { date: true },
    orderBy: { date: "desc" },
  });
  const dates = Array.from(new Set(logs.map((l) => l.date))).sort();
  const dateSet = new Set(dates);

  // current streak
  const today = new Date();
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  let cursor = new Date(today);
  if (!dateSet.has(fmt(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let current = 0;
  while (dateSet.has(fmt(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // best streak
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  const addDays = (s: string, n: number) => {
    const [y, m, d] = s.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + n);
    return fmt(dt);
  };
  for (const d of dates) {
    if (prev && addDays(prev, 1) === d) run++;
    else run = 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current, best };
}

export { db };
