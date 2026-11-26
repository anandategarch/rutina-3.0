# Rutina 3.0

Aplikasi personal mobile-first untuk mengelola rutinitas dan perkembangan hidup sehari-hari: **kebiasaan, kebugaran, keuangan, jurnal, dan statistik** dalam satu tempat.

![stack](https://img.shields.io/badge/Next.js%2016-App%20Router-black) ![ts](https://img.shields.io/badge/TypeScript-5-3178c6) ![db](https://img.shields.io/badge/Prisma-SQLite-16a34a)

## Fitur

- **Beranda** — agenda harian, streak kebiasaan, kalender 7 hari, check-in cepat
- **Kebiasaan (The Garden)** — kebiasaan harian/kustom, kebiasaan terukur (unit + target), arsip, konsistensi
- **Kebugaran (Performance Studio)** — kardio (lari/jalan/badminton), latihan beban, asupan makanan, check-in harian (mood/energi/tidur), metrik tubuh
- **Keuangan (The Vault)** — multi-dompet, transaksi (masuk/keluar/transfer), anggaran kategori, target tabungan
- **Jurnal (Writing Room)** — folder, mood, pin catatan, jumlah kata otomatis
- **Statistik** — radar kebiasaan, heatmap 90 hari, tren berat, komposisi kategori, achievement & XP
- **Ekspor / Impor** — backup JSON lengkap + ekspor CSV
- **PWA-ready** — manifest, safe-area iPhone (notch & home indicator), tema terang/gelap

## Teknologi

| Lapisan  | Teknologi                                        |
| -------- | ------------------------------------------------ |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui, framer-motion, vaul, Zustand, TanStack Query |
| Backend  | Next.js Route Handlers, Zona waktu Asia/Jakarta  |
| Database | Prisma ORM via driver adapter — Turso/libSQL (produksi) atau SQLite lokal (development) |

## Mulai Cepat

Prasyarat: [Bun](https://bun.sh) ≥ 1.1 (atau Node.js ≥ 20 + npm/pnpm).

```bash
# 1. Install dependencies (sekaligus generate Prisma Client)
bun install

# 2. Siapkan environment
cp .env.example .env
#   isi DATABASE_URL dengan path ABSOLUT atau relatif-dari-folder-prisma, mis.:
#   DATABASE_URL="file:../db/custom.db"   (mengarah ke folder db/ di root project)
#   Catatan: Prisma me-resolve path relatif terhadap prisma/, bukan root —
#   lihat penjelasan di .env.example.

# 3. Buat/sinkronkan database SQLite (folder db/ di root project)
bun run db:push

# 4. Jalankan development server
bun run dev
```

Buka `http://localhost:3000`.

### Skrip

| Perintah           | Fungsi                                        |
| ------------------ | --------------------------------------------- |
| `bun run dev`      | Development server di port 3000               |
| `bun run build`    | Build produksi (output standalone)            |
| `bun run start`    | Jalankan server produksi                      |
| `bun run lint`     | ESLint                                        |
| `bun run typecheck`| `tsc --noEmit`                                |
| `bun run db:push`  | Sinkronkan schema Prisma ke database lokal    |
| `bun scripts/turso-sync.ts` | Terapkan schema Prisma ke database Turso (aman, tidak menyentuh tabel lain) |
| `bun scripts/seed.ts`       | Isi data sampling 30 hari (idempoten; mengikuti env aktif: Turso atau SQLite) |

## Deploy ke Vercel + Turso

Aplikasi ini siap di-deploy ke [Vercel](https://vercel.com) dengan database [Turso](https://turso.tech) — tanpa mengubah satu baris kode.

### 1. Siapkan database Turso

```bash
# Buat database & token (butuh turso CLI)
turso db create habit-tracker
turso db tokens create habit-tracker
```

Sinkronkan schema Prisma ke Turso (sekali di awal, dan setiap kali schema berubah):

```bash
TURSO_DATABASE_URL="libsql://habit-tracker-username.turso.io" \
TURSO_AUTH_TOKEN="eyJ..." \
bun scripts/turso-sync.ts

# Opsional: isi data sampling agar aplikasi langsung berisi (idempoten)
TURSO_DATABASE_URL="libsql://habit-tracker-username.turso.io" \
TURSO_AUTH_TOKEN="eyJ..." \
bun scripts/seed.ts
```

### 2. Set environment variables di Vercel

Dashboard → Project → Settings → Environment Variables (atau `vercel env add`):

| Variabel            | Nilai                                   |
| ------------------- | --------------------------------------- |
| `TURSO_DATABASE_URL` | `libsql://habit-tracker-username.turso.io` |
| `TURSO_AUTH_TOKEN`   | token dari `turso db tokens create`     |

`DATABASE_URL` (SQLite lokal) **tidak diperlukan** di Vercel — ketika `TURSO_DATABASE_URL` terpasang, aplikasi otomatis memakai Turso (logika di `src/lib/db.ts`).

### 3. Deploy

```bash
vercel --prod
```

Vercel menjalankan `next build`; Prisma Client di-generate otomatis lewat skrip `postinstall`. Paket `@libsql/client`, `@prisma/adapter-libsql`, dan `libsql` sudah didaftarkan di `serverExternalPackages` agar aman di runtime serverless.

### 4. Verifikasi koneksi

Buka `https://<project>.vercel.app/api/health` — bila JSON-nya `"ok": true, "db": "turso"` berarti aplikasi benar-benar tersambung ke Turso di production (endpoint ini juga bisa dipakai kapan saja untuk cek kesehatan database; tidak membocorkan token).

### Cara kerja koneksi ganda

`src/lib/db.ts` memilih koneksi secara otomatis:

- `TURSO_DATABASE_URL` terpasang → Prisma Client + [driver adapter libSQL](https://www.prisma.io/docs/orm/overview/databases/database-drivers) (kompatibel serverless Vercel, koneksi via HTTP).
- Tanpa Turso → SQLite lokal via `DATABASE_URL` (development offline).

Data migrasi dari aplikasi versi lama (tabel `rutina_*` dsb.) tidak diganggu gugat — Rutina 3.0 memakai tabel sendiri (`Habit`, `Transaction`, dsb.) berdampingan dengan tabel legacy di database yang sama.

## Migrasi Data Legacy (Rutina 2.0 → 3.0)

Sudah dijalankan untuk database saat ini. Jika suatu saat perlu mengulang (mis. database baru):

```bash
bun scripts/turso-migrate-legacy.ts
```

Yang dilakukan script:

- Membaca tabel legacy `rutina_wallets`, `rutina_habits`, `rutina_habit_logs`, `rutina_transactions`, `rutina_budgets`, `rutina_goals`, `rutina_body_logs`, `rutina_mood_logs`, `rutina_workout_sessions`, `rutina_app_settings` (read-only — legacy tidak pernah diubah).
- Menghapus data sampling di tabel 3.0, lalu mengimpor data asli (idempoten — hasil re-run selalu sama).
- ID legacy dipertahankan agar relasi wallet↔transaksi & habit↔log tersambung; 2 transaksi tanpa dompet ditempatkan ke dompet pertama (Kas).
- Mapping: `masuk/keluar` → `income/expense`, kategori habit `Kesehatan/Belajar/Pribadi` → `health/learning/mind`, mood teks → skala 1–5, `lari-jalan` → `runwalk`, ikon habit dipetakan dari judul.
- Check-in = gabungan `rutina_body_logs` (tidur/energi/sakit/stress) + `rutina_mood_logs` per tanggal.
- Achievement dievaluasi ulang dari data asli (kriteria sama dengan app; XP = log×10 + workout×25 + jurnal×15 + check-in×5).
- Profile: `dailyMissionTarget` diambil dari pengaturan legacy `app.dailyGoal`.

## Struktur Proyek

```
src/
├── app/
│   ├── api/            # Route handlers (habits, workouts, finance, journal, dst.)
│   ├── layout.tsx      # Font, metadata PWA, Toaster (sonner)
│   └── page.tsx        # Entry point → RutinaApp
├── components/
│   ├── rutina/
│   │   ├── screens/    # 7 layar utama (home, fitness, finance, habits, dst.)
│   │   ├── sheets/     # Bottom sheet tambah data (vaul)
│   │   ├── charts.tsx  # Chart kit SVG custom (ringan, tanpa dependensi)
│   │   └── app-shell.tsx
│   └── ui/             # Komponen shadcn/ui yang dipakai
├── lib/rutina/         # Helper tanggal (Asia/Jakarta), format, API client
├── store/              # Zustand (navigasi tab & quick action)
└── types/              # Tipe payload
prisma/schema.prisma    # Model database
```

## Catatan API

- Semua respons JSON konsisten: data atau `{ error: "pesan dalam Bahasa Indonesia" }`.
- Endpoint destruktif (`/api/danger/reset`) mewajibkan body `{ "confirm": "RESET RUTINA" }` + pemeriksaan Origin.
- `/api/import` berjalan dalam satu transaksi Prisma — gagal di tengah jalan tidak akan merusak data lama.
- Tanggal disimpan sebagai string `YYYY-MM-DD` dan "hari ini" dihitung di zona waktu **Asia/Jakarta**.

## Audit Desain

Standar UI/UX mengadopsi [ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (MIT).
Design system, peta kepatuhan, dan backlog ada di [`docs/DESIGN.md`](./docs/DESIGN.md).

```bash
bunx playwright install chromium   # sekali saja
bun run audit:design               # audit heuristik 6 viewport → design-audit/report.md
```

Audit heuristik juga berjalan otomatis di setiap PR yang menyentuh UI
(`.github/workflows/design-review.yml`) dengan laporan + screenshot sebagai artifact.

## Lisensi

[MIT](./LICENSE)
