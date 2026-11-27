import { NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";
import { isValidDateStr, isValidTimeStr } from "@/lib/rutina/format";
import { ensureAchievementCatalog } from "@/lib/rutina/catalog-ensure";

export const dynamic = "force-dynamic";

// Field whitelist per model (payload dari /api/export)
type Row = Record<string, unknown>;

const MAX_PAYLOAD_CHARS = 10_000_000;
/** Pra-cek byte: JSON ASCII ~1 byte/char; 15 MB memberi ruang aman utk multibyte. */
const MAX_PAYLOAD_BYTES = 15_000_000;
const TX_TYPES = ["income", "expense", "transfer"];

// audit B1-B3: pembulatan uang di batas payload (2 desimal)
const round2 = (n: number) => Math.round(n * 100) / 100;
// audit B1-B3: batas nominal uang — baris yang melebihi ini dibuang (dihitung)
const MONEY_CAP = 1e12;

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
  // audit B1-B3: caps meniru POST /api/habits — potong field, jangan tolak baris
  const unitTarget = numOrNull(r.unitTarget);
  const unitStep = num(r.unitStep);
  const reminderTime = strOrNull(r.reminderTime);
  return {
    id: str(r.id),
    name: str(r.name)?.slice(0, 80),
    category: str(r.category),
    icon: str(r.icon)?.slice(0, 40),
    color: str(r.color),
    scheduleType: str(r.scheduleType),
    daysOfWeek: str(r.daysOfWeek),
    timeOfDay: str(r.timeOfDay),
    unitLabel: strOrNull(r.unitLabel)?.slice(0, 24) ?? null,
    // audit B1-B3: unit <= 0 / tidak finite → undefined (habit jatuh ke check-only)
    unitTarget: unitTarget != null && unitTarget > 0 ? unitTarget : undefined,
    unitStep: unitStep != null && unitStep > 0 ? unitStep : undefined,
    // audit B1-B3: reminderTime format salah → field dibuang (null), baris tetap dipulihkan
    reminderTime: reminderTime && isValidTimeStr(reminderTime) ? reminderTime : null,
    stackAfter: strOrNull(r.stackAfter)?.slice(0, 120) ?? null,
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
    title: strOrNull(r.title)?.slice(0, 120) ?? null, // audit B1-B3
    date: str(r.date) ?? "",
    startTime: strOrNull(r.startTime),
    durationMin: num(r.durationMin) ?? 0,
    distanceKm: numOrNull(r.distanceKm),
    calories: numOrNull(r.calories),
    paceMin: numOrNull(r.paceMin),
    notes: strOrNull(r.notes)?.slice(0, 500) ?? null, // audit B1-B3
    strength: strOrNull(r.strength),
  };
}

function pickFoodEntry(r: Row) {
  return {
    id: str(r.id),
    name: (str(r.name) ?? "").slice(0, 120), // audit B1-B3
    portion: strOrNull(r.portion)?.slice(0, 60) ?? null, // audit B1-B3
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
    note: strOrNull(r.note)?.slice(0, 500) ?? null, // audit B1-B3
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
    name: (str(r.name) ?? "").slice(0, 60), // audit B1-B3
    type: str(r.type) ?? "cash",
    initialBalance: round2(num(r.initialBalance) ?? 0), // audit B1-B3
    color: str(r.color) ?? "teal",
    icon: str(r.icon) ?? "wallet",
    archived: bool(r.archived),
  };
}

function pickTransaction(r: Row) {
  return {
    id: str(r.id),
    type: str(r.type) ?? "expense",
    amount: round2(num(r.amount) ?? 0), // audit B1-B3: bulatkan 2 desimal
    category: (str(r.category) ?? "lainnya").slice(0, 60), // audit B1-B3
    walletId: str(r.walletId) ?? "",
    toWalletId: strOrNull(r.toWalletId),
    date: str(r.date) ?? "",
    note: strOrNull(r.note)?.slice(0, 500) ?? null, // audit B1-B3
    recurring: str(r.recurring) ?? "none",
  };
}

function pickBudget(r: Row) {
  return {
    id: str(r.id),
    category: (str(r.category) ?? "lainnya").slice(0, 60), // audit B1-B3
    monthlyLimit: round2(num(r.monthlyLimit) ?? 0), // audit B1-B3
  };
}

function pickSavingsGoal(r: Row) {
  return {
    id: str(r.id),
    name: (str(r.name) ?? "").slice(0, 120), // audit B1-B3
    targetAmount: round2(num(r.targetAmount) ?? 0), // audit B1-B3
    currentAmount: round2(num(r.currentAmount) ?? 0), // audit B1-B3
    deadline: strOrNull(r.deadline),
    color: str(r.color) ?? "teal",
    icon: str(r.icon) ?? "piggy-bank",
  };
}

function pickJournalEntry(r: Row) {
  return {
    id: str(r.id),
    title: (str(r.title) ?? "").slice(0, 200), // audit B1-B3
    content: (str(r.content) ?? "").slice(0, 50_000), // audit B1-B3
    folder: str(r.folder) ?? "Umum",
    mood: strOrNull(r.mood),
    pinned: bool(r.pinned),
    wordCount: num(r.wordCount) ?? 0,
    createdAt: str(r.createdAt),
    updatedAt: str(r.updatedAt),
  };
}

