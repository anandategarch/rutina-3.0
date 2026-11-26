import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy (standar ui-ux-pro-max: nextjs #51).
// Pragmatis: Next.js menyuntik skrip inline tanpa nonce, sehingga 'unsafe-inline'
// tetap diperlukan. Dev menambahkan 'unsafe-eval' (HMR/Turbopack) dan ws: (websocket).
// frame-ancestors '*' diperlukan agar halaman bisa dirender di dalam iframe
// Preview Panel sandbox (tanpa direktif ini panel preview tampil kosong).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "frame-ancestors *",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

// Catatan: header X-Frame-Options sengaja TIDAK dipasang. X-Frame-Options: DENY
// memblokir semua iframe, sehingga Preview Panel sandbox gagal menampilkan app.
// Proteksi klikjacking sudah tercakup oleh CSP frame-ancestors di atas.
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
