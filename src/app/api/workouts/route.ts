import { NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";

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

    const date = str(body.date) ?? new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Format tanggal tidak valid" }, { status: 400 });
    }

    const distanceKm = num(body.distanceKm);
    let paceMin = num(body.paceMin);
    if ((paceMin === null || paceMin <= 0) && distanceKm !== null && distanceKm > 0) {
      paceMin = Math.round((durationMin / distanceKm) * 100) / 100;
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
        .filter((s) => s.exercise.length > 0 && s.weight >= 0);
      if (items.length > 0) strengthJson = JSON.stringify(items);
    }

    const workout = await db.workout.create({
      data: {
        type,
        title: str(body.title),
        date,
        startTime: str(body.startTime),
        durationMin,
        distanceKm,
        calories: num(body.calories),
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