// audit C1: katalog makanan ikut dipulihkan (item buatan pengguna)
function pickFoodItem(r: Row) {
  return {
    id: str(r.id),
    name: (str(r.name) ?? "").slice(0, 120),
    calories: round2(num(r.calories) ?? 0),
    protein: numOrNull(r.protein),
    carbs: numOrNull(r.carbs),
    fat: numOrNull(r.fat),
    serving: strOrNull(r.serving)?.slice(0, 60) ?? null,
  };
}

// audit C1: status piala ikut dipulihkan (progres pengguna, bukan reset)
function pickAchievement(r: Row) {
  return {
    key: str(r.key),
    unlockedAt: strOrNull(r.unlockedAt) ?? null,
  };
}

function asArray(v: unknown): Row[] {
  return Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Row[]) : [];
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
 * Wajib konfirmasi eksplisit `{ confirm: "PULIHKAN DATA" }` + field `exportedAt`
 * (audit B1-A2) — endpoint ini menghapus seluruh tabel data.
 * Hapus lalu recreate seluruh tabel data dalam SATU transaksi; id asli dipertahankan
 * agar relasi tetap utuh. Payload divalidasi dulu: duplikat → 400, baris tidak valid
 * dibuang dan dihitung, FK-violating rows dibuang & dihitung (bukan hard 400).
 */
