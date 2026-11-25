import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const WALLET_TYPES = ["cash", "bank", "ewallet"];

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/**
 * Aturan saldo (satu sumber kebenaran):
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
  return balance;
}

export async function GET() {
  try {
    const [wallets, txs] = await Promise.all([
      // Skema Wallet tidak punya createdAt — id (cuid) mempertahankan urutan pembuatan.
      db.wallet.findMany({ orderBy: { id: "asc" } }),
      db.transaction.findMany({
        select: { type: true, amount: true, walletId: true, toWalletId: true },
      }),
    ]);

    const result = wallets.map((w) => ({
      ...w,
      balance: computeBalance(w.id, w.initialBalance, txs),
    }));

    return NextResponse.json({ wallets: result });
  } catch (e) {
    console.error("GET /api/wallets error", e);
    return NextResponse.json({ error: "Gagal memuat dompet" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const type = typeof body.type === "string" ? body.type : "cash";
    const initialBalance = Number(body.initialBalance ?? 0);

    if (!name) return bad("Nama dompet wajib diisi");
    if (!WALLET_TYPES.includes(type)) return bad("Tipe dompet tidak valid");
    if (!Number.isFinite(initialBalance) || initialBalance < 0)
      return bad("Saldo awal tidak valid");

    const wallet = await db.wallet.create({
      data: {
        name,
        type,
        initialBalance,
        color: typeof body.color === "string" && body.color ? body.color : "vault",
        icon: typeof body.icon === "string" && body.icon ? body.icon : "wallet",
      },
    });

    return NextResponse.json({ wallet }, { status: 201 });
  } catch (e) {
    console.error("POST /api/wallets error", e);
    return NextResponse.json({ error: "Gagal menambahkan dompet" }, { status: 500 });
  }
}
