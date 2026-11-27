import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/**
 * Kategori keuangan buatan pengguna — sunting (nama/arsip) & hapus.
 * Transaksi TIDAK ikut terhapus: kategori tersimpan sebagai string di
 * baris transaksi, jadi riwayat tetap utuh setelah kategori dihapus.
 */

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));

    const data: { name?: string; archived?: boolean } = {};
    if (typeof body.name === "string") {
      const name = body.name.trim().slice(0, 60);
      if (!name) return bad("Nama kategori wajib diisi");
      // Anti-duplikat tak peka huruf besar/kecil, kecuali dirinya sendiri
      const all = await db.financeCategory.findMany({ select: { id: true, name: true } });
      const norm = name.toLowerCase();
      if (all.some((c) => c.id !== id && c.name.trim().toLowerCase() === norm)) {
        return bad("Kategori dengan nama ini sudah ada", 409);
      }
      data.name = name;
    }
    if (typeof body.archived === "boolean") data.archived = body.archived;

    if (Object.keys(data).length === 0) return bad("Tidak ada perubahan yang dikirim");

    const category = await db.financeCategory.update({ where: { id }, data });
    return NextResponse.json({ category });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return bad("Kategori dengan nama ini sudah ada", 409);
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return bad("Kategori tidak ditemukan", 404);
    }
    console.error("PATCH /api/fin-categories/[id] error", e);
    return NextResponse.json({ error: "Gagal memperbarui kategori" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await db.financeCategory.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return bad("Kategori tidak ditemukan", 404);
    }
    console.error("DELETE /api/fin-categories/[id] error", e);
    return NextResponse.json({ error: "Gagal menghapus kategori" }, { status: 500 });
  }
}
