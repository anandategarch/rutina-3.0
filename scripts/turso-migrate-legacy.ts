/**
 * Migrasi data legacy (generasi tabel "rutina_*" dari Rutina 2.0) → schema Rutina 3.0.
 *
 * Sumber  : tabel legacy di database Turso yang sama (rutina_wallets, rutina_habits,
 *           rutina_habit_logs, rutina_transactions, rutina_budgets, rutina_goals,
 *           rutina_body_logs, rutina_mood_logs, rutina_workout_sessions,
 *           rutina_app_settings).
 * Target  : tabel Prisma 3.0 (Wallet, Habit, HabitLog, Transaction, Budget,
 *           SavingsGoal, CheckIn, BodyMetric, Workout, Profile) + evaluasi achievement.
 *
 * Perilaku:
 * - Idempoten: data sampling pada tabel target DIHAPUS dulu, lalu diimpor ulang.
 *   Menjalankan ulang selalu menghasilkan state yang sama.
 * - ID legacy dipertahankan (cuid 'cmrb…' & 'tx-…') agar relasi wallet↔transaksi
 *   dan habit↔log tersambung sempurna.
 * - Tabel legacy TIDAK diubah sama sekali (read-only).
 * - Achievement dievaluasi ulang dari data asli (kriteria sama dgn app: XP =
 *   log×10 + workout×25 + jurnal×15 + checkin×5).
 * - Dictionary (Exercise, FoodItem, Quote) & struktur lain tidak disentuh.
 *
 * Jalankan: bun scripts/turso-migrate-legacy.ts  (env TURSO_* dari .env)
 */
import { createClient, type Row } from "@libsql/client";
import { db } from "@/lib/db";

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error("✗ TURSO_DATABASE_URL belum diset — migrasi menulis ke Turso, bukan SQLite lokal.");
  process.exit(1);
}
const legacy = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

/* ---------------- util ---------------- */

