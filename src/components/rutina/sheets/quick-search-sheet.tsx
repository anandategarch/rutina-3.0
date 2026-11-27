"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Sprout, Wallet, NotebookText, Dumbbell, CreditCard, SearchX } from "lucide-react";
import { toast } from "sonner";
import { useRutinaStore } from "@/store/rutina";
import { rutinaApi } from "@/lib/rutina/api";
import { formatDateID, formatRupiah, formatDuration } from "@/lib/rutina/format";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/rutina/primitives";
import type { SearchResults } from "@/types/rutina";
import { cn } from "@/lib/utils";

/* ============================================================
   Pencarian cepat lintas modul (fitur baru).
   Satu kolom ketik, lima sumber: kebiasaan, keuangan, jurnal,
   latihan, dompet. Ketuk hasil → lompat ke halaman modulnya.
   ============================================================ */

const TYPE_LABEL: Record<string, string> = {
  run: "Lari",
  walk: "Jalan",
  runwalk: "Lari-jalan",
  badminton: "Bulu tangkis",
  strength: "Beban",
};

/** Debounce sederhana berbasis state agar kueri tidak menembak per ketukan. */
function useDebounced(value: string, ms = 250): string {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      </div>
      <div className="rounded-xl border border-border/70 divide-y divide-border/50 overflow-hidden">{children}</div>
    </div>
  );
}

function Row({
  title,
  sub,
  right,
  onClick,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  right?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="press flex w-full min-h-[44px] items-center gap-2.5 px-3 py-2 text-left hover:bg-secondary/60"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold leading-tight">{title}</span>
        {sub && <span className="block truncate text-xs text-muted-foreground mt-0.5">{sub}</span>}
      </span>
      {right && <span className="shrink-0 text-xs font-bold tabular">{right}</span>}
    </button>
  );
}

