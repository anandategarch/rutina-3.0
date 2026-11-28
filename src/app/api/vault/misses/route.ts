import { NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";
import {
  addDays,
  jakartaDateStr,
  jakartaToday,
  rangeDays,
  startOfMonth,
} from "@/lib/rutina/format";

export const dynamic = "force-dynamic";

/**
 * Jaga Catatan (The Vault) — deteksi "Hari Bolong":
 * hari lampau dalam jendela maksimal 30 hari yang tidak memiliki SATU PUN
 * transaksi (masuk/keluar/transfer). Jendela tidak lebih tua dari dompet
 * pertama — sebelum dompet dibuat, tidak ada kewajiban mencatat.
 *
 * Dampak yang dikuantifikasi:
 * - estimatedUntracked = median pengeluaran harian tercatat × jumlah hari bolong
 * - untrackedPct       = estimasi itu terhadap pengeluaran bulan berjalan
 * - logStreak          = runing pencatatan harian (grace untuk hari ini)
 *
 * Treatment yang menyandarkan ke endpoint ini di UI: catat mundur per hari
 * bolong (sheet transaksi dengan tanggal terisi) dan rekonsiliasi kas dompet
 * (POST /api/wallets/[id]/reconcile).
 */
export async function GET() {
  try {
    const today = jakartaToday();
    const windowStart = addDays(today, -29); // 30 hari lampau inklusif

    const [txs, wallets] = await Promise.all([
      db.transaction.findMany({
        where: { date: { gte: windowStart, lte: today } },
        select: { type: true, amount: true, date: true },
      }),
      db.wallet.findMany({
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      }),
    ]);

    // Pengguna baru tanpa jejak apa pun — belum ada kewajiban mencatat
    if (wallets.length === 0 && txs.length === 0) {
      return NextResponse.json({
        today,
        windowStart,
        gapDays: [],
        trackedDays: 0,
        medianDailyExpense: 0,
        estimatedUntracked: 0,
        monthExpense: 0,
        untrackedPct: null,
        todayLogged: false,
        logStreak: 0,
      });
    }

    // Hari pertama yang layak dicatat: maks(jendela, dompet pertama dibuat)
    let firstTrackDate = windowStart;
    if (wallets.length > 0) {
      const firstWalletDay = jakartaDateStr(wallets[0].createdAt);
      if (firstWalletDay > firstTrackDate) firstTrackDate = firstWalletDay;
    }

    // Hari lampau penuh (hari ini dievaluasi terpisah — belum selesai)
    const pastDays = rangeDays(firstTrackDate, addDays(today, -1));
    const datesWithTx = new Set(txs.map((t) => t.date));
    const gapDays = pastDays.filter((ds) => !datesWithTx.has(ds));

    // Median pengeluaran harian dari hari yang tercatat punya pengeluaran > 0
    const expenseByDay = new Map<string, number>();
    for (const t of txs) {
      if (t.type !== "expense") continue;
      expenseByDay.set(t.date, (expenseByDay.get(t.date) ?? 0) + t.amount);
    }
    const positiveDays = Array.from(expenseByDay.values())
      .filter((v) => v > 0)
      .sort((a, b) => a - b);
    const median =
      positiveDays.length > 0
        ? positiveDays.length % 2 === 1
          ? positiveDays[(positiveDays.length - 1) / 2]
          : (positiveDays[positiveDays.length / 2 - 1] + positiveDays[positiveDays.length / 2]) / 2
        : 0;
    const estimatedUntracked = Math.round(median * gapDays.length);

    const monthStart = startOfMonth(today);
    const monthExpense = txs
      .filter((t) => t.type === "expense" && t.date >= monthStart)
      .reduce((a, t) => a + t.amount, 0);

    // Runing pencatatan: hari berturut-turut dengan >=1 transaksi,
    // grace untuk hari ini (masih bisa diisi sampai tengah malam WIB)
    let logStreak = 0;
    let cursor = datesWithTx.has(today) ? today : addDays(today, -1);
    while (datesWithTx.has(cursor) && cursor >= firstTrackDate) {
      logStreak++;
      cursor = addDays(cursor, -1);
    }

    return NextResponse.json({
      today,
      windowStart: firstTrackDate,
      gapDays,
      trackedDays: pastDays.length - gapDays.length,
      medianDailyExpense: Math.round(median),
      estimatedUntracked,
      monthExpense,
      untrackedPct: monthExpense > 0 ? estimatedUntracked / monthExpense : null,
      todayLogged: datesWithTx.has(today),
      logStreak,
    });
  } catch (e) {
    console.error("vault misses GET error", e);
    return NextResponse.json({ error: "Gagal memuat deteksi hari bolong" }, { status: 500 });
  }
}
