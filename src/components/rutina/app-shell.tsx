"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import {
  Home,
  Dumbbell,
  Plus,
  Wallet,
  Sprout,
  PenLine,
  UtensilsCrossed,
  HeartPulse,
  BarChart3,
  NotebookText,
  UserRound,
  ChevronRight,
} from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { useRutinaStore, type MainTab, type RutinaPage } from "@/store/rutina";
import { cn } from "@/lib/utils";

// Layar tab utama: statis (dibutuhkan segera saat app dibuka)
import HomeScreen from "@/components/rutina/screens/home-screen";
import HabitsScreen from "@/components/rutina/screens/habits-screen";
import FitnessScreen from "@/components/rutina/screens/fitness-screen";
import FinanceScreen from "@/components/rutina/screens/finance-screen";

// Layar overlay & sheet: lazy (chunk dimuat saat pertama kali dipakai) —
// memecah bundle awal ±50% tanpa mengubah perilaku (react-perf: dynamic imports).
const JournalScreen = dynamic(() => import("@/components/rutina/screens/journal-screen"), { ssr: false, loading: () => null });
const StatsScreen = dynamic(() => import("@/components/rutina/screens/stats-screen"), { ssr: false, loading: () => null });
const ProfileScreen = dynamic(() => import("@/components/rutina/screens/profile-screen"), { ssr: false, loading: () => null });

const AddHabitSheet = dynamic(() => import("@/components/rutina/sheets/add-habit-sheet"), { ssr: false, loading: () => null });
const AddJournalSheet = dynamic(() => import("@/components/rutina/sheets/add-journal-sheet"), { ssr: false, loading: () => null });
const AddTransactionSheet = dynamic(() => import("@/components/rutina/sheets/add-transaction-sheet"), { ssr: false, loading: () => null });
const AddWorkoutSheet = dynamic(() => import("@/components/rutina/sheets/add-workout-sheet"), { ssr: false, loading: () => null });
const AddFoodSheet = dynamic(() => import("@/components/rutina/sheets/add-food-sheet"), { ssr: false, loading: () => null });
const LogCheckInSheet = dynamic(() => import("@/components/rutina/sheets/log-checkin-sheet"), { ssr: false, loading: () => null });

// ===== Deep link & tombol back (ux-guidelines #4/#5) =====
// Halaman disinkronkan ke location.hash sehingga back/forward browser menutup
// overlay (Jurnal/Statistik/Profil) alih-alih keluar dari aplikasi.
const PAGE_HASH: Record<RutinaPage, string> = {
  home: "",
  fitness: "#bugar",
  finance: "#vault",
  habits: "#kebiasaan",
  journal: "#jurnal",
  stats: "#statistik",
  profile: "#profil",
};
const HASH_PAGE: Record<string, RutinaPage> = {
  "#bugar": "fitness",
  "#vault": "finance",
  "#kebiasaan": "habits",
  "#jurnal": "journal",
  "#statistik": "stats",
  "#profil": "profile",
};

const TABS: { key: MainTab; label: string; icon: React.ElementType }[] = [
  { key: "home", label: "Beranda", icon: Home },
  { key: "fitness", label: "Bugar", icon: Dumbbell },
  { key: "finance", label: "Keuangan", icon: Wallet },
  { key: "habits", label: "Kebiasaan", icon: Sprout },
];

function BottomNav() {
  const page = useRutinaStore((s) => s.page);
  const setPage = useRutinaStore((s) => s.setPage);
  const setHubOpen = useRutinaStore((s) => s.setHubOpen);

  return (
    <nav
      aria-label="Navigasi utama"
      className="absolute bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border/70"
    >
      <div className="grid grid-cols-5 items-end px-2 pb-1 mx-auto w-full max-w-[512px]">
        {TABS.slice(0, 2).map((t) => (
          <TabButton key={t.key} tab={t} active={page === t.key} onClick={() => setPage(t.key)} />
        ))}
        <div className="flex justify-center">
          <button
            onClick={() => setHubOpen(true)}
            aria-label="Buka Tindakan Cepat"
            className="press-squish -mt-5 h-14 w-14 rounded-full text-white shadow-lift flex items-center justify-center ring-4 ring-background bg-garden"
          >
            <Plus className="h-6 w-6" strokeWidth={2.75} />
          </button>
        </div>
        {TABS.slice(2).map((t) => (
          <TabButton key={t.key} tab={t} active={page === t.key} onClick={() => setPage(t.key)} />
        ))}
      </div>
      <div className="pb-safe" />
    </nav>
  );
}

