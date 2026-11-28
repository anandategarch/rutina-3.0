"use client";

/**
 * Ilustrasi line-art "Field Notes" untuk empty state — satu bahasa visual
 * dengan JournalDoodle: stroke 1.6–2, fill warna modul (soft), aksen putus-putus,
 * garis tanah titik-titik sebagai perekat antarilustrasi.
 *
 * Prinsip (taste-skill): visual dekoratif SELALU aria-hidden, tanpa keterangan
 * di bawahnya; warna dari token semantik (bukan hex) sehingga ikut dark mode.
 * Setiap ilustrasi memakai warna modulnya masing-masing:
 *   garden = kebiasaan/misi · vault = keuangan · studio = bugar
 *   gold = capaian · writer = jurnal · netral = pencarian/arsip
 */

type IlloProps = { className?: string };

const SIZE = { width: 160, height: 96, viewBox: "0 0 160 96" } as const;

/** Garis tanah titik-titik — identitas bersama semua ilustrasi. */
function Ground({ x1 = 30, x2 = 130, y = 84 }: { x1?: number; x2?: number; y?: number }) {
  return (
    <path
      d={`M${x1} ${y} H${x2}`}
      stroke="var(--border)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray="0.5 7"
    />
  );
}

/* ============ garden — misi/kebiasaan ============ */

/** Tunas dengan pancang pencatat hari — "tumbuh hari demi hari". */
export function IlloSproutMission({ className }: IlloProps) {
  return (
    <svg {...SIZE} fill="none" aria-hidden="true" className={className}>
      {/* pancang pencatat hari */}
      <path d="M112 82 V26" stroke="var(--garden)" strokeWidth="2" strokeLinecap="round" />
      <path d="M112 34 h8" stroke="var(--garden)" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
      <path d="M112 46 h6" stroke="var(--garden)" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
      <path d="M112 58 h8" stroke="var(--garden)" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
      <path
        d="M112 26 L128 32 L112 38"
        fill="var(--gold-soft)"
        stroke="var(--gold)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* gundukan tanah */}
      <path
        d="M38 82 C44 72, 78 72, 84 82"
        stroke="var(--garden-deep)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* batang */}
      <path d="M61 78 C61 62, 59 50, 62 36" stroke="var(--garden)" strokeWidth="2.2" strokeLinecap="round" />
      {/* daun kiri */}
      <path
        d="M62 52 C52 50, 44 42, 46 32 C56 34, 62 42, 62 52 Z"
        fill="var(--garden-soft)"
        stroke="var(--garden)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* daun kanan */}
      <path
        d="M61 44 C70 42, 78 34, 76 24 C66 26, 60 34, 61 44 Z"
        fill="var(--garden-soft)"
        stroke="var(--garden)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* tunas muda di puncak */}
      <path
        d="M62 36 C62 30, 64 26, 68 22"
        stroke="var(--garden-deep)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* butir air */}
      <circle cx="34" cy="24" r="2.2" stroke="var(--studio)" strokeWidth="1.6" opacity="0.6" />
      <circle cx="40" cy="16" r="1.6" stroke="var(--studio)" strokeWidth="1.4" opacity="0.4" />
      <Ground x1={24} x2={138} />
    </svg>
  );
}

/* ============ vault — keuangan ============ */

/** Donut dengan satu potongan terangkat — komposisi kategori. */
export function IlloDonutChart({ className }: IlloProps) {
  return (
    <svg {...SIZE} fill="none" aria-hidden="true" className={className}>
      <circle cx="70" cy="48" r="26" fill="var(--vault-soft)" stroke="var(--vault)" strokeWidth="2" />
      <circle cx="70" cy="48" r="13" fill="var(--card)" stroke="var(--vault)" strokeWidth="1.8" />
      {/* potongan terangkat */}
      <path
        d="M92 30 A26 26 0 0 1 94 55"
        stroke="var(--vault-deep)"
        strokeWidth="8"
        strokeLinecap="round"
        transform="rotate(8 70 48)"
      />
      {/* garis legenda putus-putus */}
      <path d="M108 30 h18" stroke="var(--vault)" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
      <path d="M112 46 h20" stroke="var(--vault)" strokeWidth="1.8" strokeLinecap="round" opacity="0.4" />
      <path d="M108 62 h16" stroke="var(--vault)" strokeWidth="1.8" strokeLinecap="round" opacity="0.3" />
      {/* koin */}
      <circle cx="30" cy="34" r="7" fill="var(--gold-soft)" stroke="var(--gold)" strokeWidth="1.8" />
      <circle cx="24" cy="56" r="4.5" stroke="var(--gold)" strokeWidth="1.6" opacity="0.6" />
      <Ground x1={22} x2={138} y={84} />
    </svg>
  );
}

