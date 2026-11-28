import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jakartaToday, isValidDateStr } from "@/lib/rutina/format";

export const dynamic = "force-dynamic";

const TX_TYPES = ["income", "expense", "transfer"];
const RECURRING = ["none", "weekly", "monthly"];

// audit B3-B3: bulatkan nilai uang ke 2 desimal
const round2 = (n: number) => Math.round(n * 100) / 100;

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function GET() {
  try {
    const transactions = await db.transaction.findMany({
      include: { wallet: true, toWallet: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 1000, // audit B3-B4: batasi hasil query
    });
    return NextResponse.json({ transactions });
  } catch (e) {
    console.error("GET /api/transactions error", e);
    return NextResponse.json({ error: "Gagal memuat transaksi" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const type = typeof body.type === "string" ? body.type : "";
    if (!TX_TYPES.includes(type)) return bad("Tipe transaksi tidak valid");

    let amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) return bad("Nominal harus lebih dari 0");
    // audit B3-B3: bulatkan ke 2 desimal, tolak nominal tidak wajar
    amount = round2(amount);
    if (amount > 1e12) return bad("Nominal tidak wajar");

    const walletId = typeof body.walletId === "string" ? body.walletId : "";
    if (!walletId) return bad("Dompet sumber wajib dipilih");
    const wallet = await db.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) return bad("Dompet sumber tidak ditemukan", 404);

    let toWalletId: string | null = null;
    if (type === "transfer") {
      const tw = typeof body.toWalletId === "string" ? body.toWalletId : "";
      if (!tw) return bad("Dompet tujuan wajib dipilih untuk transfer");
      if (tw === walletId) return bad("Dompet tujuan tidak boleh sama dengan dompet sumber");
      const target = await db.wallet.findUnique({ where: { id: tw } });
      if (!target) return bad("Dompet tujuan tidak ditemukan", 404);
      toWalletId = tw;
    }

    let category =
      typeof body.category === "string" && body.category.trim()
        ? body.category.trim().slice(0, 60)
        : "lainnya";
    if (type === "transfer") category = "lainnya";

    // Tanggal tidak dikirim → hari ini (WIB); dikirim tapi tidak valid → tolak
    const date = typeof body.date === "string" && body.date.trim() ? body.date.trim() : jakartaToday();
    if (!isValidDateStr(date)) return bad("Format tanggal tidak valid");
    // audit D-L1: tolak tanggal masa depan — selaras guard habit-check (B2-H3);
    // transaksi bertanggal maju menggelembungkan spent anggaran & tren kasflow.
    if (date > jakartaToday()) return bad("Tanggal tidak boleh di masa depan");

    const recurring = RECURRING.includes(body.recurring) ? body.recurring : "none";

    const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 500) : null;

    const transaction = await db.transaction.create({
      data: { type, amount, category, walletId, toWalletId, date, note, recurring },
      include: { wallet: true, toWallet: true },
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (e) {
    console.error("POST /api/transactions error", e);
    return NextResponse.json({ error: "Gagal menyimpan transaksi" }, { status: 500 });
  }
}
