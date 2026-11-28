import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Health check koneksi database.
 * Buka /api/health untuk memastikan aplikasi benar-benar tersambung —
 * sangat berguna setelah deploy ke Vercel (mode "turso") atau saat
 * development lokal (mode "sqlite-lokal").
 *
 * Tidak membocorkan URL/token — hanya mode, latensi, dan waktu cek.
 */
export async function GET() {
  const startedAt = Date.now();
  const mode = process.env.TURSO_DATABASE_URL ? "turso" : "sqlite-lokal";

  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      db: mode,
      latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("GET /api/health error", e);
    return NextResponse.json(
      {
        ok: false,
        db: mode,
        error: "Database tidak dapat dihubungi",
        checkedAt: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