const cell = (c: unknown): unknown => {
  if (c && typeof c === "object" && "value" in (c as Record<string, unknown>)) {
    return (c as { value: unknown }).value;
  }
  return c;
};
type RowArr = Row;
async function q(sql: string): Promise<RowArr[]> {
  const res = await legacy.execute(sql);
  return res.rows as RowArr[];
}
const val = (r: RowArr, i: number): unknown => cell(r[i]);
const num = (r: RowArr, i: number): number | null => {
  const v = val(r, i);
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const str = (r: RowArr, i: number): string | null => {
  const v = val(r, i);
  return v === null || v === undefined ? null : String(v);
};
const dateAt = (dateStr: string): Date => new Date(`${dateStr}T12:00:00`);

/** Rentang tanggal ISO (YYYY-MM-DD) hari ini mengikuti zona Asia/Jakarta. */
function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

/* ---------------- mapping helpers ---------------- */

const HABIT_ICON_BY_TITLE: Array<[test: RegExp, icon: string]> = [
  [/learning/i, "book-marked"],
  [/bangun pagi/i, "flower-2"],
  [/membaca|baca/i, "book-open"],
  [/jalan\b|jalan-jalan/i, "footprints"],
  [/masak/i, "utensils"],
  [/badminton/i, "heart-pulse"],
  [/bersih/i, "sparkles"],
  [/tempat tidur/i, "moon"],
  [/cuci/i, "droplets"],
  [/sikat gigi/i, "moon"],
  [/latihan|gym|workout/i, "dumbbell"],
];
const HABIT_ICON_DEFAULT = "sprout";

const CATEGORY_MAP: Record<string, { category: string; color: string }> = {
  Kesehatan: { category: "health", color: "emerald" },
  Belajar: { category: "learning", color: "amber" },
  Pribadi: { category: "mind", color: "teal" },
};

const TX_TYPE_MAP: Record<string, string> = { masuk: "income", keluar: "expense" };

const MOOD_TO_INT: Record<string, number> = {
  Ceria: 5,
  Baik: 4,
  Biasa: 3,
  Lelah: 2,
  Sedih: 1,
};

const WORKOUT_KIND_MAP: Record<string, string> = {
  "lari-jalan": "runwalk",
  lari: "run",
  jalan: "walk",
  badminton: "badminton",
  beban: "strength",
  gym: "strength",
  strength: "strength",
};

const walletType = (name: string): string =>
  /bank/i.test(name) ? "bank" : /^kas$/i.test(name.trim()) ? "cash" : "ewallet";
const walletColor = (type: string): string =>
  type === "bank" ? "teal" : type === "cash" ? "emerald" : "amber";

/* ---------------- 1. baca legacy ---------------- */

console.log("⏳ Membaca tabel legacy dari Turso…");
const [
  legacyWallets,
  legacyHabits,
  legacyLogs,
  legacyTx,
  legacyBudgets,
  legacyGoals,
  legacyBody,
  legacyMood,
  legacyWorkouts,
  legacySettings,
] = await Promise.all([
  q("SELECT id, name, initial FROM rutina_wallets"),
  q("SELECT id, title, cat, schedule, reminder, archived, createdAt, target, unit, afterId, mini FROM rutina_habits"),
  q("SELECT id, habitId, date, value FROM rutina_habit_logs"),
  q("SELECT id, type, cat, amount, note, ts, walletId, toWalletId, recurrence FROM rutina_transactions"),
  q("SELECT cat, amount FROM rutina_budgets"),
  q("SELECT id, name, target, saved FROM rutina_goals"),
  q("SELECT date, water, weight, sleepH, energy, soreness, stress FROM rutina_body_logs"),
  q("SELECT date, mood FROM rutina_mood_logs"),
  q("SELECT id, kind, date, duration, note, sets, distance, kcal FROM rutina_workout_sessions"),
  q("SELECT key, value FROM rutina_app_settings"),
]);

const setting = (key: string): string | null => {
  const row = legacySettings.find((r) => str(r, 0) === key);
  return row ? str(row, 1) : null;
};

/* ---------------- 2. bersihkan data sampling di tabel target ---------------- */

console.log("🧹 Menghapus data sampling di tabel target (dictionary tetap aman)…");
await db.transaction.deleteMany();
await db.habitLog.deleteMany();
await db.habit.deleteMany();
await db.wallet.deleteMany();
await db.budget.deleteMany();
await db.savingsGoal.deleteMany();
await db.journalEntry.deleteMany();
await db.checkIn.deleteMany();
await db.bodyMetric.deleteMany();
await db.foodEntry.deleteMany();
await db.workout.deleteMany();
// Achievement di-reset dulu, lalu dievaluasi ulang dari data asli di langkah 4.
await db.achievement.updateMany({ data: { unlockedAt: null } });

/* ---------------- 3. impor ke schema 3.0 ---------------- */

console.log("📦 Mengimpor wallet…");
await db.wallet.createMany({
  data: legacyWallets.map((r) => {
    const id = String(val(r, 0));
    const name = String(val(r, 1) ?? "Dompet");
    const type = walletType(name);
    return {
      id,
      name,
      type,
      initialBalance: num(r, 2) ?? 0,
      color: walletColor(type),
      icon: "wallet",
      archived: false,
      createdAt: dateAt(jakartaToday()),
    };
  }),
});

console.log("📦 Mengimpor habit…");
await db.habit.createMany({
  data: legacyHabits.map((r) => {
    const title = String(val(r, 1) ?? "Kebiasaan");
    const catRaw = String(val(r, 2) ?? "Pribadi");
    const mapped = CATEGORY_MAP[catRaw] ?? { category: "mind", color: "teal" };
    const reminder = str(r, 4);
    const hour = reminder ? Number(reminder.split(":")[0]) : null;
    const icon = HABIT_ICON_BY_TITLE.find(([test]) => test.test(title))?.[1] ?? HABIT_ICON_DEFAULT;
    // SELECT: id(0) title(1) cat(2) schedule(3) reminder(4) archived(5) createdAt(6)
    //         target(7) unit(8) afterId(9) mini(10)
    return {
      id: String(val(r, 0)),
      name: title,
      category: mapped.category,
      icon,
      color: mapped.color,
      scheduleType: "daily",
      daysOfWeek: "0,1,2,3,4,5,6",
      timeOfDay: hour === null ? "anytime" : hour < 11 ? "morning" : hour >= 17 ? "evening" : "afternoon",
      unitLabel: num(r, 7) !== null ? str(r, 8) : null,
      unitTarget: num(r, 7),
      reminderTime: reminder,
      archived: str(r, 5) === "1" || str(r, 5) === "true",
      createdAt: new Date(String(val(r, 6) ?? dateAt(jakartaToday()).toISOString())),
    };
  }),
});

console.log("📦 Mengimpor habit log…");
await db.habitLog.createMany({
  data: legacyLogs.map((r) => ({
    id: String(val(r, 0)),
    habitId: String(val(r, 1)),
    date: String(val(r, 2)),
    // Log legacy adalah check-in sederhana (tanpa nilai) → status "done".
    status: "done",
    value: num(r, 3),
  })),
});

console.log("📦 Mengimpor transaksi…");
// 2 transaksi legacy tidak punya dompet (walletId NULL — dompetnya sudah dihapus).
// Agar tidak ada data hilang, sematkan ke dompet pertama (Kas).
const fallbackWalletId = String(val(legacyWallets[0], 0));
await db.transaction.createMany({
  data: legacyTx.map((r) => {
    const dateStr = String(val(r, 5));
    const recRaw = str(r, 8);
    return {
      id: String(val(r, 0)),
      type: TX_TYPE_MAP[String(val(r, 1))] ?? "expense",
      amount: num(r, 3) ?? 0,
      category: String(val(r, 2) ?? "lainnya"),
      walletId: str(r, 6) ?? fallbackWalletId,
      toWalletId: str(r, 7),
      date: dateStr,
      note: str(r, 4),
      recurring: recRaw === "weekly" || recRaw === "monthly" ? recRaw : "none",
      createdAt: dateAt(dateStr),
    };
  }),
});

console.log("📦 Mengimpor budget & target tabungan…");
await db.budget.createMany({
  data: legacyBudgets.map((r) => ({
    category: String(val(r, 0)),
    monthlyLimit: num(r, 1) ?? 0,
  })),
});
await db.savingsGoal.createMany({
  data: legacyGoals.map((r) => ({
    id: String(val(r, 0)),
    name: String(val(r, 1) ?? "Target"),
    targetAmount: num(r, 2) ?? 0,
    currentAmount: num(r, 3) ?? 0,
    color: "emerald",
    icon: "piggy-bank",
  })),
});

console.log("📦 Mengimpor check-in (gabungan body + mood) & metrik tubuh…");
const moodByDate = new Map<string, number>();
for (const r of legacyMood) {
  const d = String(val(r, 0));
  const m = str(r, 1);
  moodByDate.set(d, (m ? MOOD_TO_INT[m] : undefined) ?? 3);
}
const bodyDates = new Set(legacyBody.map((r) => String(val(r, 0))));
const moodOnly = [...moodByDate.keys()].filter((d) => !bodyDates.has(d));

await db.checkIn.createMany({
  data: [
    ...legacyBody.map((r) => {
      const d = String(val(r, 0));
      return {
        date: d,
        mood: moodByDate.get(d) ?? null,
        energy: num(r, 4),
        soreness: num(r, 5),
        stress: num(r, 6),
        sleepHours: num(r, 3),
        note: null,
        createdAt: dateAt(d),
      };
    }),
    ...moodOnly.map((d) => ({
      date: d,
      mood: moodByDate.get(d) ?? null,
      energy: null,
      soreness: null,
      stress: null,
      sleepHours: null,
      note: null,
      createdAt: dateAt(d),
    })),
  ],
});
await db.bodyMetric.createMany({
  data: legacyBody.map((r) => ({
    date: String(val(r, 0)),
    weightKg: num(r, 2),
    hydrationGlasses: num(r, 1),
  })),
});

console.log("📦 Mengimpor workout…");
await db.workout.createMany({
  data: legacyWorkouts.map((r) => {
    const durationMin = num(r, 3) ?? 0;
    const distanceKm = num(r, 6);
    const setsRaw = str(r, 5);
    const strength = setsRaw && setsRaw !== "[]" ? setsRaw : null;
    return {
      id: String(val(r, 0)),
      type: WORKOUT_KIND_MAP[String(val(r, 1))] ?? "run",
      date: String(val(r, 2)),
      durationMin,
      distanceKm,
      calories: num(r, 7),
      paceMin: distanceKm && distanceKm > 0 ? durationMin / distanceKm : null,
      notes: str(r, 4) || null,
      strength,
      createdAt: dateAt(String(val(r, 2))),
    };
  }),
});

/* Profile: target misi harian dari pengaturan legacy (app.dailyGoal). */
const dailyGoal = Number(setting("app.dailyGoal") ?? 4);
await db.profile.upsert({
  where: { id: "main" },
  update: { dailyMissionTarget: Number.isFinite(dailyGoal) ? dailyGoal : 4 },
  create: { id: "main", dailyMissionTarget: Number.isFinite(dailyGoal) ? dailyGoal : 4 },
});

/* ---------------- 4. evaluasi achievement dari data asli ---------------- */

console.log("🏅 Evaluasi achievement dari data asli…");
const [habitCount, firstHabit, logRows, workoutCount, lastWorkout, checkinRows, journalCount, goalsNow, txLast, logCount] =
  await Promise.all([
    db.habit.count(),
    db.habit.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    db.habitLog.findMany({ select: { date: true, status: true }, orderBy: { date: "asc" } }),
    db.workout.count(),
    db.workout.findFirst({ orderBy: { date: "desc" }, select: { date: true } }),
    db.checkIn.findMany({ select: { date: true }, orderBy: { date: "asc" } }),
    db.journalEntry.count(),
    db.savingsGoal.findMany({ select: { currentAmount: true } }),
    db.transaction.findFirst({ orderBy: { date: "desc" }, select: { date: true } }),
    db.habitLog.count(),
  ]);

const doneDates = [...new Set(logRows.filter((l) => l.status === "done").map((l) => l.date))].sort();
const unlock: Record<string, string | null> = {
  "first-habit": firstHabit ? firstHabit.createdAt.toISOString().slice(0, 10) : null,
  "streak-7": null,
  "streak-30": null,
  "workout-10": workoutCount >= 10 ? (lastWorkout?.date ?? null) : null,
  "xp-500": null,
  "journal-5": journalCount >= 5 ? jakartaToday() : null,
  "saver-1jt":
    goalsNow.reduce((acc, g) => acc + g.currentAmount, 0) >= 1_000_000 ? (txLast?.date ?? null) : null,
  "habit-master": logCount >= 100 ? (doneDates.at(-1) ?? null) : null,
  "checkin-30": null,
};

/** Run berturut-turut pertama yang mencapai `target` → tanggal kecapaian. */
function firstRunReached(dates: string[], target: number): string | null {
  let run = 0;
  let prev: string | null = null;
  for (const d of dates) {
    const prevD = prev ? new Date(`${prev}T12:00:00`).getTime() : null;
    const isNext = prevD !== null && Math.round((new Date(`${d}T12:00:00`).getTime() - prevD) / 86_400_000) === 1;
    run = isNext ? run + 1 : 1;
    if (run === target) return d;
    prev = d;
  }
  return null;
}
if (doneDates.length) {
  unlock["streak-7"] = firstRunReached(doneDates, 7);
  unlock["streak-30"] = firstRunReached(doneDates, 30);
}
const checkinDates = checkinRows.map((c) => c.date).sort();
unlock["checkin-30"] = firstRunReached(checkinDates, 30);

/* XP kumulatif: log×10 + workout×25 + jurnal×15 + checkin×5 — cari tanggal saat melewati 500. */
const xpEvents: Array<{ date: string; xp: number }> = [
  ...logRows.filter((l) => l.status === "done").map((l) => ({ date: l.date, xp: 10 })),
  ...legacyWorkouts.map((r) => ({ date: String(val(r, 2)), xp: 25 })),
  ...legacyMood.map((r) => ({ date: String(val(r, 0)), xp: 5 })),
];
xpEvents.sort((a, b) => a.date.localeCompare(b.date));
let cum = 0;
for (const e of xpEvents) {
  cum += e.xp;
  if (cum >= 500) {
    unlock["xp-500"] = e.date;
    break;
  }
}

let unlockedCount = 0;
for (const [key, at] of Object.entries(unlock)) {
  if (!at) continue;
  const exists = await db.achievement.findUnique({ where: { key } });
  if (!exists) continue;
  await db.achievement.update({ where: { key }, data: { unlockedAt: at } });
  unlockedCount++;
}

/* ---------------- 5. ringkasan ---------------- */

const [nWallet, nHabit, nLog, nTx, nBudget, nGoal, nCheckin, nBody, nWorkout] = await Promise.all([
  db.wallet.count(),
  db.habit.count(),
  db.habitLog.count(),
  db.transaction.count(),
  db.budget.count(),
  db.savingsGoal.count(),
  db.checkIn.count(),
  db.bodyMetric.count(),
  db.workout.count(),
]);

console.log("\n✅ Migrasi selesai:");
console.log(`   Wallet       : ${nWallet}`);
console.log(`   Habit        : ${nHabit}`);
console.log(`   HabitLog     : ${nLog}`);
console.log(`   Transaction  : ${nTx}`);
console.log(`   Budget       : ${nBudget}`);
console.log(`   SavingsGoal  : ${nGoal}`);
console.log(`   CheckIn      : ${nCheckin}`);
console.log(`   BodyMetric   : ${nBody}`);
console.log(`   Workout      : ${nWorkout}`);
console.log(`   Achievement  : ${unlockedCount} unlocked dari data asli`);
console.log(`   Profile      : dailyMissionTarget = ${Number.isFinite(dailyGoal) ? dailyGoal : 4}`);

await db.$disconnect();
