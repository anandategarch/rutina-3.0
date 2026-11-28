"use client";

import * as React from "react";
import { Loader2, RefreshCw, WifiOff } from "lucide-react";

/**
 * LoadErrorState — error state pemuatan data yang tangguh.
 *
 * Masalah yang dijawab: selama ini layar gagal-muat hanya menawarkan tombol
 * "Coba Lagi" tanpa pemulihan otomatis. Kalau kegagalan berasal dari
 * cold-compile route (dev Turbopack), restart server, atau jaringan mobile
 * yang berfluktuasi, pengguna menghadapi layar buntu sampai tap manual.
 *
 * Perilaku:
 * 1. Auto-retry dengan backoff (4s → 8s → 16s, maks 3 kali) tanpa tap.
 * 2. Pesan error asli ditampilkan (maks 2 baris) — mati karena timeout vs
 *    server 500 kini bisa dibedakan pengguna & developer.
 * 3. Tombol "Coba Lagi" (min 44px) tetap ada untuk retry instan.
 * 4. Timer dibersihkan saat unmount / sukses / ganti attempt (tanpa leak).
 */
const AUTO_RETRY_DELAYS_MS = [4_000, 8_000, 16_000];

export function LoadErrorState({
  onRetry,
  error,
  tone = "secondary",
  title = "Ada kendala memuat data",
  description = "Kami akan mencoba lagi otomatis sebentar lagi.",
  autoRetry = true,
}: {
  /** Refetch dari React Query — dipanggil ulang saat auto-retry maupun manual. */
  onRetry: () => void;
  /** Error asli dari query — pesannya ditampilkan untuk diagnosa cepat. */
  error?: Error | null;
  /** Warna tombol mengikuti aksen layar (garden | vault | studio | secondary). */
  tone?: "garden" | "vault" | "studio" | "writer" | "secondary";
  title?: string;
  description?: string;
  autoRetry?: boolean;
}) {
  const [attempt, setAttempt] = React.useState(0);
  const [retrying, setRetrying] = React.useState(false);

  // audit D-L4: caller umumnya mengirim inline arrow (onRetry={() => refetch()})
  // yang berubah tiap render induk — jika masuk deps effect, countdown auto-retry
  // terus terjadwal ulang dan bisa menunda pemulihan selamanya. Ref menjaga
  // identitas stabil tanpa memaksa caller memoize.
  const retryRef = React.useRef(onRetry);
  React.useEffect(() => {
    retryRef.current = onRetry;
  });

  // Setiap error baru (mis. auto-retry React Query gagal lagi) reset siklus.
  React.useEffect(() => {
    setAttempt(0);
    setRetrying(false);
  }, [error]);

  // audit E-F1: timer indikator "sedang mencoba" dilacak di ref dan hanya
  // dibersihkan saat UNMOUNT. (Versi lama membersihkannya di cleanup effect
  // [attempt] — cleanup itu berjalan segera setelah setAttempt di callback,
  // membunuh indikator 1,5 dtk yang baru dipasang → tombol "Coba Lagi"
  // terkunci spinner palsu sepanjang siklus auto-retry.)
  const indicatorTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    return () => {
      if (indicatorTimer.current) clearTimeout(indicatorTimer.current);
    };
  }, []);

  React.useEffect(() => {
    if (!autoRetry || attempt >= AUTO_RETRY_DELAYS_MS.length) return;
    const t = setTimeout(() => {
      setRetrying(true);
      retryRef.current();
      // Bertahap ke jadwal berikutnya; kalau masih gagal, error berubah →
      // effect [error] reset siklus.
      setAttempt((a) => a + 1);
      indicatorTimer.current = setTimeout(() => setRetrying(false), 1_500);
    }, AUTO_RETRY_DELAYS_MS[attempt]);
    // Hanya bersihkan countdown SIKLUS INI — indikator dikelola terpisah.
    return () => clearTimeout(t);
  }, [attempt, autoRetry]);

  const scheduleIndicatorOff = () => {
    if (indicatorTimer.current) clearTimeout(indicatorTimer.current);
    indicatorTimer.current = setTimeout(() => setRetrying(false), 1_500);
  };

  const toneClass =
    tone === "garden"
      ? "bg-garden-deep"
      : tone === "vault"
        ? "bg-vault"
        : tone === "studio"
          ? "bg-studio"
          : tone === "writer"
            ? "bg-writer-deep"
            : "bg-primary";

  const isExhausted = attempt >= AUTO_RETRY_DELAYS_MS.length;

  return (
    <div className="flex flex-col items-center text-center py-8 px-4" role="alert">
      <div className="h-14 w-14 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground mb-3 shadow-soft">
        <WifiOff className="h-6 w-6" aria-hidden="true" />
      </div>
      <p className="font-semibold text-foreground text-sm">{title}</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-[260px] leading-relaxed">
        {isExhausted
          ? "Percobaan otomatis sudah habis. Periksa koneksi internetmu lalu coba lagi."
          : description}
      </p>
      {error?.message ? (
        <p className="mt-2 text-xs text-muted-foreground/80 max-w-[280px] leading-relaxed line-clamp-2">
          {error.message}
        </p>
      ) : null}
      <div className="mt-3 flex flex-col items-center gap-2">
        <button
          onClick={() => {
            setRetrying(true);
            retryRef.current();
            scheduleIndicatorOff();
          }}
          disabled={retrying}
          className={`press ${toneClass} min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-bold text-white flex items-center gap-2 disabled:opacity-70`}
        >
          {retrying ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          )}
          Coba Lagi
        </button>
        {!isExhausted && (
          <p className="text-[11px] text-muted-foreground/70" aria-live="polite">
            Mencoba lagi otomatis ({attempt + 1}/{AUTO_RETRY_DELAYS_MS.length})…
          </p>
        )}
      </div>
    </div>
  );
}
