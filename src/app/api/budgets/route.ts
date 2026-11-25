import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jakartaToday } from "@/lib/rutina/format";

export const dynamic = "force-dynamic";

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function monthPrefix(): string {
  // Bulan berjalan menurut zona waktu pengguna (Asia/Jakarta)
  return jakartaToday().slice(0, 7);
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

    const spentByCatLower = new Map<string, number>();
    for (const row of agg) {
      // Pencocokan kategori tidak peka huruf besar/kecil (SQLite membedakan kasus)
      const key = row.category.toLowerCase();
      spentByCatLower.set(key, (spentByCatLower.get(key) ?? 0) + (row._sum.amount ?? 0));
    }

    const result = budgets.map((b) => ({
      ...b,
      spent: spentByCatLower.get(b.category.toLowerCase()) ?? 0,
    }));

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

    // Upsert manual agar status code akurat: 201 saat membuat, 200 saat memperbarui
    const existing = await db.budget.findUnique({ where: { category } });
    const budget = existing
      ? await db.budget.update({ where: { category }, data: { monthlyLimit } })
      : await db.budget.create({ data: { category, monthlyLimit } });

    return NextResponse.json({ budget }, { status: existing ? 200 : 201 });
  } catch (e) {
    console.error("POST /api/budgets error", e);
    return NextResponse.json({ error: "Gagal menyimpan anggaran" }, { status: 500 });
  }
}
