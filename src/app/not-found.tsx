import { Compass } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-dvh w-full bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-3xl border border-border/70 bg-card p-6 text-center shadow-clay">
        <span className="mx-auto h-12 w-12 rounded-2xl bg-secondary text-muted-foreground flex items-center justify-center">
          <Compass className="h-6 w-6" />
        </span>
        <h1 className="mt-3 text-lg font-bold">Halaman tidak ditemukan</h1>
        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
          Jalan ini buntu. Yuk kembali ke beranda.
        </p>
        <Link
          href="/"
          className="press mt-4 min-h-[44px] w-full rounded-xl bg-garden text-white text-sm font-bold hover:bg-garden-deep inline-flex items-center justify-center gap-2"
        >
          Ke Beranda
        </Link>
      </div>
    </main>
  );
}
