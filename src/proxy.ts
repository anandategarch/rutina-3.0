import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proteksi CSRF blanket untuk seluruh /api/* — konvensi file Next.js 16
 * (`proxy.ts`, pengganti `middleware.ts` yang deprecated).
 *
 * Aturan:
 * 1. Setiap request mutasi (POST/PATCH/PUT/DELETE) wajib berasal dari
 *    origin/host yang sama.
 *    - Header Origin/Referer ABSEN (mis. curl, skrip) → diizinkan (klien
 *      non-browser tidak bisa dibohongi browser korban untuk mengirimnya
 *      secara otomatis).
 *    - Origin/Referer ADA tapi host-nya beda → 403 (klikjacking / situs lain
 *      yang memaksa browser korban mengirim request mutasi).
 *    - audit E-B6: host tepercaya mencakup x-forwarded-host — deployment di
 *      belakang proxy yang menulis ulang Host (mis. Caddy/gateway) tidak
 *      lagi salah 403.
 * 2. Endpoint destruktif (/api/danger/*, /api/import) ekstra ketat: wajib
 *    membawa header klien `x-rutina-client: 1` — form lintas-situs dan
 *    iframe sandboxed (yang mengirim Origin: null dan lolos aturan umum)
 *    tidak bisa memasang header kustom, jadi reset/impor massal tidak bisa
 *    dipicu dari luar aplikasi (audit E-B7).
 */
export function proxy(req: NextRequest) {
  const isMutation = !["GET", "HEAD", "OPTIONS"].includes(req.method);
  if (isMutation && req.nextUrl.pathname.startsWith("/api/")) {
    // audit E-B7: gerbang destruktif — header kustom tidak bisa dipalsukan
    // form/iframe lintas origin apa pun.
    const destructive =
      req.nextUrl.pathname.startsWith("/api/danger/") ||
      req.nextUrl.pathname.startsWith("/api/import");
    if (destructive && req.headers.get("x-rutina-client") !== "1") {
      return NextResponse.json(
        { error: "Aksi ini hanya boleh dijalankan dari aplikasi Rutina." },
        { status: 403 }
      );
    }

    const origin = req.headers.get("origin") ?? req.headers.get("referer");
    // Origin: null — literal "null" dikirim browser untuk konteks sandboxed iframe
    // / webview privacy. Bukan situs lain yang memaksa, jadi diizinkan lewat
    // (new URL("null") akan throw dan 403-kan user legitimate).
    if (origin && origin !== "null") {
      try {
        const originHost = new URL(origin).host;
        // audit E-B6: di belakang reverse proxy, Host permintaan bisa berbeda
        // dari origin browser — ikut percayai daftar x-forwarded-host.
        const fwd = req.headers.get("x-forwarded-host");
        const trusted = new Set(
          [req.nextUrl.host, ...(fwd ? fwd.split(",").map((h) => h.trim()) : [])].filter(Boolean)
        );
        if (originHost && ![...trusted].some((h) => h === originHost)) {
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
