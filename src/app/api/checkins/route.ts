import { NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";

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
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

// GET /api/checkins → { checkins } urut date desc
export async function GET() {
  try {
    const checkins = await db.checkIn.findMany({ orderBy: { date: "desc" } });
    return NextResponse.json({ checkins });
  } catch (e) {
    console.error("checkins GET error", e);
    return NextResponse.json({ error: "Gagal memuat check-in" }, { status: 500 });
  }
}

// POST /api/checkins — upsert by date (tanggal unik)
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const date = typeof body.date === "string" && body.date.trim() ? body.date.trim() : new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
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

    return NextResponse.json({ checkin }, { status: 201 });
  } catch (e) {
    console.error("checkins POST error", e);
    return NextResponse.json({ error: "Gagal menyimpan check-in" }, { status: 500 });
  }
}
