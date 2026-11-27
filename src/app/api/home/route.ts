import { NextResponse } from "next/server";
import { getXpData, computeStreaks, db } from "@/lib/rutina/server";
import { ensureQuoteCatalog } from "@/lib/rutina/catalog-ensure";
import {
  addDays,
  dayOfWeek,
  daysBetween,
  jakartaDateStr,
  jakartaToday,
  isValidDateStr,
  parseDateStr,
  rangeDays,
  startOfMonth,
  weekStart,
} from "@/lib/rutina/format";

export const dynamic = "force-dynamic";

// Hari acuan untuk indeks kutipan harian (berganti tiap tengah malam WIB)
const QUOTE_EPOCH = "2024-01-01";

export async function GET(req: Request) {
  try {
    const todayStr = jakartaToday();
    // audit B2-H2: ?date= opsional — default hari ini WIB; tanggal sampah → 400
    const dateParam = new URL(req.url).searchParams.get("date");
    const reqDate =
      dateParam === null ? todayStr : isValidDateStr(dateParam) ? dateParam : null;
    if (!reqDate) {
      return NextResponse.json({ error: "Format tanggal tidak valid" }, { status: 400 });
    }
    const dow = dayOfWeek(reqDate);

    // audit B2-M7: upsert — findFirst ?? create bisa balapan & membuat 2 baris profil
    const profile = await db.profile.upsert({
      where: { id: "main" },
      update: {},
      create: { id: "main" },
    });
    const xpData = await getXpData();

    // audit B2-H2: jendela log diperlebar agar log tanggal yang diminta tetap termuat
    // (buffer 7 hari di bawah batas lama), tanpa menggeser jendela rekap pekan/bulan
    const existingStart = addDays(todayStr, -40);
    const logsFrom = addDays(reqDate < existingStart ? reqDate : existingStart, -7);
    // audit B2-H3: log masa depan tidak boleh masuk payload beranda
    const habits = await db.habit.findMany({
      where: { archived: false },
      include: {
        logs: { where: { date: { gte: logsFrom, lte: todayStr } } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Agenda untuk tanggal yang diminta (bukan selalu hari ini) — audit B2-H2
    const agenda = habits
      .map((h) => ({
        habit: h,
        log: h.logs.find((l) => l.date === reqDate) ?? null,
        // audit B2-H2: scheduled dihitung sungguhan — dow cocok && habit sudah ada
        // sebelum tanggal tsb (bukan konstan true)
        scheduled:
          (h.scheduleType === "daily" || h.daysOfWeek.split(",").map(Number).includes(dow)) &&
          jakartaDateStr(h.createdAt) <= reqDate,
      }))
      .filter((a) => a.scheduled);

    const doneToday = agenda.filter(
      (a) =>
        a.log?.status === "done" ||
        (a.habit.unitTarget !== null && (a.log?.value ?? 0) >= (a.habit.unitTarget ?? Infinity))
    ).length;
    const missions = { done: doneToday, total: agenda.length };

    const streak = await computeStreaks();

    // ============ Rekap pekan (Senin-Minggu) ============
    const monday = weekStart(todayStr);
    const weekDates = rangeDays(monday, addDays(monday, 6));
    const prevMonday = addDays(monday, -7);
    const prevWeekDates = rangeDays(prevMonday, addDays(prevMonday, 6));
    const weekLogs = await db.habitLog.findMany({
      // Hanya log habit aktif — log habit terarsip tidak boleh menggelembungkan missionsDone
      where: { status: "done", date: { in: [...weekDates, ...prevWeekDates] }, habit: { archived: false } },
    });
    const doneByDate = new Map<string, number>();
    weekLogs.forEach((l) => doneByDate.set(l.date, (doneByDate.get(l.date) ?? 0) + 1));

    const habitsByDow = (ds: string) => {
      const d = dayOfWeek(ds);
      // Tanggal lampau: habit yang dibuat setelah tanggal tsb belum dijadwalkan saat itu
      // audit B2-H2: acuan "sekarang" = tanggal yang diminta (?date=), bukan selalu hari ini
      const createdBefore = ds < reqDate ? parseDateStr(ds) : null;
      return habits.filter((h) => {
        if (createdBefore && h.createdAt > createdBefore) return false;
        return h.scheduleType === "daily" || h.daysOfWeek.split(",").map(Number).includes(d);
      }).length;
    };
    const missionsDone = weekDates.reduce((acc, s) => acc + (doneByDate.get(s) ?? 0), 0);
    const missionsTotal = weekDates.reduce((acc, s) => acc + habitsByDow(s), 0);
    const prevDone = prevWeekDates.reduce((acc, s) => acc + (doneByDate.get(s) ?? 0), 0);
    const prevTotal = prevWeekDates.reduce((acc, s) => acc + habitsByDow(s), 0);

    const weekWorkouts = await db.workout.count({ where: { date: { in: weekDates } } });

    // ============ Arus kas ============
    // Muat hanya transaksi sejak awal bulan (atau awal pekan, mana yang lebih dulu)
    // — semua agregasi di bawah hanya menyentuh rentang tersebut.
    const monthStart = startOfMonth(todayStr);
    const txSince = monthStart <= monday ? monthStart : monday;
    const transactions = await db.transaction.findMany({
      where: { type: { in: ["income", "expense"] }, date: { gte: txSince } },
    });
    const cashToday = transactions
      .filter((t) => t.date === todayStr)
      .reduce(
        (acc, t) => {
          if (t.type === "income") acc.income += t.amount;
          else acc.expense += t.amount;
          return acc;
        },
        { income: 0, expense: 0 }
      );

    // ============ Sorotan Hari Ini ============
    let highlight: { kind: string; title: string; description: string; icon: string } | null = null;
    if (missions.total > 0 && missions.done === missions.total) {
      highlight = {
        kind: "bonus",
        title: "Semua misi tuntas!",
        description: "Bonus harian terkunci. Waktunya istirahat yang layak.",
        icon: "party-popper",
      };
    } else if (streak.current >= 2 && doneToday === 0) {
      highlight = {
        kind: "streak",
        title: `Streak ${streak.current} hari menunggumu`,
        description: "Selesaikan satu misi saja hari ini agar runtun tidak terputus.",
        icon: "flame",
      };
    } else {
      const budgets = await db.budget.findMany();
      const monthSpend = new Map<string, number>();
      transactions
        .filter((t) => t.type === "expense" && t.date >= monthStart && t.date <= todayStr)
        .forEach((t) => monthSpend.set(t.category, (monthSpend.get(t.category) ?? 0) + t.amount));
      const near = budgets
        .map((b) => ({ ...b, spent: monthSpend.get(b.category) ?? 0 }))
        // audit B2-M3: limit 0 → persentase tak bermakna (div/0), kategori dilewati
        .filter((b) => b.monthlyLimit > 0 && b.spent >= b.monthlyLimit * 0.75)
        .sort((a, b) => b.spent / b.monthlyLimit - a.spent / a.monthlyLimit)[0];
      if (near) {
        highlight = {
          kind: "budget",
          title: `Anggaran ${near.category} terpakai ${Math.round((near.spent / near.monthlyLimit) * 100)}%`,
          description: `Sisa ruang bulan ini: Rp ${(near.monthlyLimit - near.spent).toLocaleString("id-ID")}.`,
          icon: "wallet",
        };
      } else {
        const goal = (await db.savingsGoal.findMany({ orderBy: { currentAmount: "desc" } }))[0];
        // audit B2-M3: target 0 → persentase tak terdefinisi, sorotan goal dilewati
        if (goal && goal.targetAmount > 0) {
          highlight = {
            kind: "goal",
            title: `${goal.name}: ${Math.round((goal.currentAmount / goal.targetAmount) * 100)}% tercapai`,
            description: "Alokasikan sebagian arus masuk hari ini untuk mempercepat tujuan.",
            icon: "piggy-bank",
          };
        }
      }
    }

    // ============ Quote ============
    // Top-up katalog kutipan — beranda tidak boleh kehilangan kartu kutipan
    // hanya karena DB baru belum pernah di-seed.
    await ensureQuoteCatalog();
    // audit B2-M4: orderBy id — indeks harian deterministik atas urutan baris DB
    const quotes = await db.quote.findMany({ orderBy: { id: "asc" } });
    let quote: (typeof quotes)[number] | null = null;
    if (quotes.length > 0) {
      // Indeks hari stabil mengikuti tanggal WIB, bukan timestamp UTC mentah
      const dayIndex =
        ((daysBetween(QUOTE_EPOCH, todayStr) % quotes.length) + quotes.length) % quotes.length;
      quote = quotes[dayIndex];
    }

    // ============ Draft jurnal terakhir ============
    const journalDraftHint =
      (await db.journalEntry.findMany({ orderBy: { updatedAt: "desc" }, take: 1 }))[0] ?? null;

    // ============ Ritual "Tutup Hari" (Jaga Catatan) ============
    // Hanya untuk hari ini WIB — tanggal lampau bukan ritual, hari esok belum ada.
    // Tiga ketukan sebelum tidur: misi, kas, satu kalimat refleksi.
    let dayClose: {
      financeLogged: boolean;
      journalLogged: boolean;
      habitsRemaining: number;
      habitsTotal: number;
      closed: boolean;
    } | null = null;
    if (reqDate === todayStr) {
      const [txCount, journalCount] = await Promise.all([
        db.transaction.count({ where: { date: reqDate } }),
        // createdAt disimpan UTC — jendela hari WIB = UTC+7
        db.journalEntry.count({
          where: {
            createdAt: {
              gte: new Date(`${reqDate}T00:00:00+07:00`),
              lt: new Date(`${addDays(reqDate, 1)}T00:00:00+07:00`),
            },
          },
        }),
      ]);
      const habitsRemaining = missions.total - missions.done;
      dayClose = {
        financeLogged: txCount > 0,
        journalLogged: journalCount > 0,
        habitsRemaining,
        habitsTotal: missions.total,
        closed:
          txCount > 0 && journalCount > 0 && missions.total > 0 && habitsRemaining === 0,
      };
    }

    return NextResponse.json({
      profile,
      today: todayStr,
      missions,
      xp: xpData.xp,
      level: xpData.level,
      levelProgress: xpData.levelProgress,
      streak,
      agenda,
      highlight,
      weekRecap: {
        label: "Pekan ini",
        missionsDone,
        missionsTotal,
        workouts: weekWorkouts,
        spent: transactions
          .filter((t) => t.type === "expense" && weekDates.includes(t.date))
          .reduce((a, t) => a + t.amount, 0),
        income: transactions
          .filter((t) => t.type === "income" && weekDates.includes(t.date))
          .reduce((a, t) => a + t.amount, 0),
        prevDone,
        prevTotal,
      },
      weekCashflow: weekDates.map((ds) => ({
        date: ds,
        income: transactions
          .filter((t) => t.type === "income" && t.date === ds)
          .reduce((a, t) => a + t.amount, 0),
        expense: transactions
          .filter((t) => t.type === "expense" && t.date === ds)
          .reduce((a, t) => a + t.amount, 0),
      })),
      cashflowToday: cashToday,
      quote,
      journalDraftHint,
      dayClose,
    });
  } catch (e) {
    console.error("home error", e);
    return NextResponse.json({ error: "Gagal memuat beranda" }, { status: 500 });
  }
}
