import { NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";
import { jakartaToday, isValidDateStr } from "@/lib/rutina/format";

export const dynamic = "force-dynamic";

const VALID_MEALS = ["breakfast", "lunch", "dinner", "snack"];

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

// GET /api/foods → { entries } urut date desc, createdAt asc
export async function GET() {
  try {
    const entries = await db.foodEntry.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ entries });
  } catch (e) {
    console.error("foods GET error", e);
    return NextResponse.json({ error: "Gagal memuat asupan" }, { status: 500 });
  }
}

// POST /api/foods — buat entri asupan baru
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const name = str(body.name);
    if (!name) {
      return NextResponse.json({ error: "Nama makanan wajib diisi" }, { status: 400 });
    }

    const calories = num(body.calories);
    if (calories === null || calories < 0) {
      return NextResponse.json({ error: "Kalori wajib diisi (angka)" }, { status: 400 });
    }

    const meal = str(body.meal) ?? "lunch";
    if (!VALID_MEALS.includes(meal)) {
      return NextResponse.json({ error: "Waktu makan tidak valid" }, { status: 400 });
    }

    const date = str(body.date) ?? jakartaToday();
    if (!isValidDateStr(date)) {
      return NextResponse.json({ error: "Format tanggal tidak valid" }, { status: 400 });
    }

    const entry = await db.foodEntry.create({
      data: {
        name,
        portion: str(body.portion),
        calories,
        protein: num(body.protein),
        carbs: num(body.carbs),
        fat: num(body.fat),
        meal,
        date,
      },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (e) {
    console.error("foods POST error", e);
    return NextResponse.json({ error: "Gagal menyimpan asupan" }, { status: 500 });
  }
}
