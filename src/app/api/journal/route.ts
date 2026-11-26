import { NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";

export const dynamic = "force-dynamic";

const FOLDERS = ["Umum", "Refleksi", "Ide", "Sorotan"];
const MOODS = ["great", "good", "neutral", "tough", "low"];

/** Hitung jumlah kata dari konten (split whitespace). */
function countWords(content: string): number {
  const trimmed = content.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * GET /api/journal → { entries }
 * Urut: pinned desc, lalu updatedAt desc.
 */
export async function GET() {
  try {
    const entries = await db.journalEntry.findMany({
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    });
    return NextResponse.json({ entries });
  } catch (e) {
    console.error("journal GET error", e);
    return NextResponse.json({ error: "Gagal memuat catatan jurnal" }, { status: 500 });
  }
}

/**
 * POST /api/journal { title?, content (wajib), folder?, mood?, pinned? }
 * Membuat entri jurnal baru dengan wordCount otomatis.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
    }

    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) {
      return NextResponse.json({ error: "Isi catatan wajib diisi" }, { status: 400 });
    }
    if (content.length > 50_000) {
      return NextResponse.json({ error: "Isi catatan maksimal 50.000 karakter" }, { status: 400 });
    }

    const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
    const folder = typeof body.folder === "string" && FOLDERS.includes(body.folder) ? body.folder : "Umum";
    const mood = typeof body.mood === "string" && MOODS.includes(body.mood) ? body.mood : null;
    const pinned = body.pinned === true;

    const entry = await db.journalEntry.create({
      data: {
        title,
        content,
        folder,
        mood,
        pinned,
        wordCount: countWords(content),
      },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (e) {
    console.error("journal POST error", e);
    return NextResponse.json({ error: "Gagal menyimpan catatan" }, { status: 500 });
  }
}
