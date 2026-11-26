import { NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";

export const dynamic = "force-dynamic";

// GET /api/food-items?q= → { items } max 12
// Dengan q: filter nama contains (SQLite `contains` case-insensitive untuk ASCII).
// Tanpa q: ambil id saja → acak di JS → ambil 12 baris penuh (tanpa memuat seluruh tabel).
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    // audit B3-M5: buang wildcard LIKE (% dan _) dari q
    const q = (url.searchParams.get("q") ?? "").replace(/[%_]/g, "").trim().toLowerCase();

    let items;
    if (q.length > 0) {
      // Filter & limit di sisi database — tidak memuat seluruh baris
      items = await db.foodItem.findMany({
        where: { name: { contains: q } },
        orderBy: { name: "asc" },
        take: 12,
      });
    } else {
      // audit B3-L3: pilih 12 id acak dulu, baru ambil baris penuhnya — hemat memori
      const rows = await db.foodItem.findMany({ select: { id: true } });
      const ids = rows
        .map((r) => r.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 12);
      items = await db.foodItem.findMany({ where: { id: { in: ids } } });
    }

    return NextResponse.json({ items });
  } catch (e) {
    console.error("food-items GET error", e);
    return NextResponse.json({ error: "Gagal memuat daftar makanan" }, { status: 500 });
  }
}
