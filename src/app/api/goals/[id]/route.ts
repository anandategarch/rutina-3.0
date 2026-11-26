import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { isValidDateStr } from "@/lib/rutina/format";

export const dynamic = "force-dynamic";

/** PATCH: dipakai untuk kontribusi dana (kirim `contribution` — increment atomik, aman race),
 *  ubah dana langsung (currentAmount), nama/target/deadline. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const data: {
      name?: string;
      targetAmount?: number;
      currentAmount?: number | { increment: number };
      deadline?: string | null;
    } = {};

    // Kontribusi delta: increment atomik di server — dua kontribusi cepat tidak saling
    // menimpa (bukan read-modify-write dari cache klien).
    if (body.contribution !== undefined) {
      const contribution = Number(body.contribution);
      if (!Number.isFinite(contribution) || contribution <= 0)
        return NextResponse.json({ error: "Jumlah kontribusi harus lebih dari 0" }, { status: 400 });
      data.currentAmount = { increment: contribution };
    }

    if (body.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) return NextResponse.json({ error: "Nama tujuan tidak boleh kosong" }, { status: 400 });
      data.name = name;
    }
    if (body.targetAmount !== undefined) {
      const targetAmount = Number(body.targetAmount);
      if (!Number.isFinite(targetAmount) || targetAmount <= 0)
        return NextResponse.json({ error: "Target dana harus lebih dari 0" }, { status: 400 });
      data.targetAmount = targetAmount;
    }
    if (body.currentAmount !== undefined) {
      const currentAmount = Number(body.currentAmount);
      if (!Number.isFinite(currentAmount) || currentAmount < 0)
        return NextResponse.json({ error: "Dana terkumpul tidak valid" }, { status: 400 });
      data.currentAmount = currentAmount;
    }
    if (body.deadline !== undefined) {
      if (body.deadline === null) data.deadline = null;
      else if (typeof body.deadline === "string" && isValidDateStr(body.deadline))
        data.deadline = body.deadline;
      else return NextResponse.json({ error: "Format deadline tidak valid" }, { status: 400 });
    }

    if (Object.keys(data).length === 0)
      return NextResponse.json({ error: "Tidak ada data untuk diperbarui" }, { status: 400 });

    const goal = await db.savingsGoal.update({ where: { id }, data });

    return NextResponse.json({ goal });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Tujuan tabungan tidak ditemukan" }, { status: 404 });
    }
    console.error("PATCH /api/goals/[id] error", e);
    return NextResponse.json({ error: "Gagal memperbarui tujuan tabungan" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    await db.savingsGoal.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Tujuan tabungan tidak ditemukan" }, { status: 404 });
    }
    console.error("DELETE /api/goals/[id] error", e);
    return NextResponse.json({ error: "Gagal menghapus tujuan tabungan" }, { status: 500 });
  }
}
