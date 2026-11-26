import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/rutina/server";
import { jakartaToday, isValidDateStr } from "@/lib/rutina/format";

export const dynamic = "force-dynamic";

function numOrNull(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = Number(v);
  // audit B3-M4: terima 0 (hidrasi) — rentang tiap field divalidasi di POST
  return Number.isFinite(n) ? n : undefined;
}

// GET /api/body-metrics → { metrics } urut date asc
export async function GET() {
  try {
    const metrics = await db.bodyMetric.findMany({
      orderBy: { date: "asc" },
      take: 365, // audit B3-B4: batasi hasil query
    });
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

    const date =
      typeof body.date === "string" && body.date.trim() ? body.date.trim() : jakartaToday();
    if (!isValidDateStr(date)) {
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
    // audit B3-M6: berat wajar 20–400 kg (tetap > 0)
    if (weightKg !== undefined && weightKg !== null && (weightKg < 20 || weightKg > 400)) {
      return NextResponse.json({ error: "Berat badan harus antara 20–400 kg" }, { status: 400 });
    }
    // audit B3-M4: hidrasi boleh 0 gelas, maksimal 50
    if (
      hydrationGlasses !== undefined &&
      hydrationGlasses !== null &&
      (hydrationGlasses < 0 || hydrationGlasses > 50)
    ) {
      return NextResponse.json({ error: "Jumlah gelas harus antara 0–50" }, { status: 400 });
    }
    if (weightKg === undefined && hydrationGlasses === undefined) {
      return NextResponse.json({ error: "Isi berat badan dan/atau hidrasi" }, { status: 400 });
    }

    // 201 hanya untuk pembuatan baru; pembaruan metrik yang sudah ada → 200
    const existing = await db.bodyMetric.findUnique({ where: { date } });
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

    return NextResponse.json({ metric }, { status: existing ? 200 : 201 });
  } catch (e) {
    // audit B3-M4: dua POST tanggal sama bersamaan (unique date) → 409, bukan 500 generik
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "Data untuk tanggal ini sudah ada, coba muat ulang" },
        { status: 409 }
      );
    }
    console.error("body-metrics POST error", e);
    return NextResponse.json({ error: "Gagal menyimpan metrik tubuh" }, { status: 500 });
  }
}
