import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidDateStr } from "@/lib/rutina/format";

export const dynamic = "force-dynamic";

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function GET() {
  try {
    const goals = await db.savingsGoal.findMany({ orderBy: { createdAt: "asc" } });
    return NextResponse.json({ goals });
  } catch (e) {
    console.error("GET /api/goals error", e);
    return NextResponse.json({ error: "Gagal memuat tujuan tabungan" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const targetAmount = Number(body.targetAmount);
    const currentAmount = body.currentAmount === undefined ? 0 : Number(body.currentAmount);

    // Deadline opsional: kosong → null; diisi tapi tidak valid → 400
    let deadline: string | null = null;
    if (typeof body.deadline === "string" && body.deadline.trim() !== "") {
      if (!isValidDateStr(body.deadline)) return bad("Format deadline tidak valid");
      deadline = body.deadline;
    }

    if (!name) return bad("Nama tujuan wajib diisi");
    if (!Number.isFinite(targetAmount) || targetAmount <= 0)
      return bad("Target dana harus lebih dari 0");
    if (!Number.isFinite(currentAmount) || currentAmount < 0)
      return bad("Dana terkumpul tidak valid");

    const goal = await db.savingsGoal.create({
      data: {
        name,
        targetAmount,
        currentAmount,
        deadline,
        color: typeof body.color === "string" && body.color ? body.color : "vault",
        icon: typeof body.icon === "string" && body.icon ? body.icon : "piggy-bank",
      },
    });

    return NextResponse.json({ goal }, { status: 201 });
  } catch (e) {
    console.error("POST /api/goals error", e);
    return NextResponse.json({ error: "Gagal membuat tujuan tabungan" }, { status: 500 });
  }
}
