import { NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";

export const dynamic = "force-dynamic";

// Field whitelist per model (payload dari /api/export)
type Row = Record<string, unknown>;

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}
function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}
function numOrNull(v: unknown): number | null | undefined {
  if (v === null) return null;
  return num(v);
}
function strOrNull(v: unknown): string | null | undefined {
  if (v === null) return null;
  return str(v);
}
function bool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function pickHabit(r: Row) {
  return {
    id: str(r.id),
    name: str(r.name),
    category: str(r.category),
    icon: str(r.icon),
    color: str(r.color),
    scheduleType: str(r.scheduleType),
    daysOfWeek: str(r.daysOfWeek),
    timeOfDay: str(r.timeOfDay),
    unitLabel: strOrNull(r.unitLabel),
    unitTarget: numOrNull(r.unitTarget),
    unitStep: num(r.unitStep) ?? 1,
    reminderTime: strOrNull(r.reminderTime),
    stackAfter: strOrNull(r.stackAfter),
    archived: bool(r.archived),
  };
}

function pickHabitLog(r: Row) {
  return {
    id: str(r.id),
    habitId: str(r.habitId),
    date: str(r.date),
    status: str(r.status) ?? "done",
    value: numOrNull(r.value),
    note: strOrNull(r.note),
  };
}

function pickWorkout(r: Row) {
  return {
    id: str(r.id),
    type: str(r.type) ?? "run",
    title: strOrNull(r.title),
    date: str(r.date) ?? "",
    startTime: strOrNull(r.startTime),
    durationMin: num(r.durationMin) ?? 0,
    distanceKm: numOrNull(r.distanceKm),
    calories: numOrNull(r.calories),
    paceMin: numOrNull(r.paceMin),
    notes: strOrNull(r.notes),
    strength: strOrNull(r.strength),
  };
}

function pickFoodEntry(r: Row) {
  return {
    id: str(r.id),
    name: str(r.name) ?? "",
    portion: strOrNull(r.portion),
    calories: num(r.calories) ?? 0,
    protein: numOrNull(r.protein),
    carbs: numOrNull(r.carbs),
    fat: numOrNull(r.fat),
    meal: str(r.meal) ?? "lunch",
    date: str(r.date) ?? "",
  };
}

function pickCheckIn(r: Row) {
  return {
    id: str(r.id),
    date: str(r.date) ?? "",
    mood: numOrNull(r.mood),
    energy: numOrNull(r.energy),
    soreness: numOrNull(r.soreness),
    stress: numOrNull(r.stress),
    sleepHours: numOrNull(r.sleepHours),
    note: strOrNull(r.note),
  };
}

function pickBodyMetric(r: Row) {
  return {
    id: str(r.id),
    date: str(r.date) ?? "",
    weightKg: numOrNull(r.weightKg),
    hydrationGlasses: numOrNull(r.hydrationGlasses),
  };
}

function pickWallet(r: Row) {
  return {
    id: str(r.id),
    name: str(r.name) ?? "",
    type: str(r.type) ?? "cash",
    initialBalance: num(r.initialBalance) ?? 0,
    color: str(r.color) ?? "teal",
    icon: str(r.icon) ?? "wallet",
    archived: bool(r.archived),
  };
}

function pickTransaction(r: Row) {
  return {
    id: str(r.id),
    type: str(r.type) ?? "expense",
    amount: num(r.amount) ?? 0,
    category: str(r.category) ?? "lainnya",
    walletId: str(r.walletId) ?? "",
    toWalletId: strOrNull(r.toWalletId),
    date: str(r.date) ?? "",
    note: strOrNull(r.note),
    recurring: str(r.recurring) ?? "none",
  };
}

function pickBudget(r: Row) {
  return {
    id: str(r.id),
    category: str(r.category) ?? "lainnya",
    monthlyLimit: num(r.monthlyLimit) ?? 0,
  };
}

function pickSavingsGoal(r: Row) {
  return {
    id: str(r.id),
    name: str(r.name) ?? "",
    targetAmount: num(r.targetAmount) ?? 0,
    currentAmount: num(r.currentAmount) ?? 0,
    deadline: strOrNull(r.deadline),
    color: str(r.color) ?? "teal",
    icon: str(r.icon) ?? "piggy-bank",
  };
}