/** Amplop anggaran dengan bar "terpakai" menjulur. */
export function IlloEnvelopeBudget({ className }: IlloProps) {
  return (
    <svg {...SIZE} fill="none" aria-hidden="true" className={className}>
      {/* batang anggaran menjulur dari amplop */}
      <path d="M60 42 V22" stroke="var(--vault)" strokeWidth="5" strokeLinecap="round" />
      <path d="M74 42 V28" stroke="var(--vault)" strokeWidth="5" strokeLinecap="round" opacity="0.55" />
      <path d="M88 42 V34" stroke="var(--vault)" strokeWidth="5" strokeLinecap="round" opacity="0.3" />
      {/* amplop */}
      <rect x="44" y="42" width="72" height="34" rx="6" fill="var(--vault-soft)" stroke="var(--vault)" strokeWidth="2" />
      <path d="M44 48 L80 62 L116 48" stroke="var(--vault)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* garis "sisa anggaran" */}
      <path d="M56 68 h48" stroke="var(--vault-deep)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="2 6" opacity="0.7" />
      <Ground x1={30} x2={130} />
    </svg>
  );
}

/** Stoples tabungan berisi koin, tunas tumbuh dari tutupnya. */
export function IlloSavingsJar({ className }: IlloProps) {
  return (
    <svg {...SIZE} fill="none" aria-hidden="true" className={className}>
      {/* stoples */}
      <path
        d="M56 34 h48 v38 a10 10 0 0 1 -10 10 H66 a10 10 0 0 1 -10 -10 Z"
        fill="var(--vault-soft)"
        stroke="var(--vault)"
        strokeWidth="2"
      />
      {/* tutup */}
      <rect x="52" y="26" width="56" height="9" rx="4.5" fill="var(--card)" stroke="var(--vault)" strokeWidth="2" />
      {/* koin di dalam */}
      <circle cx="72" cy="66" r="6" fill="var(--gold-soft)" stroke="var(--gold)" strokeWidth="1.8" />
      <circle cx="88" cy="68" r="6" fill="var(--gold-soft)" stroke="var(--gold)" strokeWidth="1.8" />
      <circle cx="80" cy="56" r="6" fill="var(--gold-soft)" stroke="var(--gold)" strokeWidth="1.8" />
      {/* tunas dari tutup */}
      <path d="M80 26 C80 20, 82 16, 86 12" stroke="var(--garden)" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M86 12 C92 10, 98 12, 100 18 C94 22, 88 20, 86 12 Z"
        fill="var(--garden-soft)"
        stroke="var(--garden)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <Ground x1={26} x2={134} />
    </svg>
  );
}

/** Panah melingkar dengan kalender kecil — langganan berulang. */
export function IlloSubscriptionLoop({ className }: IlloProps) {
  return (
    <svg {...SIZE} fill="none" aria-hidden="true" className={className}>
      {/* lingkaran panah */}
      <path
        d="M96 44 A24 24 0 1 0 100 62"
        stroke="var(--vault)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path d="M96 36 L97 45 L88 44" stroke="var(--vault)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* kalender pusat */}
      <rect x="62" y="38" width="36" height="30" rx="5" fill="var(--card)" stroke="var(--vault)" strokeWidth="2" />
      <path d="M62 47 h36" stroke="var(--vault)" strokeWidth="1.8" opacity="0.6" />
      <path d="M70 34 v7 M90 34 v7" stroke="var(--vault)" strokeWidth="2.2" strokeLinecap="round" />
      {/* tanda cek bulan berjalan */}
      <path d="M72 57 l5 5 10 -11" stroke="var(--garden)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <Ground x1={34} x2={126} />
    </svg>
  );
}

