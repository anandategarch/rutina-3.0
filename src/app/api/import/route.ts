import { NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";
import { isValidDateStr } from "@/lib/rutina/format";

export const dynamic = "force-dynamic";

// Field whitelist per model (payload dari /api/export)
type Row = Record<string, unknown>;

const MAX_PAYLOAD_CHARS = 10_000_000;
/** Pra-cek byte: JSON ASCII ~1 byte/char; 15 MB memberi ruang aman utk multibyte. */
const MAX_PAYLOAD_BYTES = 15_000_000;
const TX_TYPES = ["income", "expense", "transfer"];

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

function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

/** Parser tanggal aman: string ISO tidak bisa diparse → null (baris dilewati). */
function safeDate(v: unknown): Date | null {
  if (typeof v !== "string" || v === "") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Deteksi id duplikat pada sebuah koleksi; kembalikan label bila ada. */
function findDupId(rows: { id: unknown }[], label: string): string | null {
  const seen = new Set<string>();
  for (const r of rows) {
    const id = typeof r.id === "string" ? r.id : "";
    if (!id) continue;
    if (seen.has(id)) return label;
    seen.add(id);
  }
  return null;
}

/**
 * POST /api/import — pulihkan data dari payload /api/export?format=json.
 * Hapus lalu recreate seluruh tabel data dalam SATU transaksi; id asli dipertahankan
 * agar relasi tetap utuh. Payload divalidasi dulu: duplikat → 400, baris tidak valid
 * dibuang dan dihitung, FK-violating rows tidak pernah dimasukkan.
 */
export async function POST(req: Request) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: "Permintaan dari origin tidak diizinkan" }, { status: 403 });
    }

    // Pra-cek Content-Length SEBELUM membuffer body — mencegah body multi-GB
    // dibaca penuh ke memori hanya untuk ditolak belakangan.
    const declaredBytes = Number(req.headers.get("content-length") ?? 0);
    if (Number.isFinite(declaredBytes) && declaredBytes > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { error: "Payload terlalu besar (maksimal 10 juta karakter)" },
        { status: 413 }
      );
    }

    const raw = await req.text();
    if (raw.length > MAX_PAYLOAD_CHARS) {
      return NextResponse.json(
        { error: "Payload terlalu besar (maksimal 10 juta karakter)" },
        { status: 413 }
      );
    }

    let body: Row | null = null;
    try {
      body = JSON.parse(raw) as Row;
    } catch {
      body = null;
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
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
      .filter((t) => t.id && t.date);

    // ===== Pre-validasi: id duplikat → 400 =====
    const dupChecks: [{ id: unknown }[], string][] = [
      [wallets, "dompet"],
      [habits, "kebiasaan"],
      [habitLogs, "log kebiasaan"],
      [workouts, "latihan"],
      [foodEntries, "asupan"],
      [checkins, "check-in"],
      [bodyMetrics, "metrik tubuh"],
      [transactions, "transaksi"],
      [budgets, "anggaran"],
      [savingsGoals, "tujuan tabungan"],
      [journalEntries, "catatan jurnal"],
    ];
    for (const [rows, label] of dupChecks) {
      const dup = findDupId(rows, label);
      if (dup) {
        return NextResponse.json(
          { error: `Payload berisi id duplikat pada data ${dup}` },
          { status: 400 }
        );
      }
    }

    // ===== Pre-validasi: kunci unik natural duplikat → 400 =====
    const seenLogKey = new Set<string>();
    for (const l of habitLogs) {
      const key = `${l.habitId}|${l.date}`;
      if (seenLogKey.has(key)) {
        return NextResponse.json(
          { error: `Payload berisi log kebiasaan duplikat untuk pasangan habitId+date: ${key}` },
          { status: 400 }
        );
      }
      seenLogKey.add(key);
    }
    const seenCheckinDate = new Set<string>();
    for (const c of checkins) {
      if (seenCheckinDate.has(c.date)) {
        return NextResponse.json(
          { error: `Payload berisi check-in duplikat untuk tanggal ${c.date}` },
          { status: 400 }
        );
      }
      seenCheckinDate.add(c.date);
    }
    const seenMetricDate = new Set<string>();
    for (const m of bodyMetrics) {
      if (seenMetricDate.has(m.date)) {
        return NextResponse.json(
          { error: `Payload berisi metrik tubuh duplikat untuk tanggal ${m.date}` },
          { status: 400 }
        );
      }
      seenMetricDate.add(m.date);
    }
    const seenBudgetCat = new Set<string>();
    for (const b of budgets) {
      if (seenBudgetCat.has(b.category)) {
        return NextResponse.json(
          { error: `Payload berisi anggaran duplikat untuk kategori ${b.category}` },
          { status: 400 }
        );
      }
      seenBudgetCat.add(b.category);
    }

    // ===== Baris tidak valid dibuang & dihitung (tidak pernah FK-violating) =====
    const dropped: Record<string, number> = {};
    const bump = (k: string) => {
      dropped[k] = (dropped[k] ?? 0) + 1;
    };

    const validWorkouts = workouts.filter((w) => {
      const ok = isValidDateStr(w.date) && w.durationMin > 0;
      if (!ok) bump("workouts");
      return ok;
    });
    const validFoodEntries = foodEntries.filter((f) => {
      const ok = isValidDateStr(f.date) && f.calories >= 0;
      if (!ok) bump("foodEntries");
      return ok;
    });
    const validHabitLogs = habitLogs.filter((l) => {
      const ok = isValidDateStr(l.date);
      if (!ok) bump("habitLogs");
      return ok;
    });

    const clamp1to5 = (v: number | null | undefined): number | null =>
      v == null ? null : Math.min(5, Math.max(1, Math.round(v)));
    const validCheckins: typeof checkins = [];
    for (const c of checkins) {
      if (!isValidDateStr(c.date) || (c.sleepHours != null && c.sleepHours < 0)) {
        bump("checkins");
        continue;
      }
      validCheckins.push({
        ...c,
        mood: clamp1to5(c.mood),
        energy: clamp1to5(c.energy),
        soreness: clamp1to5(c.soreness),
        stress: clamp1to5(c.stress),
      });
    }

    const validBodyMetrics = bodyMetrics.filter((m) => {
      const ok =
        isValidDateStr(m.date) &&
        (m.weightKg == null || m.weightKg > 0) &&
        (m.hydrationGlasses == null || m.hydrationGlasses > 0);
      if (!ok) bump("bodyMetrics");
      return ok;
    });

    const validBudgets = budgets.filter((b) => {
      const ok = b.monthlyLimit > 0;
      if (!ok) bump("budgets");
      return ok;
    });

    const validSavingsGoals = savingsGoals.filter((g) => {
      const ok =
        g.targetAmount > 0 &&
        g.currentAmount >= 0 &&
        (g.deadline == null || isValidDateStr(g.deadline));
      if (!ok) bump("savingsGoals");
      return ok;
    });

    // Jurnal: createdAt/updatedAt diparse aman — Invalid Date → baris dilewati
    const journalParsed = journalEntries.map((j) => ({
      ...j,
      createdAt: j.createdAt ? safeDate(j.createdAt) : undefined,
      updatedAt: j.updatedAt ? safeDate(j.updatedAt) : undefined,
    }));
    const validJournalEntries = journalParsed.filter((j) => {
      const ok = j.createdAt !== null && j.updatedAt !== null;
      if (!ok) bump("journalEntries");
      return ok;
    });

    // ===== Transaksi: validasi FK + transfer =====
    const walletIds = new Set<string>();
    for (const w of wallets) {
      if (w.id) walletIds.add(w.id);
    }
    const validTransactions: typeof transactions = [];
    for (const t of transactions) {
      if (!TX_TYPES.includes(t.type) || !isValidDateStr(t.date) || !(t.amount > 0)) {
        bump("transactions");
        continue;
      }
      if (t.type === "transfer") {
        // Transfer wajib merujuk DUA dompet yang ada di payload (integritas data dulu)
        if (!t.toWalletId || !walletIds.has(t.walletId) || !walletIds.has(t.toWalletId)) {
          return NextResponse.json(
            {
              error: `Transaksi transfer dengan id ${t.id} tidak valid: walletId dan toWalletId wajib merujuk dompet yang ada di payload`,
            },
            { status: 400 }
          );
        }
        validTransactions.push(t);
        continue;
      }
      if (!walletIds.has(t.walletId) || (t.toWalletId != null && !walletIds.has(t.toWalletId))) {
        bump("transactions");
        continue;
      }
      validTransactions.push(t);
    }

    // Profil opsional (whitelist)
    const p = body.profile && typeof body.profile === "object" ? (body.profile as Row) : null;
    const profileData: { name?: string; identityVoice?: string; dailyMissionTarget?: number } = {};
    if (p) {
      if (typeof p.name === "string" && p.name.trim()) profileData.name = p.name.trim();
      if (typeof p.identityVoice === "string" && p.identityVoice.trim())
        profileData.identityVoice = p.identityVoice;
      const target = Number(p.dailyMissionTarget);
      if (Number.isInteger(target) && target >= 1 && target <= 20)
        profileData.dailyMissionTarget = target;
    }

    // ===== Eksekusi atomik: hapus + recreate dalam satu transaksi =====
    await db.$transaction(
      async (tx) => {
        // ===== Fase hapus (urutan aman FK) =====
        await tx.habitLog.deleteMany({});
        await tx.transaction.deleteMany({});
        await tx.habit.deleteMany({});
        await tx.workout.deleteMany({});
        await tx.foodEntry.deleteMany({});
        await tx.checkIn.deleteMany({});
        await tx.bodyMetric.deleteMany({});
        await tx.budget.deleteMany({});
        await tx.savingsGoal.deleteMany({});
        await tx.journalEntry.deleteMany({});
        await tx.wallet.deleteMany({});

        // ===== Fase recreate (induk dulu, lalu anak) =====
        if (wallets.length) await tx.wallet.createMany({ data: wallets });
        if (habits.length)
          await tx.habit.createMany({
            data: habits.map((h) => ({ ...h, id: h.id as string, name: h.name as string })),
          });
        if (validWorkouts.length) await tx.workout.createMany({ data: validWorkouts });
        if (validFoodEntries.length) await tx.foodEntry.createMany({ data: validFoodEntries });
        if (validCheckins.length) await tx.checkIn.createMany({ data: validCheckins });
        if (validBodyMetrics.length) await tx.bodyMetric.createMany({ data: validBodyMetrics });
        if (validBudgets.length) await tx.budget.createMany({ data: validBudgets });
        if (validSavingsGoals.length) await tx.savingsGoal.createMany({ data: validSavingsGoals });
        if (validJournalEntries.length) {
          await tx.journalEntry.createMany({
            data: validJournalEntries.map((j) => {
              const { createdAt, updatedAt, ...rest } = j;
              return {
                ...rest,
                ...(createdAt ? { createdAt } : {}),
                ...(updatedAt ? { updatedAt } : {}),
              };
            }),
          });
        }
        if (validHabitLogs.length)
          await tx.habitLog.createMany({
            data: validHabitLogs.map((l) => ({
              ...l,
              id: l.id as string,
              habitId: l.habitId as string,
              date: l.date as string,
            })),
          });
        if (validTransactions.length)
          await tx.transaction.createMany({ data: validTransactions });

        // Import = pemulihan penuh: profil diterapkan & status piala direset
        if (p) {
          await tx.profile.upsert({
            where: { id: "main" },
            update: profileData,
            create: { id: "main", ...profileData },
          });
        }
        await tx.achievement.updateMany({ data: { unlockedAt: null } });
      },
      { timeout: 30_000 }
    );

    return NextResponse.json({
      ok: true,
      restored: {
        wallets: wallets.length,
        habits: habits.length,
        habitLogs: validHabitLogs.length,
        workouts: validWorkouts.length,
        foodEntries: validFoodEntries.length,
        checkins: validCheckins.length,
        bodyMetrics: validBodyMetrics.length,
        transactions: validTransactions.length,
        budgets: validBudgets.length,
        savingsGoals: validSavingsGoals.length,
        journalEntries: validJournalEntries.length,
      },
      dropped,
    });
  } catch (e) {
    console.error("import error", e);
    return NextResponse.json({ error: "Gagal memulihkan data dari cadangan" }, { status: 500 });
  }
}
