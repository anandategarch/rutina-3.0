import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jakartaToday } from "@/lib/rutina/format";
import { withDbRetry } from "@/lib/rutina/db-retry";

export const dynamic = "force-dynamic";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Aturan saldo (satu sumber kebenaran, identik dengan GET /api/wallets):
 * balance = initialBalance + Σ income(walletId) − Σ expense(walletId)
 *           − Σ transfer keluar(walletId) + Σ transfer masuk(toWalletId)
 */
function computeBalance(
  walletId: string,
  initialBalance: number,
  txs: { type: string; amount: number; walletId: string; toWalletId: string | null }[]
): number {
  let balance = initialBalance;
  for (const t of txs) {
    if (t.type === "income" && t.walletId === walletId) {
      balance += t.amount;
    } else if (t.type === "expense" && t.walletId === walletId) {
      balance -= t.amount;
    } else if (t.type === "transfer") {
      if (t.walletId === walletId) balance -= t.amount;
      if (t.toWalletId === walletId) balance += t.amount;
    }
  }
  return round2(balance);
}

/**
 * POST /api/wallets/[id]/reconcile { actualBalance }
 * Rekonsiliasi kas — treatment untuk saldo dompet yang melenceng dari uang
 * fisik (biasanya karena hari bolong lupa catat). Server menghitung selisih
 * dan menutupnya dengan SATU transaksi penyesuaian otomatis:
 * - selisih positif → income "penyesuaian" (kas lebih banyak dari catatan)
 * - selisih negatif → expense "penyesuaian" (kas lebih sedikit dari catatan)
 * Selisih nol → tidak ada transaksi, reconciled: false.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
    }

    const actual = Number(body.actualBalance);
    if (!Number.isFinite(actual) || actual < 0) {
      return NextResponse.json({ error: "Saldo kas asli tidak valid" }, { status: 400 });
    }
    const actualBalance = round2(actual);

    // audit 3-a#3: hitung-dan-tulis kini ATOMIK di satu transaksi — versi lama
    // read-modify-write terpisah: transaksi baru yang masuk di antara baca dan
    // tulis membuat delta basi dan menulis angka penyesuaian yang salah.
    // withDbRetry menyerap SQLITE_BUSY/P2034 transien.
    const result = await withDbRetry(() =>
      db.$transaction(async (tx) => {
        const wallet = await tx.wallet.findUnique({ where: { id } });
        if (!wallet) return null;

        const txs = await tx.transaction.findMany({
          where: { OR: [{ walletId: id }, { toWalletId: id }] },
          select: { type: true, amount: true, walletId: true, toWalletId: true },
        });
        const computed = computeBalance(id, wallet.initialBalance, txs);
        const delta = round2(actualBalance - computed);

        if (Math.abs(delta) < 0.005) {
          return { reconciled: false as const, delta: 0, transaction: null, computed };
        }

        const transaction = await tx.transaction.create({
          data: {
            type: delta > 0 ? "income" : "expense",
            amount: round2(Math.abs(delta)),
            category: "penyesuaian",
            walletId: id,
            date: jakartaToday(),
            note: `Rekonsiliasi kas "${wallet.name}" — catatan ${computed}, kas asli ${actualBalance}`,
          },
        });
        return { reconciled: true as const, delta, transaction, computed };
      }, { timeout: 15_000 })
    );

    if (result === null) {
      return NextResponse.json({ error: "Dompet tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(result, { status: result.reconciled ? 201 : 200 });
  } catch (e) {
    console.error("wallet reconcile POST error", e);
    return NextResponse.json({ error: "Gagal merekonsiliasi dompet" }, { status: 500 });
  }
}
