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
| Tema warna | Krem hangat `#faf6ea` + hijau taman `#2fa960/#1f7a43`; aksen: gold, vault (teal), studio, writer, clay |
| Dark mode | Dukungan penuh via token CSS (`--*`), toggle di Profil |
| Display font | Nunito (variable 200–1000) — semua heading, terminal membulat playful |
| Body font | DM Sans (variable) — teks tubuh geometris bersih |
| Handwritten | Caveat (variable) — kutipan/aksen personal |
| Radius | `rounded-xl` (12px) kartu kecil, `rounded-2xl/3xl` kartu besar, FAB bulat |
| Shadow | Token `shadow-soft`, `shadow-clay`, `shadow-lift` — jangan pakai nilai shadow mentah |

Kontras token sudah diuji WCAG AA (lihat komentar di `src/app/globals.css`).
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
