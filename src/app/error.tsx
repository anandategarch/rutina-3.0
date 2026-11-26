"use client";

// Error boundary route-level (standar ui-ux-pro-max: nextjs #6 — Handle errors
// with error.tsx). Menangkap error render tak tertangkap dari client components
// agar pengguna melihat halaman bergaya, bukan fallback default Next.js.
import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, Sprout } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-dvh w-full bg-background flex items-center justify-center p-6">
      {/* role=alert: kegagalan harus diumumkan ke screen reader (ux #44) */}
      <div role="alert" className="w-full max-w-sm rounded-3xl border border-border/70 bg-card p-6 text-center shadow-clay">
        <span className="mx-auto h-12 w-12 rounded-2xl bg-garden-soft text-garden-deep flex items-center justify-center">
          <Sprout className="h-6 w-6" />
        </span>
        <h1 className="mt-3 text-lg font-bold">Ada yang tak beres</h1>
        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
          Terjadi kesalahan saat menampilkan layar ini. Tenang, data kamu tetap aman.
        </p>
        <button
          onClick={reset}
          className="press mt-4 min-h-[44px] w-full rounded-xl bg-garden text-white text-sm font-bold hover:bg-garden-deep inline-flex items-center justify-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Coba Lagi
        </button>
        {/* Jalur pulang: jika error persisten, reset saja akan melempar error yang
            sama — user tidak boleh terjebak tanpa jalan keluar (ux #4/#5). */}
        <Link
          href="/"
          className="press mt-2 min-h-[44px] w-full rounded-xl border border-border bg-card text-foreground text-sm font-semibold inline-flex items-center justify-center"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </main>
  );
}
