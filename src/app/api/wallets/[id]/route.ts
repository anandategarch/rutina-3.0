import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Relasi ke Transaction (WalletSource) sudah Cascade; transfer masuk jadi SetNull.
    await db.wallet.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Dompet tidak ditemukan" }, { status: 404 });
    }
    console.error("DELETE /api/wallets/[id] error", e);
    return NextResponse.json({ error: "Gagal menghapus dompet" }, { status: 500 });
  }
}
