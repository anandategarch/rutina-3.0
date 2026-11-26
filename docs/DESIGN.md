# Rutina 3.0 — Design System & Standar UI/UX

Dokumen ini mengikat keputusan desain Rutina 3.0 dan mengadopsi standar dari
**[ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)** (MIT,
NextLevelBuilder): 80 UI styles, 194 palet warna, 74 font pairing, 141 UX guidelines,
25 chart types, dan 22 tech-stack rule sets. Adaptasi dilakukan tanggal 25 Nov 2026
(commit audit pertama mengadopsi standar).

## 1. Identitas visual (committed aesthetic)

| Aspek | Keputusan |
|---|---|
| Gaya | Field Notes — Calm Editorial Utility: kertas hangat, permukaan netral 85–90%, tipografi semibold, elevasi halus tanpa inset |
| Tema warna | Kertas `#f4f3ee` + hijau hutan `#315b48` (satu-satunya warna aksi utama); modul hemat: studio (steel blue), vault (teal), writer (terracotta), gold (sand), clay (brick) (rincian §1a) |
| Dark mode | Dukungan penuh via token CSS (`--*`), toggle di Profil |
| Display font | Nunito (variable 200–1000) — semua heading, terminal membulat playful |
| Body font | DM Sans (variable) — teks tubuh geometris bersih |
| Handwritten | Caveat (variable) — kutipan/aksen personal |
| Radius | Kartu 14–18px konsisten: `rounded-lg` (14px), `rounded-xl` (18px), FAB bulat |
| Shadow | Token `shadow-soft`, `shadow-lift`, `shadow-clay` (nilai sudah dinetralkan — tanpa inset glow/claymorphism) |

## 1a. Palet warna resmi "Field Notes" (Calm Editorial Utility)

Satu-satunya sumber warna UI adalah token CSS di `src/app/globals.css`.
Dilarang memakai kelas warna Tailwind mentah (`bg-emerald-500`, dsb.) atau hex
arbitrary (`bg-[#...]`) di komponen — semua lewat token. Palet ditetapkan
sebagai design directive "FIELD NOTES / CALM EDITORIAL UTILITY" dan
**divalidasi terhadap pedoman ui-ux-pro-max**: 34/34 pasangan warna kritis
WCAG 2.1 AA >= 4.5:1 (teks, modul solid+white, deep-on-soft, light & dark).

### Token inti (light)

| Token | Nilai | Peran |
|---|---|---|
| `--background` | `#f4f3ee` | Kertas hangat — 85–90% permukaan UI |
| `--foreground` | `#232a26` | Teks utama (13.2:1 di kertas) |
| `--card` / `--popover` | `#fcfbf7` | Permukaan kartu & sheet (netral, default) |
| `--primary` | `#315b48` | Hijau hutan — SATU-SATUNYA warna aksi utama (7.7:1 dgn putih) |
| `--secondary` | `#e8ebe5` | Chip, track, permukaan sekunder netral |
| `--muted` / `--muted-foreground` | `#e8ebe5` / `#606a63` | Permukaan + teks sekunder (5.1:1) |
| `--accent` | `#e6ede7` | Tint hijau — hover/highlight |
| `--destructive` | `#a3483c` | Brick muted — error & aksi destruktif |
| `--border` / `--input` | `#d9ded7` / `#d1d8d0` | Garis kartu & input |
| `--ring` | `#315b48` | Fokus keyboard |

### Ramp chart resmi (seri = makna modul, konsisten lintas layar)

`--chart-1` garden `#315b48` (seri utama/masuk) · `--chart-2` studio
`#4c6e86` · `--chart-3` vault `#3d766b` · `--chart-4` gold `#8a6b35` ·
`--chart-5` writer `#a15f49`; `--chart-out` clay `#a3483c` (negatif);
`--chart-neutral` `#8a9389` (netral). Dark mode memakai versi terang
(`#91b59b`, `#c0d4e0`, …) — makna seri tidak berubah antar tema.

### Tone modul (keluarga 3 tingkat: solid / deep / soft)

Disiplin **satu primer**: `garden` adalah satu-satunya warna aksi utama.
Warna modul dipakai HEMAT — hanya ikon, indikator kecil, label, state
aktif, dan seri chart; BUKAN latar kartu statistik (directive §4):

| Tone | Solid (teks putih aman) | Deep (teks di atas soft) | Soft (tint kecil) | Makna |
|---|---|---|---|---|
| `garden` | `#315b48` | `#294c3c` | `#e7eee8` | Kebiasaan, konsistensi, progres |
| `studio` | `#4c6e86` | `#3a566b` | `#e8edf1` | Workout, fitness, aktivitas fisik |
| `vault` | `#3d766b` | `#2f5c54` | `#e5eeeb` | Keuangan, tabungan, dompet, budget |
| `writer` | `#a15f49` | `#794534` | `#f1e8e3` | Jurnal & tulisan SAJA |
| `gold` | `#8a6b35` | `#695127` | `#f1ecdf` | Achievement, milestone, streak SAJA |
| `clay` | `#a3483c` | `#7b342d` | `#f3e7e4` | Bahaya, aksi destruktif, nilai negatif |
| `cream` | — | — | `#f4f3ee` | Ujung gradasi ilustrasi (fade ke kanvas) |

