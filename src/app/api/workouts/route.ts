import { NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";
import { jakartaToday, isValidDateStr } from "@/lib/rutina/format";

export const dynamic = "force-dynamic";

const VALID_TYPES = ["run", "walk", "runwalk", "badminton", "strength"];

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

// GET /api/workouts → { workouts } urut date desc
export async function GET() {
  try {
    const workouts = await db.workout.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 365, // audit B3-B4: batasi hasil query
    });
    return NextResponse.json({ workouts });
  } catch (e) {
    console.error("workouts GET error", e);
    return NextResponse.json({ error: "Gagal memuat latihan" }, { status: 500 });
  }
}

// POST /api/workouts — buat sesi latihan baru (validasi type & durationMin)
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const type = str(body.type);
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Jenis latihan tidak valid" }, { status: 400 });
    }

    const durationMin = num(body.durationMin);
    if (durationMin === null || durationMin <= 0) {
      return NextResponse.json({ error: "Durasi wajib diisi (lebih dari 0 menit)" }, { status: 400 });
    }
    // audit B3-B2: durasi maksimal 24 jam
    if (durationMin > 1440) {
      return NextResponse.json({ error: "Durasi maksimal 24 jam" }, { status: 400 });
    }

    const date = str(body.date) ?? jakartaToday();
    if (!isValidDateStr(date)) {
      return NextResponse.json({ error: "Format tanggal tidak valid" }, { status: 400 });
    }

    // audit B3-B2: startTime harus "HH:MM" (00:00–23:59); selain itu dianggap tidak diisi
    const rawStart = str(body.startTime);
    const startTime =
      rawStart !== null && /^([01]\d|2[0-3]):[0-5]\d$/.test(rawStart) ? rawStart : null;

    const distanceKm = num(body.distanceKm);
    // audit B3-B2: jarak diisi → wajib angka > 0 dan ≤ 500
    if (
      body.distanceKm !== undefined &&
      body.distanceKm !== null &&
      String(body.distanceKm).trim() !== "" &&
      (distanceKm === null || distanceKm <= 0 || distanceKm > 500)
    ) {
      return NextResponse.json({ error: "Jarak tidak valid" }, { status: 400 });
    }

    let paceMin = num(body.paceMin);
    // audit B3-B2: pace diisi → wajib angka ≥ 0 dan ≤ 600 (tidak pernah tersimpan negatif)
    if (
      body.paceMin !== undefined &&
      body.paceMin !== null &&
      String(body.paceMin).trim() !== "" &&
      (paceMin === null || paceMin < 0 || paceMin > 600)
    ) {
      return NextResponse.json({ error: "Pace tidak valid" }, { status: 400 });
    }
    if ((paceMin === null || paceMin <= 0) && distanceKm !== null && distanceKm > 0) {
      paceMin = Math.round((durationMin / distanceKm) * 100) / 100;
    }

    const calories = num(body.calories);
    // audit B3-B2: kalori diisi → wajib angka ≥ 0 dan ≤ 10000
    if (
      body.calories !== undefined &&
      body.calories !== null &&
      String(body.calories).trim() !== "" &&
      (calories === null || calories < 0 || calories > 10000)
    ) {
      return NextResponse.json({ error: "Kalori tidak valid" }, { status: 400 });
    }

    // Strength items → JSON string array
    let strengthJson: string | null = null;
    if (type === "strength" && Array.isArray(body.strength) && body.strength.length > 0) {
      const items = body.strength
        .map((s: Record<string, unknown>) => ({
          exercise: str(s.exercise) ?? "",
          muscleGroup: str(s.muscleGroup) ?? "",
          weight: num(s.weight) ?? 0,
          reps: Math.max(1, Math.round(num(s.reps) ?? 0)),
          sets: Math.max(1, Math.round(num(s.sets) ?? 1)),
        }))
        .filter((s: { exercise: string; weight: number }) => s.exercise.length > 0 && s.weight >= 0);
      if (items.length > 0) strengthJson = JSON.stringify(items);
    }

    const workout = await db.workout.create({
      data: {
        type,
        title: str(body.title),
        date,
        startTime,
        durationMin,
        distanceKm,
        calories,
        paceMin,
        notes: str(body.notes),
        strength: strengthJson,
      },
    });

    return NextResponse.json({ workout }, { status: 201 });
  } catch (e) {
    console.error("workouts POST error", e);
    return NextResponse.json({ error: "Gagal menyimpan latihan" }, { status: 500 });
  }
}
