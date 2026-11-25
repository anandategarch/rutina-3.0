import { NextResponse } from "next/server";
import { db, getXpData, computeStreaks } from "@/lib/rutina/server";
import {
  addDays,
  rangeDays,
  weekStart,
  startOfMonth,
  formatDayMonth,
  formatDuration,
  formatRupiah,
  toDateStr,
  jakartaToday,
} from "@/lib/rutina/format";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  health: "Kesehatan",
  productivity: "Produktivitas",
  mind: "Pikiran",
  finance: "Keuangan",
  social: "Sosial",
  learning: "Belajar",
};

const MOOD_ORDER = ["great", "good", "neutral", "tough", "low"];

function dowOf(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

function daysInMonth(dateStr: string): number {
  const [y, m] = dateStr.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/**
 * GET /api/stats → StatsPayload
 * Observatorium Rutina: XP, misi, pekan, kebugaran, keuangan, jurnal,
 * kalender aktivitas, mood, pencapaian, dan wawasan lintas modul.
 */
export async function GET() {
  try {
    const today = jakartaToday();

    const [xpData, streak, habits, allLogs, workouts, bodyMetrics, checkinRows, wallets, transactions, journalEntries, achievements] =
      await Promise.all([
        getXpData(),
        computeStreaks(),
        db.habit.findMany({ where: { archived: false }, orderBy: { createdAt: "asc" } }),
        db.habitLog.findMany({ where: { date: { gte: addDays(today, -95) } } }),
        db.workout.findMany({ where: { date: { gte: addDays(today, -60) } } }),
        db.bodyMetric.findMany({ orderBy: { date: "asc" } }),
        db.checkIn.findMany({ where: { date: { gte: addDays(today, -13) } } }),
        db.wallet.findMany(),
        // Hanya kolom yang dipakai agregasi (type/amount/date) — netBalance butuh seluruh riwayat
        db.transaction.findMany({ select: { type: true, amount: true, date: true, category: true } }),
        // Jurnal: cukup createdAt + wordCount + mood untuk statistik (tanpa konten berat)
        db.journalEntry.findMany({
          orderBy: { updatedAt: "desc" },
          select: { createdAt: true, wordCount: true, mood: true },
        }),
        db.achievement.findMany(),
      ]);

    const habitMap = new Map(habits.map((h) => [h.id, h]));

    const isScheduled = (habitId: string, dateStr: string) => {
      const h = habitMap.get(habitId);
      if (!h) return false;
      return h.scheduleType === "daily" || h.daysOfWeek.split(",").map(Number).includes(dowOf(dateStr));
    };

    const isLogDone = (log: { habitId: string; status: string; value: number | null }) => {
      if (log.status === "done") return true;
      const h = habitMap.get(log.habitId);
      return h?.unitTarget != null && (log.value ?? 0) >= h.unitTarget;
    };

    // Jumlah kebiasaan terjadwal untuk sebuah tanggal
    const scheduledCountFor = (dateStr: string) =>
      habits.filter((h) => h.scheduleType === "daily" || h.daysOfWeek.split(",").map(Number).includes(dowOf(dateStr)))
        .length;

    // Log per tanggal (hanya milik habit aktif, untuk perhitungan misi)
    const logsByDate = new Map<string, typeof allLogs>();
    for (const log of allLogs) {
      if (!habitMap.has(log.habitId)) continue;
      const arr = logsByDate.get(log.date) ?? [];
      arr.push(log);
      logsByDate.set(log.date, arr);
    }
    const doneCountFor = (dateStr: string) =>
      (logsByDate.get(dateStr) ?? []).filter((l) => isScheduled(l.habitId, dateStr) && isLogDone(l)).length;

    // ===== Misi hari ini =====
    const totalToday = scheduledCountFor(today);
    const doneToday = (logsByDate.get(today) ?? []).filter((l) => isScheduled(l.habitId, today) && isLogDone(l)).length;
    const missionsToday = { done: doneToday, total: totalToday };

    // ===== Agregat pekan (Senin mulai) =====
    const thisMonday = weekStart(today);
    const prevMonday = addDays(thisMonday, -7);
    const weekDates = Array.from({ length: 7 }, (_, i) => addDays(thisMonday, i));
    const prevWeekDates = Array.from({ length: 7 }, (_, i) => addDays(prevMonday, i));
    const missionsDone = weekDates.reduce((a, d) => a + doneCountFor(d), 0);
    const missionsScheduled = weekDates.reduce((a, d) => a + scheduledCountFor(d), 0);
    const prevWeekDone = prevWeekDates.reduce((a, d) => a + doneCountFor(d), 0);
    const prevWeekScheduled = prevWeekDates.reduce((a, d) => a + scheduledCountFor(d), 0);

    // ===== Kalender bulan berjalan =====
    const monthStart = startOfMonth(today);
    const monthlyCalendar = rangeDays(monthStart, addDays(monthStart, daysInMonth(today) - 1)).map((date) => ({
      date,
      missionsDone: date <= today ? doneCountFor(date) : 0,
      missionsTotal: scheduledCountFor(date),
    }));

    // ===== Komposisi kategori kebiasaan =====
    const categoryCount = new Map<string, number>();
    for (const h of habits) categoryCount.set(h.category, (categoryCount.get(h.category) ?? 0) + 1);
    const habitCategoryComposition = Array.from(categoryCount.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // ===== Kebugaran =====
    const d30 = addDays(today, -29);
    const recentWorkouts = workouts.filter((w) => w.date >= d30);
    const sessions30d = recentWorkouts.length;
    const minutes30d = Math.round(recentWorkouts.reduce((a, w) => a + w.durationMin, 0));
    const cardioKm30d = Number(
      recentWorkouts.filter((w) => w.type !== "strength").reduce((a, w) => a + (w.distanceKm ?? 0), 0).toFixed(1)
    );
    const strengthSessions30d = recentWorkouts.filter((w) => w.type === "strength").length;

    const weeklyWorkouts = Array.from({ length: 6 }, (_, i) => {
      const ws = addDays(thisMonday, -7 * (5 - i));
      const days = Array.from({ length: 7 }, (_, k) => addDays(ws, k));
      const inWeek = workouts.filter((w) => days.includes(w.date));
      return {
        label: formatDayMonth(ws),
        sessions: inWeek.length,
        minutes: Math.round(inWeek.reduce((a, w) => a + w.durationMin, 0)),
      };
    });

    const weightTrend = bodyMetrics
      .filter((m) => m.weightKg != null)
      .map((m) => ({ date: m.date, weightKg: Number(m.weightKg!.toFixed(1)) }));
    const latestWeight = weightTrend.length ? weightTrend[weightTrend.length - 1].weightKg : null;

    const checkinByDate = new Map(checkinRows.map((c) => [c.date, c]));
    const last14 = rangeDays(addDays(today, -13), today);
    const checkins = last14.map((date) => {
      const c = checkinByDate.get(date);
      return { date, mood: c?.mood ?? null, energy: c?.energy ?? null };
    });

    // ===== Keuangan =====
    const income30d = transactions
      .filter((t) => t.type === "income" && t.date >= d30)
      .reduce((a, t) => a + t.amount, 0);
    const expense30d = transactions
      .filter((t) => t.type === "expense" && t.date >= d30)
      .reduce((a, t) => a + t.amount, 0);
    const totalIncome = transactions.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
    const totalExpense = transactions.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
    const initialBalances = wallets.reduce((a, w) => a + w.initialBalance, 0);
    const netBalance = initialBalances + totalIncome - totalExpense;

    const last84 = rangeDays(addDays(today, -83), today);
    const dailyExpenseHeat = last84.map((date) => ({
      date,
      amount: transactions
        .filter((t) => t.type === "expense" && t.date === date)
        .reduce((a, t) => a + t.amount, 0),
    }));

    const categoryMap = new Map<string, number>();
    for (const t of transactions) {
      if (t.type === "expense" && t.date >= d30) {
        categoryMap.set(t.category, (categoryMap.get(t.category) ?? 0) + t.amount);
      }
    }
    const categoryComposition = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    // ===== Jurnal =====
    const recentEntries = journalEntries.filter((e) => toDateStr(e.createdAt) >= d30);
    const entries30d = recentEntries.length;
    const words30d = recentEntries.reduce((a, e) => a + e.wordCount, 0);
    const moodMap = new Map<string, number>();
    for (const e of journalEntries) {
      if (e.mood) moodMap.set(e.mood, (moodMap.get(e.mood) ?? 0) + 1);
    }
    const moodDistribution = MOOD_ORDER.filter((m) => moodMap.has(m)).map((mood) => ({
      mood,
      count: moodMap.get(mood)!,
    }));

    // ===== Kalender aktivitas 90 hari =====
    const journalDates = new Set(journalEntries.map((e) => toDateStr(e.createdAt)));
    const txDates = new Set(transactions.map((t) => t.date));
    const workoutDates = new Set(workouts.map((w) => w.date));
    const activityCalendar = rangeDays(addDays(today, -89), today).map((date) => ({
      date,
      habitsDone: (logsByDate.get(date) ?? []).filter((l) => isLogDone(l)).length,
      hasTransaction: txDates.has(date),
      hasWorkout: workoutDates.has(date),
      journaled: journalDates.has(date),
    }));

    // ===== Wawasan (observasi, bukan klaim sebab-akibat) =====
    const insights: string[] = [];
    if (streak.best > 0) {
      insights.push(
        `Runtun terpanjangmu tercatat ${streak.best} hari; saat ini runtun berjalan ${streak.current} hari.`
      );
    }
    if (habitCategoryComposition.length > 0) {
      const top = habitCategoryComposition[0];
      insights.push(
        `Kebiasaan aktifmu paling banyak tercatat di kategori ${CATEGORY_LABEL[top.category] ?? top.category} (${top.count} dari ${habits.length}).`
      );
    }
    if (categoryComposition.length > 0) {
      const top = categoryComposition[0];
      insights.push(
        `Pengeluaran 30 hari terakhir terbesar tercatat di kategori ${top.category}, yaitu ${formatRupiah(top.amount)}.`
      );
    }
    if (entries30d > 0) {
      insights.push(
        `Kamu menulis ${entries30d} catatan dalam 30 hari terakhir dengan rata-rata ${Math.round(words30d / entries30d)} kata per catatan.`
      );
    }
    if (sessions30d > 0) {
      insights.push(
        `${sessions30d} sesi latihan (${formatDuration(minutes30d)}) tercatat dalam 30 hari terakhir, termasuk ${strengthSessions30d} sesi beban.`
      );
    }
    if (insights.length === 0) {
      insights.push("Data masih tipis. Mulai catat satu aktivitas hari ini agar observatorium mulai menggambar pola.");
    }

    return NextResponse.json({
      xp: xpData.xp,
      level: xpData.level,
      levelProgress: xpData.levelProgress,
      xpToNextLevel: xpData.xpToNextLevel,
      missionsToday,
      streak,
      weekly: {
        missionsDone,
        missionsScheduled,
        prevWeekDone,
        prevWeekScheduled,
        completionRate: missionsScheduled > 0 ? missionsDone / missionsScheduled : 0,
      },
      habitCategoryComposition,
      monthlyCalendar,
      fitness: {
        sessions30d,
        minutes30d,
        cardioKm30d,
        strengthSessions30d,
        weeklyWorkouts,
        latestWeight,
        weightTrend,
        checkins,
      },
      finance: {
        income30d,
        expense30d,
        netBalance,
        dailyExpenseHeat,
        categoryComposition,
      },
      journal: { entries30d, words30d, moodDistribution },
      activityCalendar,
      mood14d: checkins,
      achievements,
      insights,
    });
  } catch (e) {
    console.error("stats error", e);
    return NextResponse.json({ error: "Gagal memuat statistik" }, { status: 500 });
  }
}
