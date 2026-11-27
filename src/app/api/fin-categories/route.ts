import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/**
 * Kategori keuangan buatan pengguna (FinanceCategory) — melengkapi
 * kategori bawaan aplikasi. Hasil migrasi Rutina 2.0 (tabel
 * rutina_fin_categories + katalog kategori legacy) masuk lewat sini
 * juga: UI memuat daftar ini dan menampilannya di pemilih kategori.
 */

export async function GET() {
  try {
    const categories = await db.financeCategory.findMany({
      orderBy: [{ archived: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ categories });
  } catch (e) {
    console.error("GET /api/fin-categories error", e);
    return NextResponse.json({ error: "Gagal memuat kategori" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";
    const type = body.type === "income" ? "income" : body.type === "expense" ? "expense" : "";

    if (!name) return bad("Nama kategori wajib diisi");
    if (!type) return bad("Tipe kategori harus income atau expense");

    // Anti-duplikat tak peka huruf besar/kecil (selaras pola /api/budgets)
    const all = await db.financeCategory.findMany({ select: { name: true } });
    const norm = name.toLowerCase();
    if (all.some((c) => c.name.trim().toLowerCase() === norm)) {
      return bad("Kategori dengan nama ini sudah ada", 409);
    }

    const category = await db.financeCategory.create({
      // id tanpa @default di schema (baris legacy migrasi mempertahankan id
      // aslinya) — kategori baru memakai konvensi penamaan legacy fcat-<ts>.
      data: { id: `fcat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, name, type },
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (e) {
    // Balapan dua POST nama sama (unique) → 409, bukan 500 generik
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return bad("Kategori dengan nama ini sudah ada", 409);
    }
    console.error("POST /api/fin-categories error", e);
    return NextResponse.json({ error: "Gagal menyimpan kategori" }, { status: 500 });
  }
}
