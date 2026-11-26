import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// audit B3-B3: bulatkan nilai uang ke 2 desimal
const round2 = (n: number) => Math.round(n * 100) / 100;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    let monthlyLimit = Number(body.monthlyLimit);
    if (!Number.isFinite(monthlyLimit) || monthlyLimit <= 0)
      return NextResponse.json({ error: "Limit bulanan harus lebih dari 0" }, { status: 400 });
    // audit B3-B3: bulatkan ke 2 desimal, tolak limit tidak wajar
    monthlyLimit = round2(monthlyLimit);
    if (monthlyLimit > 1e12)
      return NextResponse.json({ error: "Limit bulanan tidak wajar" }, { status: 400 });

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

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    await db.budget.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Anggaran tidak ditemukan" }, { status: 404 });
    }
    console.error("DELETE /api/budgets/[id] error", e);
    return NextResponse.json({ error: "Gagal menghapus anggaran" }, { status: 500 });
  }
}
