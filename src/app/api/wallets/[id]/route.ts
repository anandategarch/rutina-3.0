import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const WALLET_TYPES = ["cash", "bank", "ewallet"];

/**
 * DELETE /api/wallets/[id]?force=true
 * Dompet dengan riwayat transaksi hanya boleh dihapus dengan force=true;
 * saat itu transaksi terkait ikut dihapus dalam satu transaksi atomik.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const existing = await db.wallet.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Dompet tidak ditemukan" }, { status: 404 });
    }

    const txCount = await db.transaction.count({
      where: { OR: [{ walletId: id }, { toWalletId: id }] },
    });
    const force = new URL(req.url).searchParams.get("force") === "true";

    if (txCount > 0 && !force) {
      return NextResponse.json(
        { error: "Dompet masih memiliki riwayat transaksi. Hapus transaksinya terlebih dahulu." },
        { status: 409 }
      );
    }

    if (txCount > 0) {
      await db.$transaction([
        db.transaction.deleteMany({ where: { walletId: id } }),
        db.transaction.deleteMany({ where: { toWalletId: id, type: "transfer" } }),
        db.wallet.delete({ where: { id } }),
      ]);
    } else {
      await db.wallet.delete({ where: { id } });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Dompet tidak ditemukan" }, { status: 404 });
    }
    console.error("DELETE /api/wallets/[id] error", e);
    return NextResponse.json({ error: "Gagal menghapus dompet" }, { status: 500 });
  }
}

/** PATCH /api/wallets/[id] — ubah nama/tipe/warna/ikon/status arsip dompet. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
    }

    const existing = await db.wallet.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Dompet tidak ditemukan" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name || name.length > 60) {
        return NextResponse.json(
          { error: "Nama dompet wajib diisi (maksimal 60 karakter)" },
          { status: 400 }
        );
      }
      data.name = name;
    }
    if (body.type !== undefined) {
      if (!WALLET_TYPES.includes(body.type)) {
        return NextResponse.json({ error: "Tipe dompet tidak valid" }, { status: 400 });
      }
      data.type = body.type;
    }
    if (body.color !== undefined && typeof body.color === "string" && body.color) {
      data.color = body.color;
    }
    if (body.icon !== undefined && typeof body.icon === "string" && body.icon) {
      data.icon = body.icon;
    }
    if (body.archived !== undefined) {
      if (body.archived !== true && body.archived !== false) {
        return NextResponse.json({ error: "Nilai archived tidak valid" }, { status: 400 });
      }
      data.archived = body.archived === true;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Tidak ada data untuk diperbarui" }, { status: 400 });
    }

    const wallet = await db.wallet.update({ where: { id }, data });
    return NextResponse.json({ wallet });
  } catch (e) {
    console.error("PATCH /api/wallets/[id] error", e);
    return NextResponse.json({ error: "Gagal memperbarui dompet" }, { status: 500 });
  }
}