function pickJournalEntry(r: Row) {
  return {
    id: str(r.id),
    title: str(r.title) ?? "",
    content: str(r.content) ?? "",
    folder: str(r.folder) ?? "Umum",
    mood: strOrNull(r.mood),
    pinned: bool(r.pinned),
    wordCount: num(r.wordCount) ?? 0,
    createdAt: str(r.createdAt),
    updatedAt: str(r.updatedAt),
  };
}

function asArray(v: unknown): Row[] {
  return Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Row[]) : [];
}

/**
 * POST /api/import — pulihkan data dari payload /api/export?format=json.
 * Hapus lalu recreate seluruh tabel data; id asli dipertahankan agar relasi tetap utuh.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Row;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });
    }

    const wallets = asArray(body.wallets).map(pickWallet).filter((w) => w.id && w.name);
    const habits = asArray(body.habits).map(pickHabit).filter((h) => h.id && h.name);
    const habitLogs = asArray(body.habitLogs)
      .map(pickHabitLog)
      .filter((l) => l.id && l.habitId && l.date && habits.some((h) => h.id === l.habitId));
    const workouts = asArray(body.workouts).map(pickWorkout).filter((w) => w.id && w.date);
    const foodEntries = asArray(body.foodEntries).map(pickFoodEntry).filter((f) => f.id);
    const checkins = asArray(body.checkins).map(pickCheckIn).filter((c) => c.id && c.date);
    const bodyMetrics = asArray(body.bodyMetrics).map(pickBodyMetric).filter((m) => m.id && m.date);
    const budgets = asArray(body.budgets).map(pickBudget).filter((b) => b.id);
    const savingsGoals = asArray(body.savingsGoals).map(pickSavingsGoal).filter((g) => g.id && g.name);
    const journalEntries = asArray(body.journalEntries)
      .map(pickJournalEntry)
      .filter((j) => j.id && j.content);
    const transactions = asArray(body.transactions)
      .map(pickTransaction)
      .filter((t) => t.id && t.date && wallets.some((w) => w.id === t.walletId));

    // ===== Fase hapus (urutan aman FK) =====
    await db.habitLog.deleteMany({});
    await db.transaction.deleteMany({});
    await db.habit.deleteMany({});
    await db.workout.deleteMany({});
    await db.foodEntry.deleteMany({});
    await db.checkIn.deleteMany({});
    await db.bodyMetric.deleteMany({});
    await db.budget.deleteMany({});
    await db.savingsGoal.deleteMany({});
    await db.journalEntry.deleteMany({});
    await db.wallet.deleteMany({});

    // ===== Fase recreate (induk dulu, lalu anak) =====
    if (wallets.length) await db.wallet.createMany({ data: wallets });
    if (habits.length)
      await db.habit.createMany({
        data: habits.map((h) => ({ ...h, id: h.id as string, name: h.name as string })),
      });
    if (workouts.length) await db.workout.createMany({ data: workouts });
    if (foodEntries.length) await db.foodEntry.createMany({ data: foodEntries });
    if (checkins.length) await db.checkIn.createMany({ data: checkins });
    if (bodyMetrics.length) await db.bodyMetric.createMany({ data: bodyMetrics });
    if (budgets.length) await db.budget.createMany({ data: budgets });
    if (savingsGoals.length) await db.savingsGoal.createMany({ data: savingsGoals });
    if (journalEntries.length) {
      await db.journalEntry.createMany({
        data: journalEntries.map((j) => {
          const { createdAt, updatedAt, ...rest } = j;
          return {
            ...rest,
            ...(createdAt ? { createdAt: new Date(createdAt) } : {}),
            ...(updatedAt ? { updatedAt: new Date(updatedAt) } : {}),
          };
        }),
      });
    }
    if (habitLogs.length)
      await db.habitLog.createMany({
        data: habitLogs.map((l) => ({
          ...l,
          id: l.id as string,
          habitId: l.habitId as string,
          date: l.date as string,
        })),
      });
    if (transactions.length) await db.transaction.createMany({ data: transactions });

    return NextResponse.json({
      ok: true,
      restored: {
        wallets: wallets.length,
        habits: habits.length,
        habitLogs: habitLogs.length,
        workouts: workouts.length,
        foodEntries: foodEntries.length,
        checkins: checkins.length,
        bodyMetrics: bodyMetrics.length,
        transactions: transactions.length,
        budgets: budgets.length,
        savingsGoals: savingsGoals.length,
        journalEntries: journalEntries.length,
      },
    });
  } catch (e) {
    console.error("import error", e);
    return NextResponse.json({ error: "Gagal memulihkan data dari cadangan" }, { status: 500 });
  }
}
