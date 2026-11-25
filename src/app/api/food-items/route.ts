import { NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";

export const dynamic = "force-dynamic";

// GET /api/food-items?q= → { items } max 12
// Dengan q: filter nama contains (SQLite `contains` case-insensitive untuk ASCII).
// Tanpa q: 12 item acak sebagai saran populer.
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

    let items;
    if (q.length > 0) {
      // Filter & limit di sisi database — tidak memuat seluruh baris
      items = await db.foodItem.findMany({
        where: { name: { contains: q } },
        orderBy: { name: "asc" },
        take: 12,
      });
    } else {
      const all = await db.foodItem.findMany({ orderBy: { name: "asc" } });
      items = [...all].sort(() => Math.random() - 0.5).slice(0, 12);
    }

    return NextResponse.json({ items });
  } catch (e) {
    console.error("food-items GET error", e);
    return NextResponse.json({ error: "Gagal memuat daftar makanan" }, { status: 500 });
  }
}
