import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function monthPrefix(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET() {
  try {
    const prefix = monthPrefix();
    const [budgets, agg] = await Promise.all([
      db.budget.findMany({ orderBy: { category: "asc" } }),
      db.transaction.groupBy({
        by: ["category"],
        where: { type: "expense", date: { startsWith: prefix } },
        _sum: { amount: true },
      }),
    ]);

    const spentByCat = new Map<string, number>();
    for (const row of agg) spentByCat.set(row.category, row._sum.amount ?? 0);

    const result = budgets.map((b) => ({ ...b, spent: spentByCat.get(b.category) ?? 0 }));

    return NextResponse.json({ budgets: result });
  } catch (e) {
    console.error("GET /api/budgets error", e);
    return NextResponse.json({ error: "Gagal memuat anggaran" }, { status: 500 });
  }
}

/** Upsert: kategori sudah ada → update limit; belum → buat baru. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const category = typeof body.category === "string" ? body.category.trim() : "";
    const monthlyLimit = Number(body.monthlyLimit);

    if (!category) return bad("Kategori wajib diisi");
    if (!Number.isFinite(monthlyLimit) || monthlyLimit <= 0)
      return bad("Limit bulanan harus lebih dari 0");

    const budget = await db.budget.upsert({
      where: { category },
      create: { category, monthlyLimit },
      update: { monthlyLimit },
    });

    return NextResponse.json({ budget }, { status: 201 });
  } catch (e) {
    console.error("POST /api/budgets error", e);
    return NextResponse.json({ error: "Gagal menyimpan anggaran" }, { status: 500 });
  }
}
