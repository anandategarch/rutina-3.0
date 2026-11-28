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
 *
 * audit G1 — AKAR MASALAH "Ada kendala memuat data" (semua tab):
 * Preview Panel memuat app dalam iframe `sandbox` TANPA `allow-same-origin`
 * → origin dokumen menjadi opaque ("null") → setiap fetch('/api/…') dari
 * app adalah CROSS-ORIGIN. Akibat berantai:
 *   a. fetch dengan header kustom (x-rutina-client) memicu CORS preflight
 *      OPTIONS → Next.js tidak punya handler CORS → preflight gagal tanpa
 *      Access-Control-Allow-Origin → request GET asli DIBATALKAN browser
 *      sebelum menyentuh server (log server bersih, user tetap error).
 *   b. Respons tanpa ACAO tidak bisa dibaca JS origin opaque → meski request
 *      "simple" pun tetap gagal.
 * Perbaikan:
 *   - OPTIONS /api/* dijawab 204 + header CORS (preflight lolos).
 *   - Semua respons /api/* membawa Access-Control-Allow-Origin: * (app tidak
 *     memakai cookie/kredensial, jadi wild-card aman; gate CSRF mutasi tetap
 *     menutup aksi destruktif lintas situs).
 */
const CORS_ALLOW_HEADERS = "Content-Type, x-rutina-client";

/**
 * audit G1: respons /api/* diberi ACAO agar bisa dibaca dari iframe sandboxed
 * (origin opaque "null"). Aplikasi tidak memakai cookie/kredensial pada fetch
 * API, jadi "*" aman; mutasi lintas situs tetap ditahan gate CSRF.
 * audit 3-a#1: HELPER ini juga WAJIB dipakai oleh SEMUA early-return di bawah
 * — tanpa ACAO, penolakan 403 dari iframe opaque tak bisa dibaca JS-nya
 * (fetch melempar TypeError opaque, pesan asli hilang dari UI).
 */
function apiJson(data: unknown, status: number): NextResponse {
  const res = NextResponse.json(data, { status });
  res.headers.set("Access-Control-Allow-Origin", "*");
  return res;
}

function corsPreflightResponse(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": CORS_ALLOW_HEADERS,
      // Cache keputusan preflight 24 jam di browser — tanpa ini, setiap
      // request dari iframe opaque menembak OPTIONS dulu (terlihat di log
      // network sebagai barisan OPTIONS 204 sebelum tiap GET).
      "Access-Control-Max-Age": "86400",
    },
  });
}

export function proxy(req: NextRequest) {
  // audit G1: preflight CORS — WAJIB dijawab tanpa melewati gate mutasi.
  if (req.method === "OPTIONS" && req.nextUrl.pathname.startsWith("/api/")) {
    return corsPreflightResponse();
  }

  const isMutation = !["GET", "HEAD", "OPTIONS"].includes(req.method);
  if (isMutation && req.nextUrl.pathname.startsWith("/api/")) {
    // audit E-B7: gerbang destruktif — header kustom tidak bisa dipalsukan
    // form/iframe lintas origin apa pun.
    const destructive =
      req.nextUrl.pathname.startsWith("/api/danger/") ||
      req.nextUrl.pathname.startsWith("/api/import");
    if (destructive && req.headers.get("x-rutina-client") !== "1") {
      return apiJson(
        { error: "Aksi ini hanya boleh dijalankan dari aplikasi Rutina." },
        403
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
          return apiJson({ error: "Permintaan lintas origin ditolak" }, 403);
        }
      } catch {
        // Origin/Referer malformed → tolak untuk request mutasi
        return apiJson({ error: "Origin tidak valid" }, 403);
      }
    }
  }
  // audit G1: respons /api/* diberi ACAO agar bisa dibaca dari iframe
  // sandboxed (origin opaque "null"). Aplikasi tidak memakai cookie/kredensial
  // pada fetch API, jadi "*" aman; mutasi lintas situs tetap ditahan gate
  // CSRF di atas.
  const res = NextResponse.next();
  res.headers.set("Access-Control-Allow-Origin", "*");
  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};
