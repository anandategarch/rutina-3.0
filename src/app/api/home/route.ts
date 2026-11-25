import { NextResponse } from "next/server";
import { getXpData, computeStreaks, db } from "@/lib/rutina/server";
import {
  addDays,
  dayOfWeek,
  daysBetween,
  jakartaToday,
  parseDateStr,
  rangeDays,
  startOfMonth,
  weekStart,
} from "@/lib/rutina/format";

export const dynamic = "force-dynamic";

// Hari acuan untuk indeks kutipan harian (berganti tiap tengah malam WIB)
const QUOTE_EPOCH = "2024-01-01";

export async function GET() {
  try {
    const todayStr = jakartaToday();
    const dow = dayOfWeek(todayStr);

    const profile = await db.profile.findFirst();
    const xpData = await getXpData();

    // Habits + logs 40 hari terakhir
    const habits = await db.habit.findMany({
      where: { archived: false },
      include: {
        logs: { where: { date: { gte: addDays(todayStr, -40) } } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Agenda hari ini
    const agenda = habits
      .filter((h) => h.scheduleType === "daily" || h.daysOfWeek.split(",").map(Number).includes(dow))
      .map((h) => ({
        habit: h,
        log: h.logs.find((l) => l.date === todayStr) ?? null,
        scheduled: true,
      }));

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
      where: { status: "done", date: { in: [...weekDates, ...prevWeekDates] } },
    });
    const doneByDate = new Map<string, number>();
    weekLogs.forEach((l) => doneByDate.set(l.date, (doneByDate.get(l.date) ?? 0) + 1));

    const habitsByDow = (ds: string) => {
      const d = dayOfWeek(ds);
      // Tanggal lampau: habit yang dibuat setelah tanggal tsb belum dijadwalkan saat itu
      const createdBefore = ds < todayStr ? parseDateStr(ds) : null;
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
        .filter((b) => b.spent >= b.monthlyLimit * 0.75)
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
        if (goal) {
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
    const quotes = await db.quote.findMany();
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
    });
  } catch (e) {
    console.error("home error", e);
    return NextResponse.json({ error: "Gagal memuat beranda" }, { status: 500 });
  }
}
