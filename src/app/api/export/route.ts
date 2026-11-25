import { NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";

export const dynamic = "force-dynamic";

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * GET /api/export?format=json|csv
 * - json  : cadangan penuh (rutina-backup.json)
 * - csv   : daftar transaksi (rutina-transactions.csv)
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const format = url.searchParams.get("format") === "csv" ? "csv" : "json";

    if (format === "csv") {
      const [transactions, wallets] = await Promise.all([
        db.transaction.findMany({ orderBy: { date: "desc" } }),
        db.wallet.findMany(),
      ]);
      const walletName = new Map(wallets.map((w) => [w.id, w.name]));

      const header = "tanggal,type,kategori,dompet,jumlah,catatan";
      const rows = transactions.map((t) =>
        [
          t.date,
          t.type,
          t.category,
          walletName.get(t.walletId) ?? t.walletId,
          String(t.amount),
          t.note ?? "",
        ]
          .map(csvEscape)
          .join(",")
      );
      const csv = "\uFEFF" + [header, ...rows].join("\n");

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="rutina-transactions.csv"',
        },
      });
    }

    const [profile, habits, habitLogs, workouts, foodEntries, checkins, bodyMetrics, wallets, transactions, budgets, savingsGoals, journalEntries] =
      await Promise.all([
        db.profile.findFirst(),
        db.habit.findMany(),
        db.habitLog.findMany(),
        db.workout.findMany(),
        db.foodEntry.findMany(),
        db.checkIn.findMany(),
        db.bodyMetric.findMany(),
        db.wallet.findMany(),
        db.transaction.findMany(),
        db.budget.findMany(),
        db.savingsGoal.findMany(),
        db.journalEntry.findMany(),
      ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      profile,
      habits,
      habitLogs,
      workouts,
      foodEntries,
      checkins,
      bodyMetrics,
      wallets,
      transactions,
      budgets,
      savingsGoals,
      journalEntries,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="rutina-backup.json"',
      },
    });
  } catch (e) {
    console.error("export error", e);
    return NextResponse.json({ error: "Gagal membuat ekspor data" }, { status: 500 });
  }
}
