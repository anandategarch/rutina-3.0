import { NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";

export const dynamic = "force-dynamic";

function numOrNull(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

// GET /api/body-metrics → { metrics } urut date asc
export async function GET() {
  try {
    const metrics = await db.bodyMetric.findMany({ orderBy: { date: "asc" } });
    return NextResponse.json({ metrics });
  } catch (e) {
    console.error("body-metrics GET error", e);
    return NextResponse.json({ error: "Gagal memuat metrik tubuh" }, { status: 500 });
  }
}

// POST /api/body-metrics — upsert by date (weightKg dan/atau hydrationGlasses)
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const date = typeof body.date === "string" && body.date.trim() ? body.date.trim() : new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Format tanggal tidak valid" }, { status: 400 });
    }

    const weightKg = numOrNull(body.weightKg);
    const hydrationGlasses = numOrNull(body.hydrationGlasses);

    if (weightKg === undefined && body.weightKg !== undefined) {
      return NextResponse.json({ error: "Berat badan tidak valid" }, { status: 400 });
    }
    if (hydrationGlasses === undefined && body.hydrationGlasses !== undefined) {
      return NextResponse.json({ error: "Jumlah gelas tidak valid" }, { status: 400 });
    }
    if (weightKg === undefined && hydrationGlasses === undefined) {
      return NextResponse.json({ error: "Isi berat badan dan/atau hidrasi" }, { status: 400 });
    }

    const metric = await db.bodyMetric.upsert({
      where: { date },
      create: {
        date,
        weightKg: weightKg ?? null,
        hydrationGlasses: hydrationGlasses ?? null,
      },
      update: {
        // hanya field yang dikirim yang diubah — yang lain dipertahankan
        ...(weightKg !== undefined && { weightKg }),
        ...(hydrationGlasses !== undefined && { hydrationGlasses }),
      },
    });

    return NextResponse.json({ metric }, { status: 201 });
  } catch (e) {
    console.error("body-metrics POST error", e);
    return NextResponse.json({ error: "Gagal menyimpan metrik tubuh" }, { status: 500 });
  }
}