export async function POST(req: Request) {
  try {
    // (audit B1-Medium) cek same-origin lokal dihapus — middleware.ts sudah
    // menegakkan CSRF same-origin untuk semua mutasi /api.

    // Pra-cek Content-Length SEBELUM membuffer body — mencegah body multi-GB
    // dibaca penuh ke memori hanya untuk ditolak belakangan.
    // (audit B1-Medium) header wajib ada — tanpa itu pra-cek ukuran tak bisa diandalkan
    const contentLengthHeader = req.headers.get("content-length");
    if (contentLengthHeader == null || contentLengthHeader.trim() === "") {
      return NextResponse.json({ error: "Content-Length wajib ada" }, { status: 411 });
    }
    const declaredBytes = Number(contentLengthHeader);
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

    // audit B1-A2: gerbang konfirmasi eksplisit — import menghapus seluruh DB
    if (body?.confirm !== "PULIHKAN DATA") {
      return NextResponse.json(
        { error: "Ketik PULIHKAN DATA untuk konfirmasi pemulihan" },
        { status: 400 }
      );
    }
    // audit B1-A2: sanity — berkas harus benar-benar berasal dari /api/export
    if (typeof body.exportedAt !== "string" || !body.exportedAt) {
      return NextResponse.json(
        { error: "File bukan cadangan Rutina (exportedAt tidak ditemukan)" },
        { status: 400 }
      );
    }

    // ===== Baris tidak valid dibuang & dihitung (tidak pernah FK-violating) =====
    const dropped: Record<string, number> = {};
    const bump = (k: string) => {
      dropped[k] = (dropped[k] ?? 0) + 1;
    };

    // audit B1-B3: filter pick ikut menjatuhkan baris dengan nominal tak masuk akal
    const wallets = asArray(body.wallets)
      .map(pickWallet)
      .filter((w) => {
        const ok = w.id && w.name && w.initialBalance <= MONEY_CAP;
        if (!ok) bump("wallets");
        return ok;
      });
    const habits = asArray(body.habits).map(pickHabit).filter((h) => h.id && h.name);
    const habitLogs = asArray(body.habitLogs)
      .map(pickHabitLog)
      .filter((l) => l.id && l.habitId && l.date && habits.some((h) => h.id === l.habitId));
    const workouts = asArray(body.workouts).map(pickWorkout).filter((w) => w.id && w.date);
    const foodEntries = asArray(body.foodEntries).map(pickFoodEntry).filter((f) => f.id);
    const checkins = asArray(body.checkins).map(pickCheckIn).filter((c) => c.id && c.date);
    const bodyMetrics = asArray(body.bodyMetrics).map(pickBodyMetric).filter((m) => m.id && m.date);
    const budgets = asArray(body.budgets)
      .map(pickBudget)
      .filter((b) => {
        const ok = b.id && b.monthlyLimit <= MONEY_CAP; // audit B1-B3
        if (!ok) bump("budgets");
        return ok;
      });
    const savingsGoals = asArray(body.savingsGoals)
      .map(pickSavingsGoal)
      .filter((g) => {
        const ok = g.id && g.name && g.targetAmount <= MONEY_CAP; // audit B1-B3
        if (!ok) bump("savingsGoals");
        return ok;
      });
    const journalEntries = asArray(body.journalEntries)
      .map(pickJournalEntry)
      .filter((j) => j.id && j.content);
    const transactions = asArray(body.transactions)
      .map(pickTransaction)
      .filter((t) => t.id && t.date);
    // audit C1: koleksi referensi/progres — opsional (cadangan lama tanpa
    // kedua koleksi ini tetap dipulihkan seperti semula)
    const foodItemsPayload = Array.isArray(body.foodItems)
      ? asArray(body.foodItems).map(pickFoodItem).filter((f) => {
          const ok = f.id && f.name && f.calories >= 0 && f.calories <= MONEY_CAP;
          if (!ok) bump("foodItems");
          return ok;
        })
      : null;
    const achievementsPayload = Array.isArray(body.achievements)
      ? asArray(body.achievements).map(pickAchievement).filter((a) => {
          const ok = Boolean(a.key);
          if (!ok) bump("achievements");
          return ok;
        })
      : null;

    // audit B1-A2: seluruh koleksi kosong → tidak ada yang bisa dipulihkan
    if (
      wallets.length === 0 &&
      habits.length === 0 &&
      habitLogs.length === 0 &&
      workouts.length === 0 &&
      foodEntries.length === 0 &&
      checkins.length === 0 &&
      bodyMetrics.length === 0 &&
      transactions.length === 0 &&
      budgets.length === 0 &&
      savingsGoals.length === 0 &&
      journalEntries.length === 0 &&
      (foodItemsPayload?.length ?? 0) === 0 &&
      (achievementsPayload?.length ?? 0) === 0
    ) {
      return NextResponse.json(
        { error: "Cadangan kosong — tidak ada yang dipulihkan" },
        { status: 400 }
      );
    }

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
    // audit C1: id/kunci duplikat pada koleksi baru → 400
    if (foodItemsPayload) {
      const dupFood = findDupId(foodItemsPayload, "katalog makanan");
      if (dupFood) {
        return NextResponse.json(
          { error: "Payload berisi id duplikat pada data katalog makanan" },
          { status: 400 }
        );
      }
    }
    if (achievementsPayload) {
      const seenKeys = new Set<string>();
      for (const a of achievementsPayload) {
        const key = a.key as string;
        if (seenKeys.has(key)) {
          return NextResponse.json(
            { error: `Payload berisi piala duplikat untuk kunci ${key}` },
            { status: 400 }
          );
        }
        seenKeys.add(key);
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
        // audit B1-Medium: hidrasi 0 gelas sah (selaras POST /api/body-metrics)
        (m.hydrationGlasses == null || m.hydrationGlasses >= 0);
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
      if (
        !TX_TYPES.includes(t.type) ||
        !isValidDateStr(t.date) ||
        !(t.amount > 0) ||
        t.amount > MONEY_CAP // audit B1-B3: nominal tak masuk akal → dibuang
      ) {
        bump("transactions");
        continue;
      }
      // audit B1-Medium: FK gagal (wallet hilang) → baris dibuang & dihitung,
      // kebijakan konsisten untuk income/expense maupun transfer (bukan hard 400)
      if (!walletIds.has(t.walletId) || (t.toWalletId != null && !walletIds.has(t.toWalletId))) {
        bump("transactions");
        continue;
      }
      if (t.type === "transfer" && !t.toWalletId) {
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
    // audit C1: pastikan definisi piala lengkap sebelum status piala diterapkan
    // (cadangan lama/baru sama-sama butuh definisi katalog di DB).
    await ensureAchievementCatalog();

    const txResult = await db.$transaction(
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

        // audit C1: katalog makanan — hanya ditimpa bila payload membawa koleksi
        // itu (cadangan lama tanpa foodItems tidak menghapus item yang ada).
        let restoredFoodItems = 0;
        if (foodItemsPayload) {
          await tx.foodItem.deleteMany({});
          if (foodItemsPayload.length)
            await tx.foodItem.createMany({ data: foodItemsPayload });
          restoredFoodItems = foodItemsPayload.length;
        }

        // audit C1: status piala — progres pengguna dipulihkan dari cadangan.
        // Payload tanpa koleksi achievements (cadangan lama) tetap direset
        // (perilaku lama), kini definisi piala dijamin lengkap.
        let restoredAchievements = 0;
        if (achievementsPayload) {
          const byKey = new Map(
            achievementsPayload.map((a) => [a.key as string, a.unlockedAt ?? null])
          );
          const defs = await tx.achievement.findMany({ select: { key: true } });
          for (const def of defs) {
            await tx.achievement.update({
              where: { key: def.key },
              data: { unlockedAt: byKey.get(def.key) ?? null },
            });
          }
          restoredAchievements = byKey.size;
        } else {
          // Import = pemulihan penuh: profil diterapkan & status piala direset
          await tx.achievement.updateMany({ data: { unlockedAt: null } });
        }

        // Import = pemulihan penuh: profil diterapkan
        if (p) {
          await tx.profile.upsert({
            where: { id: "main" },
            update: profileData,
            create: { id: "main", ...profileData },
          });
        }
        return { restoredFoodItems, restoredAchievements };
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
        foodItems: txResult.restoredFoodItems,
        achievements: txResult.restoredAchievements,
      },
      dropped,
    });
  } catch (e) {
    console.error("import error", e);
    return NextResponse.json({ error: "Gagal memulihkan data dari cadangan" }, { status: 500 });
  }
}
