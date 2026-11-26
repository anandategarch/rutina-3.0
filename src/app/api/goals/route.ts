import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidDateStr } from "@/lib/rutina/format";

export const dynamic = "force-dynamic";

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

// audit B3-B3: bulatkan nilai uang ke 2 desimal
const round2 = (n: number) => Math.round(n * 100) / 100;

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
    let targetAmount = Number(body.targetAmount);
    let currentAmount = body.currentAmount === undefined ? 0 : Number(body.currentAmount);

    // Deadline opsional: kosong → null; diisi tapi tidak valid → 400
    let deadline: string | null = null;
    if (typeof body.deadline === "string" && body.deadline.trim() !== "") {
      if (!isValidDateStr(body.deadline)) return bad("Format deadline tidak valid");
      deadline = body.deadline;
    }

    if (!name) return bad("Nama tujuan wajib diisi");
    // audit B3-L2: batasi nama tujuan maksimal 120 karakter
    if (name.length > 120) return bad("Nama tujuan maksimal 120 karakter");
    if (!Number.isFinite(targetAmount) || targetAmount <= 0)
      return bad("Target dana harus lebih dari 0");
    // audit B3-B3: bulatkan ke 2 desimal, tolak target tidak wajar
    targetAmount = round2(targetAmount);
    if (targetAmount > 1e12) return bad("Target dana tidak wajar");
    if (!Number.isFinite(currentAmount) || currentAmount < 0)
      return bad("Dana terkumpul tidak valid");
    // audit B3-B3: bulatkan dana terkumpul ke 2 desimal
    currentAmount = round2(currentAmount);

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
