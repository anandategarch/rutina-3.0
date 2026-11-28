# CLAUDE.md — Rutina 3.0

Panduan untuk agent AI yang bekerja di repo ini.

## Konteks proyek

- **Stack**: Next.js 16 (App Router, Turbopack), TypeScript strict, Tailwind CSS 4,
  shadcn/ui subset (komponen ada di `src/components/ui` — jangan bikin ulang), Prisma +
  SQLite, TanStack Query v5, Zustand, framer-motion, vaul, sonner.
- **Arsitektur**: SPA single-route (`src/app/page.tsx` → `RutinaApp`). Navigasi antar
  7 layar via Zustand store (`src/store/rutina.ts`), tersinkron ke `location.hash`.
  Data via API route handlers (`src/app/api/**`) — **jangan pakai Server Actions**.
- **Runtime**: bun. `bun run dev` (port 3000), `bun run lint`, `bun run typecheck`,
  `bun run db:push` setelah mengubah `prisma/schema.prisma`.
- **PERINGATAN DATABASE_URL**: shell sandbox bisa mengekspor `DATABASE_URL` lama yang
  menunjuk ke folder proyek lain — env proses **meng-override** `.env`. Saat memulai
  server, paksa secara eksplisit:
  `env DATABASE_URL=file:/home/z/my-project/db/custom.db bun run dev`.
  Gejala salah sambung: data tiba-tiba kosong / profil null.
- **Zona waktu**: semua "hari ini" wajib lewat `jakartaToday()` (`src/lib/rutina/format.ts`),
  bukan `new Date()` UTC.

## Design loop (wajib untuk perubahan UI)

Adaptasi dari [ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
— baca `docs/DESIGN.md` untuk design system lengkap.

1. **Rencanakan** keputusan desain dulu: tujuan, tone, constraint, diferensiasi. Untuk
   keputusan baru (warna/font/gaya baru), dasarkan pada standar yang sudah di-commit,
   bukan selera ad-hoc.
2. **Bangun** mobile-first (360px), tingkatkan ke tablet/desktop. Shell full-bleed,
   konten `max-w-[512px]` ter-center di layar lebar.
3. **Lihat hasilnya** — jangan pernah selesai tanpa membuka halaman di browser:
   screenshot di 390px dan 1440px, klik alur utamanya, cek console.
4. **Audit**: `bun run audit:design` (heuristik 6 viewport) — wajib 0 high sebelum
   selesai. Review manual 7 fase untuk perubahan besar.
5. **Non-negotiable**: target sentuh ≥44px, WCAG AA (teks ≥4.5:1, UI ≥3:1), focus
   indicator terlihat, `prefers-reduced-motion` dihormati, state loading/empty/error
   lengkap, konfirmasi aksi destruktif, safe-area insets.

## Konvensi kode

- Client components: gunakan `'use client'` hanya bila perlu; layar overlay & sheet
  di-load via `next/dynamic` (lihat `app-shell.tsx`).
- API routes: `NextResponse.json`, `export const dynamic = "force-dynamic"`,
  validasi input manual ketat (lihat rute existing sebagai pola).
- Animasi: `.press` untuk feedback sentuh, framer-motion untuk transisi; jangan animasi
  properti layout (height/width) pada elemen banyak — pakai transform/opacity.
- Toast: `sonner` via `toast.*` (sudah ter-mount di layout). Jangan buat sistem toast lain.

## Jangan lakukan

- Jangan commit `db/*.db`, `.env`, atau log (`*.log`).
- Jangan menambah dependensi besar tanpa alasan (bundle awal dijaga ramping).
- Jangan menulis rute baru di luar `/` tanpa diskusi — arsitektur adalah SPA.
- Jangan melewati langkah screenshot; "compiles" ≠ "works".
