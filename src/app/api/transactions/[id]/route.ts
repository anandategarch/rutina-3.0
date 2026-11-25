import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    await db.transaction.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }
    console.error("DELETE /api/transactions/[id] error", e);
    return NextResponse.json({ error: "Gagal menghapus transaksi" }, { status: 500 });
  }
}
