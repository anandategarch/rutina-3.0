"use client";

/**
 * Offline-first cache layer untuk Rutina.
 *
 * Latar: kegagalan muat yang dilaporkan pengguna ("Ada kendala memuat data")
 * terbukti BUKAN berasal dari server (log: semua request 200) melainkan dari
 * jalur transport antara browser pengguna dan server (gateway pratinjau yang
 * tidak stabil). Retry UI tidak berguna kalau paket tidak pernah sampai —
 * satu-satunya pertahanan yang benar adalah data yang sudah pernah berhasil
 * diambil TETAP TERSEDIA saat transport mati.
 *
 * Cara kerja:
 * 1. RESTORE — saat boot, snapshot query sukses terakhir dari localStorage
 *    dimuat ke QueryClient sehingga layar langsung render konten (bukan
 *    skeleton buntu) meski jaringan sedang mati.
 * 2. PERSIST — setiap kali GET sukses, hasilnya disimpan kembali.
 * 3. Semua akses localStorage dibungkus try/catch (iframe sandboxed tanpa
 *    allow-same-origin melempar SecurityError bahkan saat MEMBACA) dengan
 *    fallback Map in-memory agar tetap bermanfaat dalam sesi yang sama.
 *
 * Hanya root key yang dikenali yang dipersist — query sepele (search per-
 * ketikan, day-detail sementara) tidak mengotoriti storage.
 */

const PREFIX = "rutina:qcache:v3:";
const MAX_ENTRY_BYTES = 400_000;

const PERSISTED_ROOTS = new Set([
  "habits",
  "home",
  "stats",
  "workouts",
  "foods",
  "checkins",
  "body-metrics",
  "exercises",
  "wallets",
  "transactions",
  "budgets",
  "goals",
  "journal",
  "profile",
  "quote",
  "fin-categories",
  "vault",
  "vault-misses",
]);

// Fallback in-memory: iframe sandboxed menolak localStorage sepenuhnya, tapi
// Map tetap memberi ketahanan dalam satu sesi (pindah tab kembali, dsb.).
const memoryFallback = new Map<string, string>();

function safeGet(key: string): string | null {
  try {
    const v = window.localStorage.getItem(key);
    return v ?? memoryFallback.get(key) ?? null;
  } catch {
    return memoryFallback.get(key) ?? null;
  }
}

function safeSet(key: string, value: string): void {
  memoryFallback.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Quota / SecurityError — fallback memori sudah terisi; biarkan senyap.
  }
}

/**
 * Muat snapshot query tersimpan ke dalam QueryClient (dipanggil SEKALI saat
 * QueryClient dibuat, sebelum render pertama — sehingga data tersedia pada
 * paint pertama tanpa menunggu jaringan).
 */
export function restoreOfflineCache(queryClient: {
  setQueryData: (queryKey: readonly unknown[], data: unknown) => unknown;
}): void {
  let keys: string[] = [];
  try {
    keys = Object.keys(window.localStorage);
  } catch {
    keys = [...memoryFallback.keys()];
  }
  for (const fullKey of keys) {
    if (!fullKey.startsWith(PREFIX)) continue;
    try {
      const raw = safeGet(fullKey);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { d?: unknown };
      if (parsed.d === undefined || parsed.d === null) continue;
      const queryKey = JSON.parse(fullKey.slice(PREFIX.length)) as readonly unknown[];
      if (!Array.isArray(queryKey) || typeof queryKey[0] !== "string") continue;
      queryClient.setQueryData(queryKey, parsed.d);
    } catch {
      // Entri rusak — buang agar tidak mengganggu berikutnya.
      try {
        window.localStorage.removeItem(fullKey);
      } catch {
        /* noop */
      }
      memoryFallback.delete(fullKey);
    }
  }
}

/**
 * Langganan cache: tiap kali query GET dikenali selesai SUKSES, simpan
 * datanya. Dipasang di effect (bukan di initializer) agar tidak mengganggu
 * hidrasi; QueryClient stabil seumur hidup halaman.
 */
export function attachOfflinePersistence(queryClient: {
  getQueryCache: () => {
    subscribe: (cb: (event: { type: string; query: OfflineCacheEventQuery }) => void) => () => void;
  };
}): () => void {
  const cache = queryClient.getQueryCache();
  return cache.subscribe((event) => {
    if (event.type !== "updated") return;
    const state = event.query.state;
    if (state.status !== "success" || state.data === undefined || state.data === null) return;
    const root = event.query.queryKey[0];
    if (typeof root !== "string" || !PERSISTED_ROOTS.has(root)) return;
    // Jangan persist hasil pencarian per-ketikan / drawer sementara walau
    // root-nya string lain: hanya queryKey sederhana [root] atau [root, scalar].
    const keyTail = event.query.queryKey.slice(1);
    if (keyTail.some((part) => typeof part !== "string" && typeof part !== "number")) return;
    try {
      const payload = JSON.stringify({ t: Date.now(), d: state.data });
      if (payload.length > MAX_ENTRY_BYTES) return;
      safeSet(PREFIX + JSON.stringify(event.query.queryKey), payload);
    } catch {
      // Data tidak serializable (mis. Date) — lewati tanpa mengganggu UI.
    }
  });
}

/** Bangun teks "stempel" untuk banner data tersimpan, mis. "14.32". */
export function formatStoredStamp(storedAt: number | undefined): string | null {
  if (!storedAt) return null;
  try {
    return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(
      new Date(storedAt)
    );
  } catch {
    return null;
  }
}

type OfflineCacheEventQuery = {
  queryKey: readonly unknown[];
  state: { status: string; data?: unknown };
};
