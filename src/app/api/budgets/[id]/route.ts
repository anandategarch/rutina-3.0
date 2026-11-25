import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const monthlyLimit = Number(body.monthlyLimit);
    if (!Number.isFinite(monthlyLimit) || monthlyLimit <= 0)
      return NextResponse.json({ error: "Limit bulanan harus lebih dari 0" }, { status: 400 });

    const budget = await db.budget.update({ where: { id }, data: { monthlyLimit } });

    return NextResponse.json({ budget });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Anggaran tidak ditemukan" }, { status: 404 });
    }
    console.error("PATCH /api/budgets/[id] error", e);
    return NextResponse.json({ error: "Gagal memperbarui anggaran" }, { status: 500 });
  }
}