export default function QuickSearchSheet() {
  const searchOpen = useRutinaStore((s) => s.searchOpen);
  const setSearchOpen = useRutinaStore((s) => s.setSearchOpen);
  const setPage = useRutinaStore((s) => s.setPage);

  const [input, setInput] = React.useState("");
  const [query, setQuery] = React.useState("");
  // Buka sheet: fokuskan input & bersihkan sisa kueri sebelumnya
  React.useEffect(() => {
    if (searchOpen) {
      setInput("");
      setQuery("");
    }
  }, [searchOpen]);

  const debounced = useDebounced(input);
  // Commit kueri hanya saat sheet terbuka — ketikan terakhir tidak menembak
  // API di latar belakang setelah sheet ditutup
  React.useEffect(() => {
    if (searchOpen && debounced !== query) setQuery(debounced);
  }, [searchOpen, debounced, query]);

  const enabled = searchOpen && query.trim().length >= 2;
  const resultsQuery = useQuery({
    queryKey: ["search", query],
    queryFn: () => rutinaApi.search(query.trim()),
    enabled,
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });

  const results: SearchResults | null = resultsQuery.data?.results ?? null;
  const total =
    results
      ? results.habits.length + results.transactions.length + results.journal.length + results.workouts.length + results.wallets.length
      : 0;

  const go = (page: Parameters<typeof setPage>[0]) => {
    setPage(page);
    setSearchOpen(false);
  };

  const copyError = () => {
    toast.error(resultsQuery.error instanceof Error ? resultsQuery.error.message : "Gagal mencari");
  };

  return (
    <Drawer open={searchOpen} onOpenChange={setSearchOpen}>
      <DrawerContent className="max-h-[88dvh]">
        <div className="flex-1 min-h-0 px-4 pt-1 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] overflow-y-auto scroll-thin">
          <DrawerTitle className="text-base font-bold">Pencarian Cepat</DrawerTitle>
          <DrawerDescription className="text-xs text-muted-foreground mb-3">
            Cari kebiasaan, transaksi, catatan, latihan, dan dompet sekaligus.
          </DrawerDescription>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ketik minimal 2 huruf…"
              aria-label="Kata kunci pencarian"
              className="min-h-[44px] rounded-xl pl-10 bg-card"
              maxLength={60}
              enterKeyHint="search"
            />
          </div>

          <div className="mt-3 space-y-3">
            {resultsQuery.isError && (
              <button
                onClick={copyError}
                className="press w-full rounded-xl border border-dashed border-border/70 px-3 py-3 min-h-[44px] text-left text-xs font-semibold text-muted-foreground"
              >
                Pencarian gagal dimuat — ketuk untuk coba lagi
              </button>
            )}

            {!enabled && (
              <EmptyState
                icon={<Search className="h-6 w-6" />}
                title="Mulai mengetik untuk mencari"
                description="Judul catatan, kategori transaksi, nama kebiasaan, hingga nama dompet."
              />
            )}

            {enabled && resultsQuery.isPending && (
              <div className="space-y-2" role="status" aria-label="Mencari">
                <div className="skeleton-shimmer h-11 rounded-xl" />
                <div className="skeleton-shimmer h-11 rounded-xl" />
                <div className="skeleton-shimmer h-11 rounded-xl" />
              </div>
            )}

            {enabled && resultsQuery.isSuccess && total === 0 && (
              <EmptyState
                icon={<SearchX className="h-6 w-6" />}
                title={`Tidak ada hasil untuk "${query.trim()}"`}
                description="Coba kata kunci lain yang lebih pendek."
              />
            )}

            {results && results.habits.length > 0 && (
              <Section icon={<Sprout className="h-3.5 w-3.5 text-garden-deep" />} title="Kebiasaan">
                {results.habits.map((h) => (
                  <Row
                    key={h.id}
                    title={
                      <span className="flex items-center gap-1.5">
                        {h.name}
                        {h.archived && (
                          <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                            arsip
                          </span>
                        )}
                      </span>
                    }
                    sub={h.category}
                    onClick={() => go("habits")}
                  />
                ))}
              </Section>
            )}

            {results && results.transactions.length > 0 && (
              <Section icon={<Wallet className="h-3.5 w-3.5 text-vault-deep" />} title="Keuangan">
                {results.transactions.map((t) => (
                  <Row
                    key={t.id}
                    title={
                      <span className={cn("truncate", t.type === "expense" ? "text-clay-deep" : t.type === "income" ? "text-garden-deep" : "text-muted-foreground")}>
                        {t.type === "expense" ? "−" : t.type === "income" ? "+" : ""}
                        {formatRupiah(t.amount)}
                      </span>
                    }
                    sub={`${t.category}${t.note ? ` · ${t.note}` : ""} · ${formatDateID(t.date)}`}
                    onClick={() => go("finance")}
                  />
                ))}
              </Section>
            )}

            {results && results.journal.length > 0 && (
              <Section icon={<NotebookText className="h-3.5 w-3.5 text-writer-deep" />} title="Jurnal">
                {results.journal.map((j) => (
                  <Row
                    key={j.id}
                    title={j.title || j.snippet || "Tanpa judul"}
                    sub={`${j.folder} · ${formatDateID(j.createdAt.slice(0, 10))}`}
                    onClick={() => go("journal")}
                  />
                ))}
              </Section>
            )}

            {results && results.workouts.length > 0 && (
              <Section icon={<Dumbbell className="h-3.5 w-3.5 text-studio-deep" />} title="Latihan">
                {results.workouts.map((w) => (
                  <Row
                    key={w.id}
                    title={w.title || (TYPE_LABEL[w.type] ?? w.type)}
                    sub={`${formatDateID(w.date)} · ${formatDuration(w.durationMin)}`}
                    onClick={() => go("fitness")}
                  />
                ))}
              </Section>
            )}

            {results && results.wallets.length > 0 && (
              <Section icon={<CreditCard className="h-3.5 w-3.5 text-vault-deep" />} title="Dompet">
                {results.wallets.map((w) => (
                  <Row key={w.id} title={w.name} sub={w.type} onClick={() => go("finance")} />
                ))}
              </Section>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