function TabButton({
  tab,
  active,
  onClick,
}: {
  tab: { key: string; label: string; icon: React.ElementType };
  active: boolean;
  onClick: () => void;
}) {
  const Icon = tab.icon;
  return (
    <button
      onClick={onClick}
      className="press flex flex-col items-center gap-0.5 py-2 min-h-[56px] justify-center"
      aria-current={active ? "page" : undefined}
    >
      <motion.span
        className={cn(
          "flex items-center justify-center h-8 w-14 rounded-full transition-colors",
          active ? "bg-garden-soft text-garden-deep" : "text-muted-foreground"
        )}
        animate={{ scale: active ? 1.08 : 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 18 }}
      >
        <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
      </motion.span>
      <span className={cn("text-xs font-semibold", active ? "text-garden-deep" : "text-muted-foreground")}>
        {tab.label}
      </span>
    </button>
  );
}

function QuickActionHub() {
  const hubOpen = useRutinaStore((s) => s.hubOpen);
  const setHubOpen = useRutinaStore((s) => s.setHubOpen);
  const setQuickAction = useRutinaStore((s) => s.setQuickAction);
  const setPage = useRutinaStore((s) => s.setPage);

  const actions = [
    { key: "habit" as const, icon: Sprout, label: "Tambah Kebiasaan", desc: "Tanam misi baru", tone: "bg-garden-soft text-garden-deep" },
    { key: "journal" as const, icon: PenLine, label: "Catatan Jurnal", desc: "Tulis refleksi hari ini", tone: "bg-writer-soft text-writer-deep" },
    { key: "transaction" as const, icon: Wallet, label: "Catat Transaksi", desc: "Masuk, keluar, transfer", tone: "bg-vault-soft text-vault-deep" },
    { key: "workout" as const, icon: Dumbbell, label: "Catat Latihan", desc: "Kardio atau beban", tone: "bg-studio-soft text-studio-deep" },
    { key: "food" as const, icon: UtensilsCrossed, label: "Catat Asupan", desc: "Makanan & kalori", tone: "bg-studio-soft text-studio-deep" },
    { key: "checkin" as const, icon: HeartPulse, label: "Check-in Harian", desc: "Mood, energi, tidur", tone: "bg-gold-soft text-gold" },
  ];

  const shortcuts = [
    { icon: NotebookText, label: "Jurnal", onClick: () => setPage("journal") },
    { icon: BarChart3, label: "Statistik", onClick: () => setPage("stats") },
    { icon: UserRound, label: "Profil", onClick: () => setPage("profile") },
  ];

  return (
    <Drawer open={hubOpen} onOpenChange={setHubOpen}>
      <DrawerContent className="max-h-[85dvh]">
        <div className="px-4 pt-1 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] overflow-y-auto scroll-thin">
          <div className="flex items-center justify-between mb-1">
            <DrawerTitle className="text-base font-bold">Tindakan Cepat</DrawerTitle>
          </div>
          <DrawerDescription className="text-xs text-muted-foreground mb-4">
            Pencatatan tercepat, satu ketukan dari mana saja.
          </DrawerDescription>
          <div className="grid grid-cols-2 gap-2.5">
            {actions.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.key}
                  onClick={() => setQuickAction(a.key)}
                  className="press bento-tile flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 text-left shadow-clay min-h-[64px]"
                >
                  <span className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-soft", a.tone)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold leading-tight">{a.label}</span>
                    <span className="block text-xs text-muted-foreground truncate">{a.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 border-t border-border/60 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Jelajahi</p>
            <div className="grid grid-cols-3 gap-2.5">
              {shortcuts.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.label}
                    onClick={() => setPage(s.label === "Jurnal" ? "journal" : s.label === "Statistik" ? "stats" : "profile")}
                    className="press flex items-center justify-center gap-1.5 rounded-xl bg-secondary py-2.5 text-xs font-semibold min-h-[44px]"
                  >
                    <Icon className="h-4 w-4" />
                    {s.label}
                    <ChevronRight className="h-3 w-3 opacity-50" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function QuickActionSheets() {
  const quickAction = useRutinaStore((s) => s.quickAction);
  const journalPrefill = useRutinaStore((s) => s.journalPrefill);
  const setQuickAction = useRutinaStore((s) => s.setQuickAction);
  const close = () => setQuickAction(null);
  // Prefill (mis. prompt refleksi) dibuang saat sheet ditutup agar
  // pembukaan berikutnya selalu mulai dari form yang benar.
  const closeJournal = () => {
    useRutinaStore.setState({ journalPrefill: null });
    close();
  };
  // Sheet dimuat (chunk di-fetch) hanya pada penggunaan pertama; setelah itu
  // tetap ter-mount agar animasi buka/tutup vaul tetap berjalan.
  const [used, setUsed] = React.useState<Set<string>>(() => new Set());
  React.useEffect(() => {
    if (quickAction) setUsed((prev) => (prev.has(quickAction) ? prev : new Set(prev).add(quickAction)));
  }, [quickAction]);

  return (
    <>
      {used.has("habit") && <AddHabitSheet open={quickAction === "habit"} onClose={close} />}
      {used.has("journal") && (
        <AddJournalSheet open={quickAction === "journal"} onClose={closeJournal} prefill={journalPrefill ?? undefined} />
      )}
      {used.has("transaction") && <AddTransactionSheet open={quickAction === "transaction"} onClose={close} />}
      {used.has("workout") && <AddWorkoutSheet open={quickAction === "workout"} onClose={close} />}
      {used.has("food") && <AddFoodSheet open={quickAction === "food"} onClose={close} />}
      {used.has("checkin") && <LogCheckInSheet open={quickAction === "checkin"} onClose={close} />}
    </>
  );
}

function OverlayPages() {
  const page = useRutinaStore((s) => s.page);
  const isOverlay = page === "journal" || page === "stats" || page === "profile";
  return (
    <AnimatePresence>
      {isOverlay && (
        <motion.div
          key={page}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="absolute inset-0 z-[45] bg-background overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom,0px)]"
        >
          <div className="mx-auto w-full max-w-[512px]">
            {page === "journal" && <JournalScreen />}
            {page === "stats" && <StatsScreen />}
            {page === "profile" && <ProfileScreen />}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MainContent() {
  const page = useRutinaStore((s) => s.page);
  return (
    <div className="flex-1 flex flex-col pb-[calc(84px+env(safe-area-inset-bottom,0px))]">
      {page === "home" && <HomeScreen />}
      {page === "fitness" && <FitnessScreen />}
      {page === "finance" && <FinanceScreen />}
      {page === "habits" && <HabitsScreen />}
    </div>
  );
}

export function RutinaApp() {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false } },
      })
  );

  // ===== Sinkronisasi halaman ↔ history (back/forward & deep link #jurnal dll.) =====
  const page = useRutinaStore((s) => s.page);
  const setPage = useRutinaStore((s) => s.setPage);
  const hydrated = React.useRef(false);

  // Mount: adopsi hash jika valid, kalau tidak — selaraskan URL tanpa menambah entri.
  React.useEffect(() => {
    const fromHash = HASH_PAGE[window.location.hash];
    if (fromHash && fromHash !== page) setPage(fromHash);
    else if (window.location.hash !== PAGE_HASH[page]) {
      history.replaceState(null, "", PAGE_HASH[page] || window.location.pathname);
    }
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Perubahan halaman via UI → entri history baru sehingga back kembali ke layar sebelumnya.
  React.useEffect(() => {
    if (!hydrated.current) return;
    const target = PAGE_HASH[page];
    if (window.location.hash !== target) {
      history.pushState(null, "", target || window.location.pathname);
    }
  }, [page]);

  // Back/forward browser → ikuti hash.
  React.useEffect(() => {
    const onPop = () => setPage(HASH_PAGE[window.location.hash] ?? "home");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [setPage]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        {/* Hormati prefers-reduced-motion untuk semua animasi framer-motion (ux #9) */}
        <MotionConfig reducedMotion="user">
        {/* Full-bleed app shell — fills the viewport edge-to-edge at every screen size.
            Content is centered with a max-width column so wide screens stay readable. */}
        <div className="relative h-dvh w-full bg-background flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden overscroll-contain scroll-thin mx-auto w-full max-w-[512px]">
            <MainContent />
          </div>
          <BottomNav />
          <OverlayPages />
          <QuickActionHub />
          <QuickActionSheets />
        </div>
        </MotionConfig>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