### Key warna entity (disimpan di DB)

Entity (`Habit.color`, `Wallet.color`, `SavingsGoal.color`) menyimpan KEY, bukan
hex — dipetakan ke tone via `src/components/rutina/habit-icons.ts`
(`HABIT_COLOR`):

`emerald→garden` · `amber→gold` · `teal→vault` · `rose→clay` ·
`orange→studio` · `stone→secondary`

### Dark mode (ringkas)

Canvas `#171d19` (hijau-hitam), kartu `#222a24`, teks `#e7ece6`; primer
menjadi `#91b59b` (sage terang, teks `#17231b`). Solid modul tetap gelap
(teks putih aman), deep menjadi terang (teks di atas soft gelap) — semua
kontras teruji WCAG AA.

## 2. Aturan interaksi mobile (non-negotiable)

- Target sentuh minimal **44×44px**. Pengecualian terdokumentasi: chip kalender
  7-kolom berukuran ~34×53px — memenuhi WCAG 2.5.8 AA (24px) dengan hit-area
  diperluas via pseudo-element (`after:-inset-x-1`); 44px mustahil secara fisik
  pada viewport 360px dengan 7 kolom + panah navigasi 44px. Blok pengecualian
  ditandai atribut `data-audit-tap-exception` agar `bun run audit:design`
  menghormatinya; elemen `disabled` dikecualikan dari cek fokus (WCAG 2.1).
- Safe area iOS: `pt-safe` / `pb-safe` / `env(safe-area-inset-*)` di semua tepi.
- Scroll container internal memakai `overscroll-contain`; `h-dvh` untuk tinggi shell.
- Sheet (vaul): footer submit sticky di luar area scroll, `<form onSubmit>` sungguhan,
  animasi buka/tutup tidak boleh hilang (sheet lazy-loaded tetap ter-mount setelah pakai).
- Navigasi halaman disinkronkan ke `location.hash` (`#bugar`, `#vault`, `#kebiasaan`,
  `#jurnal`, `#statistik`, `#profil`) — tombol/gesture back menutup overlay, bukan keluar app.
- Animasi menghormati `prefers-reduced-motion`: CSS (`@media` block) + `<MotionConfig
  reducedMotion="user">` untuk framer-motion. Hindari animasi infinite dekoratif.
- State wajib untuk semua data: loading (skeleton), empty (`EmptyState`), error
  (pesan + "Coba Lagi"), dan konfirmasi untuk aksi destruktif.

## 3. Standar teknis yang diadopsi

| Sumber | Aturan | Status di Rutina |
|---|---|---|
| `stacks/nextjs.csv` (60 rules) | App Router, metadata+viewport API, next/font, NextResponse, error.tsx, CSP headers, dst. | 21 patuh, 6 diperbaiki (error/not-found, CSP, OG image, variable font, dynamic import), 33 N/A (arsitektur SPA single-route by design) |
| `ux-guidelines.csv` (141 rules) | Touch target, kontras, reduced motion, back button, label form, ukuran font | 82 patuh, 9 diperbaiki (MotionConfig, hash sync, target 44px, kontras highlight, label, font size), sisanya backlog di bawah |
| `react-performance.csv` (44 rules) | Dynamic imports, memoisasi, debounce, optimistic update | 25 patuh, 2 diperbaiki (next/dynamic untuk overlay+sheet, content-visibility daftar jurnal) |

## 4. Audit berkelanjutan

```bash
bun run audit:design        # heuristik 6 viewport (360→1920) → design-audit/report.md
bunx playwright install chromium   # sekali, jika browser belum ada
```

Cek heuristik: horizontal overflow, focus indicator, tap target, kontras teks
(proksimasi), unsized media, accessible name, struktur heading, meta viewport/lang,
console error. CI menjalankan hal yang sama di setiap PR yang menyentuh UI
(`.github/workflows/design-review.yml`, non-blocking + artifact).

Untuk review selera/interaksi (di luar jangkauan heuristik), gunakan 7 fase
design-review: interaksi & alur → responsif (375/768/1024/1440/1920) → polish visual
→ WCAG 2.1 AA → edge case → console/kesehatan.

## 4a. Adopsi skill "Impeccable" (pbakaus/impeccable, Apache-2.0)

Skill desain dari Paul Bakaus — "design vocabulary for your coding agent":
24 playbook (`critique`, `audit`, `polish`, `layout`, `colorize`, dll.) + detektor
slop deterministik. Diadopsi 26 Nov 2026. Yang mengikat di Rutina:

