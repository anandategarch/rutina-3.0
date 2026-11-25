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
| Database | Prisma ORM + SQLite                              |

## Mulai Cepat

Prasyarat: [Bun](https://bun.sh) ≥ 1.1 (atau Node.js ≥ 20 + npm/pnpm).

```bash
# 1. Install dependencies (sekaligus generate Prisma Client)
bun install

# 2. Siapkan environment
cp .env.example .env
#   isi DATABASE_URL, mis. DATABASE_URL=file:./db/custom.db

# 3. Buat/sinkronkan database SQLite (folder db/ otomatis dibuat)
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
| `bun run db:push`  | Sinkronkan schema Prisma ke database          |

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
