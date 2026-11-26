import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proteksi CSRF blanket untuk seluruh /api/*.
 * Setiap request mutasi (POST/PATCH/PUT/DELETE) wajib berasal dari origin/host yang sama.
 * - Header Origin/Referer ABSEN (mis. curl, skrip) → diizinkan (klien non-browser tidak
 *   bisa dibojongkan browser korban untuk mengirimnya secara otomatis).
 * - Origin/Referer ADA tapi host-nya beda → 403. (Kasus klikjacking / situs lain
 *   yang memaksa browser korban mengirim request mutasi.)
 *
 * Endpoint danger/reset dan import sudah punya pengecekan same-origin sendiri;
 * middleware ini menyeragamkan posture untuk SEMUA endpoint mutasi lainnya.
 */
export function middleware(req: NextRequest) {
  const isMutation = !["GET", "HEAD", "OPTIONS"].includes(req.method);
  if (isMutation && req.nextUrl.pathname.startsWith("/api/")) {
    const origin = req.headers.get("origin") ?? req.headers.get("referer");
    if (origin) {
      try {
        const originHost = new URL(origin).host;
        if (originHost && originHost !== req.nextUrl.host) {
          return NextResponse.json(
            { error: "Permintaan lintas origin ditolak" },
            { status: 403 }
          );
        }
      } catch {
        // Origin/Referer malformed → tolak untuk request mutasi
        return NextResponse.json({ error: "Origin tidak valid" }, { status: 403 });
      }
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