/* ============ studio — bugar ============ */

/** Barbel di matras dengan busur gerakan — beban/volume. */
export function IlloBarbell({ className }: IlloProps) {
  return (
    <svg {...SIZE} fill="none" aria-hidden="true" className={className}>
      {/* batang */}
      <path d="M34 56 H126" stroke="var(--studio-deep)" strokeWidth="2.4" strokeLinecap="round" />
      {/* lempengan kiri */}
      <rect x="42" y="40" width="12" height="32" rx="4" fill="var(--studio-soft)" stroke="var(--studio)" strokeWidth="2" />
      <rect x="58" y="46" width="8" height="20" rx="3" stroke="var(--studio)" strokeWidth="2" />
      {/* lempengan kanan */}
      <rect x="100" y="46" width="8" height="20" rx="3" stroke="var(--studio)" strokeWidth="2" />
      <rect x="106" y="40" width="12" height="32" rx="4" fill="var(--studio-soft)" stroke="var(--studio)" strokeWidth="2" />
      {/* matras */}
      <path d="M36 80 H124" stroke="var(--studio)" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
      {/* busur angkat */}
      <path d="M66 30 C74 22, 86 22, 94 30" stroke="var(--studio)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="3 6" />
      <path d="M94 30 L88 29 M94 30 L93 36" stroke="var(--studio)" strokeWidth="1.8" strokeLinecap="round" />
      <Ground x1={26} x2={134} y={88} />
    </svg>
  );
}

/** Jalur lari putus-putus dengan pin garis akhir — riwayat sesi. */
export function IlloRunRoute({ className }: IlloProps) {
  return (
    <svg {...SIZE} fill="none" aria-hidden="true" className={className}>
      {/* jalur */}
      <path
        d="M28 76 C44 60, 60 78, 76 62 C90 48, 104 56, 122 40"
        stroke="var(--studio)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray="6 7"
      />
      {/* titik mulai */}
      <circle cx="28" cy="76" r="5" fill="var(--studio-soft)" stroke="var(--studio)" strokeWidth="2" />
      {/* pin garis akhir */}
      <path
        d="M126 40 C126 32, 118 30, 114 34 C110 38, 112 44, 114 46 L122 56 L126 40 Z"
        fill="var(--studio-soft)"
        stroke="var(--studio-deep)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* kilometer kecil */}
      <path d="M56 70 l6 -6 M96 52 l6 -6" stroke="var(--studio)" strokeWidth="1.6" strokeLinecap="round" opacity="0.45" />
      <Ground x1={22} x2={138} y={88} />
    </svg>
  );
}

/** Mangkuk ber-kuap dengan apel — asupan hari ini. */
export function IlloFoodBowl({ className }: IlloProps) {
  return (
    <svg {...SIZE} fill="none" aria-hidden="true" className={className}>
      {/* mangkuk */}
      <path
        d="M52 50 a28 28 0 0 0 56 0 Z"
        fill="var(--studio-soft)"
        stroke="var(--studio)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M46 50 h68" stroke="var(--studio-deep)" strokeWidth="2.4" strokeLinecap="round" />
      {/* kaki mangkuk */}
      <path d="M72 78 h16" stroke="var(--studio)" strokeWidth="2.2" strokeLinecap="round" />
      {/* kuap */}
      <path
        d="M68 40 C66 34, 70 30, 68 24 M80 40 C78 34, 82 30, 80 24"
        stroke="var(--studio)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeDasharray="1 5"
        opacity="0.7"
      />
      {/* apel */}
      <circle cx="120" cy="70" r="9" fill="var(--clay-soft)" stroke="var(--clay)" strokeWidth="1.8" />
      <path d="M120 61 C120 57, 122 55, 125 53" stroke="var(--garden)" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M125 53 C130 51, 134 53, 135 57 C130 59, 126 57, 125 53 Z"
        fill="var(--garden-soft)"
        stroke="var(--garden)"
        strokeWidth="1.5"
      />
      <Ground x1={30} x2={142} y={88} />
    </svg>
  );
}

