# Rutina 3.0 — Design System & Standar UI/UX

Dokumen ini mengikat keputusan desain Rutina 3.0 dan mengadopsi standar dari
**[ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)** (MIT,
NextLevelBuilder): 80 UI styles, 194 palet warna, 74 font pairing, 141 UX guidelines,
25 chart types, dan 22 tech-stack rule sets. Adaptasi dilakukan tanggal 25 Nov 2026
(commit audit pertama mengadopsi standar).

## 1. Identitas visual (committed aesthetic)

| Aspek | Keputusan |
|---|---|
| Gaya | Claymorphism Mobile (skill pairing #71) — permukaan lembut, shadow berlapis, sudut membulat |
| Tema warna | Krem hangat `#faf6ea` + hijau taman `#2fa960/#1f7a43`; aksen: gold, vault (teal), studio, writer, clay (rincian §1a) |
| Dark mode | Dukungan penuh via token CSS (`--*`), toggle di Profil |
| Display font | Nunito (variable 200–1000) — semua heading, terminal membulat playful |
| Body font | DM Sans (variable) — teks tubuh geometris bersih |
| Handwritten | Caveat (variable) — kutipan/aksen personal |
| Radius | `rounded-xl` (12px) kartu kecil, `rounded-2xl/3xl` kartu besar, FAB bulat |
| Shadow | Token `shadow-soft`, `shadow-clay`, `shadow-lift` — jangan pakai nilai shadow mentah |

## 1a. Palet warna resmi "Sunny Meadow"

Satu-satunya sumber warna UI adalah token CSS di `src/app/globals.css`.
Dilarang memakai kelas warna Tailwind mentah (`bg-emerald-500`, dsb.) atau hex
arbitrary (`bg-[#...]`) di komponen — semua lewat token. Palet mengadaptasi
arah palet skill `colors.csv` baris #94 **Habit Tracker** ("streak amber +
habit green") dengan canvas krem.

### Token inti (light)

| Token | Nilai | Peran |
|---|---|---|
| `--background` | `#faf6ea` | Kanvas krem hangat (seluruh layar) |
| `--foreground` | `#29241c` | Teks utama (kontras AA di krem) |
| `--card` / `--popover` | `#ffffff` | Permukaan kartu & sheet |
| `--primary` | `#1f7a43` | Hijau taman — CTA utama, ring progres, FAB |
| `--secondary` | `#f3eddd` | Chip, track progres, permukaan netral |
| `--muted-foreground` | `#6f6753` | Teks sekunder (digerdangkan agar AA) |
| `--accent` | `#e6f4ea` | Tint hijau — hover/highlight |
| `--destructive` | `#b8401f` | Error, aksi destruktif |
| `--border` / `--input` | `#efe7d2` / `#e7dfc8` | Garis & input |
| `--ring` | `#1f7a43` | Fokus keyboard |

### Ramp chart

`--chart-1..5`: `#1f7a43 → #2fa960 → #6bc289 → #a6ddb7 → #d3eedc`
(vivid→pastel hijau); `--chart-out` `#b8401f` (outlier); `--chart-neutral`
`#b3a98f` (batang netral). Di dark mode ramp dibalik dan digerangkan otomatis
lihat token `.dark`.

### Tone modul (keluarga 3 tingkat: solid / deep / soft)

Disiplin **satu primer**: `garden` adalah satu-satunya warna aksi utama.
Tone lain hanya boleh dipakai untuk konteksnya masing-masing:

| Tone | Solid (teks putih aman) | Deep (teks di atas soft) | Soft (latar tint) | Dipakai khusus untuk |
|---|---|---|---|---|
| `garden` | `#1f7a43` | `#175c33` | `#e3f4e7` | Default & progres (Taman) |
| `studio` | `#c2561d` | `#9a4514` | `#fdebdd` | Fitness (Bugar) |
| `vault` | `#0b756d` | `#075e56` | `#e0f3f0` | Keuangan (Vault) |
| `writer` | `#7443b8` | `#5a2f94` | `#f1e9fa` | Jurnal SAJA |
| `gold` | `#b45309` | `#8f3d06` | `#fef3c7` | Streak/XP/Piala SAJA |
| `clay` | `#b8401f` | `#8f3115` | `#fbe9e2` | Bahaya & pengeluaran |
| `cream` | — | — | `#f7f1de` | Panel hero khusus |

### Key warna entity (disimpan di DB)

Entity (`Habit.color`, `Wallet.color`, `SavingsGoal.color`) menyimpan KEY, bukan
hex — dipetakan ke tone via `src/components/rutina/habit-icons.ts`
(`HABIT_COLOR`):

`emerald→garden` · `amber→gold` · `teal→vault` · `rose→clay` ·
`orange→studio` · `stone→secondary`

### Dark mode (ringkas)

Canvas `#16130c`, kartu `#201c12`, teks `#efe9d9`; primer menjadi `#7ed9a0`
(hijau mint). Semua tone family punya padanan dark di blok `.dark` — lihat
`globals.css`; kontras sudah diuji WCAG AA via komentar di file yang sama.
Teks naratif multi-kalimat minimal `text-sm` (14px); 10–12px hanya untuk caption/eyebrow.

## 2. Aturan interaksi mobile (non-negotiable)

- Target sentuh minimal **44×44px**. Pengecualian terdokumentasi: chip kalender
  7-kolom berukuran ~34×53px — memenuhi WCAG 2.5.8 AA (24px) dengan hit-area
  diperluas via pseudo-element (`after:-inset-x-1`); 44px mustahil secara fisik
  pada viewport 360px dengan 7 kolom + panah navigasi 44px.
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
| `--card-radius` | 24px (`rounded-xl` pada theme ini) — konsisten semua tile |
| `--card-bg` | `--card` (#ffffff) |
| `--page-bg` | `--background` (krem `#faf6ea`) |
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