**a. Craft floor (kualitas minimum, ban absolut)** — diverifikasi saat setiap
perubahan UI:
- Kontras: teks body & placeholder ≥ 4.5:1, teks besar ≥ 3:1, ikon/kontrol ≥ 3:1.
  Pada permukaan berwarna, teks sekunder diturunkan dari warna hue tersebut
  (bukan abu-abu generik). Alpha `/70` ke bawah pada teks kecil dihapus
  (ditemukan & diperbaiki: kutipan jurnal, hero saldo, ikon streak kosong).
- Kedalaman: shadow wajib punya offset + blur; halo warna offset-nol dilarang.
- `::selection`, caret, scrollbar, fokus keyboard, dan angka tabular **ditheme
  dari palet** (browser surfaces — bagian termurah yang paling sering dilupakan).
- Motion: satu momen otentik per layar, guard `prefers-reduced-motion` wajib
  (`.rise-in`, `.press`, `.press-squish`, `.bento-tile` semuanya ter-guard).
- State: hover, disabled, loading, error, empty selalu ada (sudah lengkap).
- Ban yang sudah diaudit sejak commit 198dbdd: tanpa gradient text, tanpa
  glassmorphism default, tanpa side-stripe border, tanpa kartu nested,
  tanpa eyebrow/kicker di atas heading, tanpa hero-metric template,
  tanpa emoji/glyph sebagai sistem ikon (hanya Lucide).

**b. Playbook yang dipakai rutin** (vokabel review):
`critique` (skor heuristik UX) → `audit` (kualitas teknis P0–P3) →
`layout` (ritme & grouping) → `colorize` (role token, bukan tumpukan swatch) →
`polish` (pass terakhir). Mode Rutina: **Operate** (aplikasi tugas harian) —
scanability, konsistensi, dan ekspektasi native mengungguli ekspresi;
identitas hidup di detail presisi.

## 4b. Layout "Bento Box Grid" (ui-ux-pro-max style #39, status: active)

Skill bento grid terverifikasi ADA di ui-ux-pro-max-skill
(`data/styles.csv` baris #39, slug `bento-box-grid`; varian legacy #53
dideprekasi dan menunjuk ke #39). Spesifikasi yang diadopsi:

| Token bento | Nilai di Rutina |
|---|---|
| `--grid-gap` | 10px (`gap-2.5`) di papan ringkas; 12–16px antar section |
| `--card-radius` | 18px (`rounded-xl` pada theme ini) — konsisten semua tile |
| `--card-bg` | `--card` (#fcfbf7) |
| `--page-bg` | `--background` (kertas `#f4f3ee`) |
| `--shadow` | `shadow-soft` (halus, ada offset+blur — bukan halo) |
| `--hover-scale` | 1.02 via `.bento-tile` (hanya tile interaktif, pointer presisi, hormati reduced-motion) |

Checklist skill #39 yang dipatuhi: grid responsif (2 kolom mobile →
1 kolom layar sempit), span kartu bervariasi (hero ring 1 kolom × 2 baris;
streak & level 1×1), sudut konsisten, shadow halus, konten muat di kartu,
hover scale 1.02. Papan bento pertama: ringkasan Beranda
(`src/components/rutina/screens/home-screen.tsx`).

## 5. Backlog prioritas (temuan audit yang belum diperbaiki)

1. **ux#55** — error validasi inline per-field (`aria-invalid` + `aria-describedby`)
   di 6 sheet; saat ini hanya toast.
2. **ux#135** — konfirmasi "buang perubahan?" saat menutup editor jurnal dengan draf.
3. **ux#138** — kegagalan simpan perlu jalur error inline persisten (bukan hanya toast).
4. **ux#56** — validasi on-blur untuk field numerik.
5. **ux#134** — hindari pre-disable tombol submit berbasis validasi; tampilkan pesan saat klik.
6. **ux#52 / nextjs#38** — analisis ukuran bundel (`@next/bundle-analyzer`).
7. **react-perf#26 (lanjutan)** — `content-visibility` untuk daftar transaksi & arsip kebiasaan.
8. **nextjs#51 (lanjutan)** — CSP dengan nonce per-request via middleware (menghapus
   `'unsafe-inline'`).

## 6. Atribusi

Standar & tool audit diadaptasi dari ui-ux-pro-max-skill (MIT License,
© NextLevelBuilder) — `scripts/design-audit.mjs` dan `.github/workflows/design-review.yml`
memuat header atribusi. Data aturan asli tidak disalin ke repo ini; lihat repo sumber
untuk `ux-guidelines.csv`, `stacks/nextjs.csv`, `react-performance.csv`.

Prinsip craft-floor, playbook review, dan aturan browser-surface diadaptasi dari
[impeccable](https://github.com/pbakaus/impeccable) (Apache-2.0, © Paul Bakaus) —
vokabel desain untuk coding agent. Ketentuan asli tidak disalin utuh ke repo ini;
lihat `skill/reference/craft-floor.md` di repo sumber.
