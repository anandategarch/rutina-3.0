import { NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";
import { isP2025 } from "@/lib/rutina/catalog-ensure";

export const dynamic = "force-dynamic";

// DELETE /api/workouts/[id] → { ok: true }
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await db.workout.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Latihan tidak ditemukan" }, { status: 404 });
    }
    await db.workout.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    // audit E-B9 (TOCTOU): latihan sudah terhapus request lain
    if (isP2025(e)) {
      return NextResponse.json({ error: "Latihan tidak ditemukan" }, { status: 404 });
    }
    console.error("workouts DELETE error", e);
    return NextResponse.json({ error: "Gagal menghapus latihan" }, { status: 500 });
  }
}
