import { NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";

export const dynamic = "force-dynamic";

const FOLDERS = ["Umum", "Refleksi", "Ide", "Sorotan"];
const MOODS = ["great", "good", "neutral", "tough", "low"];

function countWords(content: string): number {
  const trimmed = content.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * PATCH /api/journal/[id] { title?, content?, folder?, mood?, pinned? }
 * Recompute wordCount bila content berubah.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
    }

    const existing = await db.journalEntry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Catatan tidak ditemukan" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    if (typeof body.title === "string") data.title = body.title.trim().slice(0, 200);
    if (typeof body.content === "string") {
      const content = body.content.trim();
      if (!content) {
        return NextResponse.json({ error: "Isi catatan tidak boleh kosong" }, { status: 400 });
      }
      // audit B3-B1: cap konten selaras dengan POST
      if (content.length > 50_000) {
        return NextResponse.json(
          { error: "Catatan terlalu panjang (maks 50.000 karakter)" },
          { status: 400 }
        );
      }
      data.content = content;
      data.wordCount = countWords(content);
    }
    if (typeof body.folder === "string" && FOLDERS.includes(body.folder)) data.folder = body.folder;
    // audit B3-L4: mood tidak valid → null (selaras dengan POST), bukan diabaikan diam-diam
    if (body.mood !== undefined) {
      data.mood = typeof body.mood === "string" && MOODS.includes(body.mood) ? body.mood : null;
    }
    if (typeof body.pinned === "boolean") data.pinned = body.pinned;

    const entry = await db.journalEntry.update({ where: { id }, data });
    return NextResponse.json({ entry });
  } catch (e) {
    console.error("journal PATCH error", e);
    return NextResponse.json({ error: "Gagal memperbarui catatan" }, { status: 500 });
  }
}

/**
 * DELETE /api/journal/[id] → { ok: true }
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await db.journalEntry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Catatan tidak ditemukan" }, { status: 404 });
    }
    await db.journalEntry.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("journal DELETE error", e);
    return NextResponse.json({ error: "Gagal menghapus catatan" }, { status: 500 });
  }
}
