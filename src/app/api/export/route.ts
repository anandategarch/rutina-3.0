import { NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";

export const dynamic = "force-dynamic";

function csvEscape(value: string): string {
  // Sel numerik murni (mis. -150000) aman dari formula injection — jangan diberi kutip,
  // agar nilai negatif tidak berubah menjadi teks "'-150000" di spreadsheet.
  if (/^-?\d+(\.\d+)?$/.test(value)) return value;
  // Cegah CSV/formula injection: sel berawalan = + - @ diawali kutip tunggal
  const first = value.charAt(0);
  const guarded = first === "=" || first === "+" || first === "-" || first === "@" ? `'${value}` : value;
  if (/[",\n\r]/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
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
      const rows = transactions.map((t) => {
        // Untuk transfer, tujuan ditampilkan di kolom dompet (bila datanya tersedia)
        const dompet =
          t.type === "transfer" && t.toWalletId
            ? `${walletName.get(t.walletId) ?? t.walletId} → ${walletName.get(t.toWalletId) ?? t.toWalletId}`
            : (walletName.get(t.walletId) ?? t.walletId);
        return [
          t.date,
          t.type,
          t.category,
          dompet,
          String(t.amount),
          t.note ?? "",
        ]
          .map(csvEscape)
          .join(",");
      });
      const csv = "\uFEFF" + [header, ...rows].join("\n");

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="rutina-transactions.csv"',
          "Cache-Control": "no-store", // audit B1-Medium: data pribadi — jangan di-cache
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
        "Cache-Control": "no-store", // audit B1-Medium: data pribadi — jangan di-cache
      },
    });
  } catch (e) {
    console.error("export error", e);
    return NextResponse.json({ error: "Gagal membuat ekspor data" }, { status: 500 });
  }
}
