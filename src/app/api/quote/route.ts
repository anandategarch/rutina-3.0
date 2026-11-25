import { NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const quotes = await db.quote.findMany();
    const daysSinceEpoch = Math.floor(Date.now() / 86400000);
    const quote = quotes.length ? quotes[daysSinceEpoch % quotes.length] : null;
    return NextResponse.json({ quote });
  } catch {
    return NextResponse.json({ error: "Gagal memuat kutipan" }, { status: 500 });
  }
}
