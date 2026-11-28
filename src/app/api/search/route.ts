import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/search?q= — pencarian cepat lintas modul (fitur baru).
 *
 * Satu endpoint untuk mencari: kebiasaan, transaksi, catatan jurnal,
 * latihan, dan dompet. Hasil tiap modul dibatasi take kecil agar respons
 * tetap ringan di jaringan mobile (audit B3: batasi payload).
 *
 * Catatan SQLite: `contains` Prisma case-insensitive untuk ASCII — cukup
 * untuk teks Indonesia; mode "insensitive" tak didukung SQLite.
 */
export async function GET(req: NextRequest) {
  try {
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
    // Query terlalu pendek: kembalikan hasil kosong (bukan error) agar UI
    // bisa memakai kueri yang sama tanpa percabangan khusus.
    if (q.length < 2) {
      return NextResponse.json({
        results: { habits: [], transactions: [], journal: [], workouts: [], wallets: [] },
      });
    }
    if (q.length > 60) {
      return NextResponse.json({ error: "Kata kunci terlalu panjang (maks 60 karakter)" }, { status: 400 });
    }

    const [habits, transactions, journalEntries, workouts, wallets] = await Promise.all([
      db.habit.findMany({
        where: { name: { contains: q } },
        select: { id: true, name: true, category: true, archived: true },
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
      db.transaction.findMany({
        where: { OR: [{ note: { contains: q } }, { category: { contains: q } }] },
        select: { id: true, type: true, amount: true, category: true, note: true, date: true },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 5,
      }),
      db.journalEntry.findMany({
        where: { OR: [{ title: { contains: q } }, { content: { contains: q } }] },
        select: { id: true, title: true, folder: true, createdAt: true, content: true },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      db.workout.findMany({
        where: { OR: [{ title: { contains: q } }, { notes: { contains: q } }] },
        select: { id: true, type: true, title: true, date: true, durationMin: true },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 5,
      }),
      db.wallet.findMany({
        where: { name: { contains: q }, archived: false },
        select: { id: true, name: true, type: true },
        orderBy: { createdAt: "asc" },
        take: 3,
      }),
    ]);

    // Potongan konten jurnal untuk konteks baris hasil — dipotong di server
    // agar payload tetap kecil (client tidak perlu isi penuh catatan).
    const journal = journalEntries.map((e) => ({
      id: e.id,
      title: e.title,
      folder: e.folder,
      createdAt: e.createdAt,
      snippet: e.title ? null : e.content.trim().slice(0, 90),
    }));

    return NextResponse.json({ results: { habits, transactions, journal, workouts, wallets } });
  } catch (e) {
    console.error("search GET error", e);
    return NextResponse.json({ error: "Gagal mencari" }, { status: 500 });
  }
}