/* ============ netral — arsip & pencarian ============ */

/** Kotak arsip dengan map bertumpuk dan daun kecil. */
export function IlloArchiveBox({ className }: IlloProps) {
  return (
    <svg {...SIZE} fill="none" aria-hidden="true" className={className}>
      {/* map menjulur */}
      <path d="M62 30 V20 H92 V30" stroke="var(--garden)" strokeWidth="1.8" opacity="0.5" />
      <path d="M70 30 V24 H100 V30" stroke="var(--garden)" strokeWidth="1.8" opacity="0.75" />
      {/* kotak */}
      <rect x="48" y="30" width="64" height="42" rx="6" fill="var(--garden-soft)" stroke="var(--garden)" strokeWidth="2" />
      <path d="M48 42 h64" stroke="var(--garden)" strokeWidth="1.8" opacity="0.6" />
      {/* label kotak */}
      <rect x="66" y="52" width="28" height="10" rx="3" fill="var(--card)" stroke="var(--garden-deep)" strokeWidth="1.6" />
      {/* daun */}
      <path
        d="M104 28 C112 24, 120 26, 122 32 C116 36, 108 34, 104 28 Z"
        fill="var(--garden-soft)"
        stroke="var(--garden)"
        strokeWidth="1.8"
      />
      <Ground x1={30} x2={130} />
    </svg>
  );
}

/** Kaca pembesar di atas baris daftar — hasil pencarian kosong. */
export function IlloSearchList({ className }: IlloProps) {
  return (
    <svg {...SIZE} fill="none" aria-hidden="true" className={className}>
      {/* baris daftar */}
      <path d="M30 30 h56" stroke="var(--border)" strokeWidth="6" strokeLinecap="round" />
      <path d="M30 44 h40" stroke="var(--border)" strokeWidth="6" strokeLinecap="round" opacity="0.8" />
      <path d="M30 58 h50" stroke="var(--border)" strokeWidth="6" strokeLinecap="round" opacity="0.6" />
      {/* kaca pembesar */}
      <circle cx="102" cy="46" r="18" fill="var(--secondary)" stroke="var(--garden-deep)" strokeWidth="2.2" />
      <path d="M116 60 L128 72" stroke="var(--garden-deep)" strokeWidth="3" strokeLinecap="round" />
      {/* kilau kaca */}
      <path
        d="M94 40 C96 36, 100 34, 104 34"
        stroke="var(--garden-deep)"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.5"
      />
      <Ground x1={30} x2={130} />
    </svg>
  );
}

/* ============ gold — statistik & capaian ============ */

/** Batang tren menaik dengan panah — data yang menanti isi pertama. */
export function IlloTrendBars({ className }: IlloProps) {
  return (
    <svg {...SIZE} fill="none" aria-hidden="true" className={className}>
      {/* batang */}
      <path d="M44 74 V58" stroke="var(--gold)" strokeWidth="7" strokeLinecap="round" opacity="0.35" />
      <path d="M64 74 V50" stroke="var(--gold)" strokeWidth="7" strokeLinecap="round" opacity="0.55" />
      <path d="M84 74 V40" stroke="var(--gold)" strokeWidth="7" strokeLinecap="round" opacity="0.8" />
      <path d="M104 74 V30" stroke="var(--gold-deep)" strokeWidth="7" strokeLinecap="round" />
      {/* panah tren */}
      <path
        d="M40 46 C58 40, 78 30, 112 22"
        stroke="var(--garden)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="4 6"
      />
      <path d="M112 22 L104 21 M112 22 L110 29" stroke="var(--garden)" strokeWidth="2.2" strokeLinecap="round" />
      {/* bintang capaian */}
      <path
        d="M126 44 l2.2 4.6 5 .7 -3.6 3.5 .9 5 -4.5 -2.4 -4.5 2.4 .9 -5 -3.6 -3.5 5 -.7 Z"
        fill="var(--gold-soft)"
        stroke="var(--gold)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <Ground x1={34} x2={126} />
    </svg>
  );
}
