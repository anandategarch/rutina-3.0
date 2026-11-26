import { NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";
import { jakartaToday, isValidDateStr } from "@/lib/rutina/format";

export const dynamic = "force-dynamic";

function int1to5(v: unknown): number | null | undefined {
  // undefined = field tidak dikirim; null = kirim null (hapus nilai)
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < 1 || n > 5) return undefined;
  return n;
}

function numOrNull(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = Number(v);
  // audit B2-M6: jam tidur wajar hanya 0-24 (dipakai khusus sleepHours)
  return Number.isFinite(n) && n >= 0 && n <= 24 ? n : undefined;
}

// GET /api/checkins → { checkins } urut date desc
export async function GET() {
  try {
    // audit B2-M2: batasi 365 baris terbaru — payload tak membengkak tanpa batas
    const checkins = await db.checkIn.findMany({ orderBy: { date: "desc" }, take: 365 });
    return NextResponse.json({ checkins });
  } catch (e) {
    console.error("checkins GET error", e);
    return NextResponse.json({ error: "Gagal memuat check-in" }, { status: 500 });
  }
}

// POST /api/checkins — upsert by date (tanggal unik)
export async function POST(req: Request) {
  try {
    // audit B2-M6: body rusak/null tidak boleh diam-diam dianggap {}
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
    }

    const date =
      typeof body.date === "string" && body.date.trim() ? body.date.trim() : jakartaToday();
    if (!isValidDateStr(date)) {
      return NextResponse.json({ error: "Format tanggal tidak valid" }, { status: 400 });
    }

    const mood = int1to5(body.mood);
    const energy = int1to5(body.energy);
    const soreness = int1to5(body.soreness);
    const stress = int1to5(body.stress);
    const sleepHours = numOrNull(body.sleepHours);
    const note =
      body.note === undefined
        ? undefined
        : typeof body.note === "string" && body.note.trim().length > 0
          ? body.note.trim()
          : null;
    // audit B2-M2: catatan dibatasi 500 karakter — tolak, jangan potong teks user
    if (note && note.length > 500) {
      return NextResponse.json({ error: "Catatan maksimal 500 karakter" }, { status: 400 });
    }

    if (mood === undefined && body.mood !== undefined) {
      return NextResponse.json({ error: "Nilai mood harus 1-5" }, { status: 400 });
    }
    if (energy === undefined && body.energy !== undefined) {
      return NextResponse.json({ error: "Nilai energi harus 1-5" }, { status: 400 });
    }
    if (soreness === undefined && body.soreness !== undefined) {
      return NextResponse.json({ error: "Nilai nyeri otot harus 1-5" }, { status: 400 });
    }
    if (stress === undefined && body.stress !== undefined) {
      return NextResponse.json({ error: "Nilai stres harus 1-5" }, { status: 400 });
    }
    if (sleepHours === undefined && body.sleepHours !== undefined) {
      return NextResponse.json({ error: "Durasi tidur tidak valid" }, { status: 400 });
    }

    // 201 hanya untuk pembuatan baru; pembaruan check-in yang sudah ada → 200
    const existing = await db.checkIn.findUnique({ where: { date } });
    const checkin = await db.checkIn.upsert({
      where: { date },
      create: {
        date,
        mood: mood ?? null,
        energy: energy ?? null,
        soreness: soreness ?? null,
        stress: stress ?? null,
        sleepHours: sleepHours ?? null,
        note: note ?? null,
      },
      update: {
        ...(mood !== undefined && { mood }),
        ...(energy !== undefined && { energy }),
        ...(soreness !== undefined && { soreness }),
        ...(stress !== undefined && { stress }),
        ...(sleepHours !== undefined && { sleepHours }),
        ...(note !== undefined && { note }),
      },
    });

    return NextResponse.json({ checkin }, { status: existing ? 200 : 201 });
  } catch (e) {
    console.error("checkins POST error", e);
    return NextResponse.json({ error: "Gagal menyimpan check-in" }, { status: 500 });
  }
}
