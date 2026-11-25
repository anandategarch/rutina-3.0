import { NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";
import { daysBetween, jakartaToday } from "@/lib/rutina/format";

export const dynamic = "force-dynamic";

// Hari acuan agar indeks kutipan stabil dan berganti tepat saat berganti hari di WIB
const QUOTE_EPOCH = "2024-01-01";

export async function GET() {
  try {
    const quotes = await db.quote.findMany();
    let quote: (typeof quotes)[number] | null = null;
    if (quotes.length > 0) {
      const dayIndex =
        ((daysBetween(QUOTE_EPOCH, jakartaToday()) % quotes.length) + quotes.length) %
        quotes.length;
      quote = quotes[dayIndex];
    }
    return NextResponse.json({ quote });
  } catch (e) {
    console.error("quote GET error", e);
    return NextResponse.json({ error: "Gagal memuat kutipan" }, { status: 500 });
  }
}
