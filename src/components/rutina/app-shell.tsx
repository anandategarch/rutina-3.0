"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "next-themes";
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
  Search,
} from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { useRutinaStore, type MainTab, type RutinaPage } from "@/store/rutina";
import { rutinaApi } from "@/lib/rutina/api";
import { attachOfflinePersistence, restoreOfflineCache } from "@/lib/rutina/offline-cache";
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
const QuickSearchSheet = dynamic(() => import("@/components/rutina/sheets/quick-search-sheet"), { ssr: false, loading: () => null });

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
      {/* motion.csv #10 + quick-ref continuity/layoutId: pil aktif berpindah
          halus antar tab via layoutId (aman terhadap crossfade di MainContent —
          pil hidup di header persisten, bukan di subtree yang di-crossfade;
          hanya SATU span aktif dalam satu waktu, jadi tepat satu layoutId).
          taste-skill motion.md "Never": an overshooting ease — bounce spring
          scale 1.08 diganti tween decelerate 150ms (kurva --ease-ui). */}
      <motion.span
        layoutId="nav-pill"
        className={cn(
          "flex items-center justify-center h-8 w-14 rounded-full transition-colors",
          active ? "bg-garden-soft text-garden-deep" : "text-muted-foreground"
        )}
        animate={{ scale: active ? 1.08 : 1 }}
        transition={{ duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
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
  const setSearchOpen = useRutinaStore((s) => s.setSearchOpen);

  const actions = [
    { key: "habit" as const, icon: Sprout, label: "Tambah Kebiasaan", desc: "Tanam misi baru", tone: "bg-garden-soft text-garden-deep" },
    { key: "journal" as const, icon: PenLine, label: "Catatan Jurnal", desc: "Tulis refleksi hari ini", tone: "bg-writer-soft text-writer-deep" },
    { key: "transaction" as const, icon: Wallet, label: "Catat Transaksi", desc: "Masuk, keluar, transfer", tone: "bg-vault-soft text-vault-deep" },
    { key: "workout" as const, icon: Dumbbell, label: "Catat Latihan", desc: "Kardio atau beban", tone: "bg-studio-soft text-studio-deep" },
    { key: "food" as const, icon: UtensilsCrossed, label: "Catat Asupan", desc: "Makanan & kalori", tone: "bg-studio-soft text-studio-deep" },
    { key: "checkin" as const, icon: HeartPulse, label: "Check-in Harian", desc: "Mood, energi, tidur", tone: "bg-gold-soft text-gold-deep" },
  ];

  const shortcuts = [
    { icon: Search, label: "Cari", onClick: () => setSearchOpen(true) },
    { icon: NotebookText, label: "Jurnal", onClick: () => setPage("journal") },
    { icon: BarChart3, label: "Statistik", onClick: () => setPage("stats") },
    { icon: UserRound, label: "Profil", onClick: () => setPage("profile") },
  ];

  return (
    <Drawer open={hubOpen} onOpenChange={setHubOpen}>
      <DrawerContent className="max-h-[85dvh]">
        {/* flex-1 min-h-0: konten selalu bisa menggulir di dalam drawer flex-col,
            tidak peduli tinggi isinya melebihi max-h (drawer hygiene). */}
        <div className="flex-1 min-h-0 px-4 pt-1 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] overflow-y-auto scroll-thin">
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
            {/* taste-skill copy rule 3: setiap heading memuat kata benda —
                "Jelajahi" (verb, padanan "Explore" yang dilarang) -> "Pintasan" */}
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Pintasan</p>
            <div className="grid grid-cols-4 gap-2.5">
              {shortcuts.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.label}
                    onClick={s.onClick}
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
  const transactionPrefill = useRutinaStore((s) => s.transactionPrefill);
  const setQuickAction = useRutinaStore((s) => s.setQuickAction);
  const close = () => setQuickAction(null);
  // Prefill (mis. prompt refleksi) dibuang saat sheet ditutup agar
  // pembukaan berikutnya selalu mulai dari form yang benar.
  const closeJournal = () => {
    useRutinaStore.setState({ journalPrefill: null });
    close();
  };
  const closeTransaction = () => {
    useRutinaStore.setState({ transactionPrefill: null });
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
      {used.has("transaction") && (
        <AddTransactionSheet
          open={quickAction === "transaction"}
          onClose={closeTransaction}
          prefill={transactionPrefill ?? undefined}
        />
      )}
      {used.has("workout") && <AddWorkoutSheet open={quickAction === "workout"} onClose={close} />}
      {used.has("food") && <AddFoodSheet open={quickAction === "food"} onClose={close} />}
      {used.has("checkin") && <LogCheckInSheet open={quickAction === "checkin"} onClose={close} />}
    </>
  );
}

// ===== Sinkronisasi chrome browser/PWA dengan tema aktif =====
// Meta theme-color statis di layout hanya mengikuti prefers-color-scheme OS.
// Saat user memilih tema manual di Profil, warna address bar / status bar PWA
// harus ikut berubah: metanya di-update langsung di sini.
function ThemeChromeSync() {
  const { resolvedTheme } = useTheme();
  React.useEffect(() => {
    if (!resolvedTheme) return; // belum ter-hidrasi — biarkan meta media-query bekerja
    const color = resolvedTheme === "dark" ? "#171D19" : "#F4F3EE";
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      // Lepas atribut media agar tag ini yang menang di semua skema OS
      // (nilai token terverifikasi di globals.css --background & manifest.json).
      meta.removeAttribute("media");
      meta.setAttribute("content", color);
    });
  }, [resolvedTheme]);
  return null;
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
          className="absolute inset-0 z-[45] bg-background paper-grid overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom,0px)]"
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
      {/* motion.csv #10: transisi halaman subtle — crossfade 180ms masuk /
          120ms keluar (exit ±67% lebih cepat dari enter), TANPA y-offset
          (ux #7: .rise-in per-section di dalam layar sudah menangani entrance,
          maks 1-2 elemen kunci per view). mode="wait" dipilih, bukan popLayout:
          parent-nya scroll container overflow-y-auto TANPA `relative`, sehingga
          child popLayout yang dipop absolut akan anchor ke shell di luar dan
          salah posisi saat halaman ter-scroll; dengan mode="wait" layar lama
          dan baru selalu dalam alur normal (tanpa absolute inset-0), ditukar
          dalam satu commit — tidak ada double-space maupun layout shift. */}
      <AnimatePresence mode="wait">
        <motion.div
          key={page}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] } }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          className="flex flex-1 flex-col"
        >
          {page === "home" && <HomeScreen />}
          {page === "fitness" && <FitnessScreen />}
          {page === "finance" && <FinanceScreen />}
          {page === "habits" && <HabitsScreen />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function RutinaApp() {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: false,
            // Ketahanan muat: kegagalan sementara (cold-compile route di dev,
            // restart server, jaringan mobile berfluktuasi) tidak boleh langsung
            // membuang pengguna ke layar error. 3 percobaan + backoff eksponensial
            // dengan jitter; setelah itu LoadErrorState melanjutkan auto-retry UI.
            retry: 2,
            retryDelay: (attempt) =>
              Math.min(1000 * 2 ** attempt, 10_000) + Math.floor(Math.random() * 400),
          },
        },
      })
  );

  // Offline-first: restore snapshot SEBELUM render pertama TERNYATA memicu
  // hydration mismatch (server render skeleton tanpa data, client render
  // konten ter-restore). Karena itu restore + persist keduanya dipasang
  // SETELAH mount: paint pertama selalu cocok dengan HTML server, lalu data
  // tersimpan muncul satu frame berikutnya.
  React.useEffect(() => {
    restoreOfflineCache(queryClient);
    return attachOfflinePersistence(queryClient);
  }, [queryClient]);

  // Prefetch idle: data Kebiasaan adalah GET terberat (streak server + pola lupa +
  // log 35 hari) dan routenya dikompilasi on-demand di dev. Dipanaskan lebih awal
  // sehingga tab Kebiasaan terbuka instan dari cache & tidak menabrak cold-compile.
  //
  // audit E-F2: requestIdleCallback hanya menunggu idle-nya MAIN THREAD — saat
  // boot, main thread langsung idle padahal 4 GET beranda masih in-flight,
  // sehingga prefetch yang "berat" ini ikut menambah burst boot paralel dan
  // memperbesar jendela kontensi DB (akar "Gagal memuat kebiasaan"). Kini
  // prefetch MENUNGGU muatan awal beres: berlangganan cache sampai tidak ada
  // query yang sedang mengambil dan query beranda sudah settle (sukses/gagal),
  // baru dijadwalkan via requestIdleCallback. Fallback 20 dtk memastikan
  // prefetch tetap jalan walau ada query macet.
  React.useEffect(() => {
    let done = false;
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const warmUp = () => {
      if (done) return;
      done = true;
      queryClient.prefetchQuery({ queryKey: ["habits"], queryFn: rutinaApi.habits, staleTime: 15_000 });
    };

    const scheduleWarmUp = () => {
      // audit 1-b: batalkan jadwal sebelumnya dulu — maybeWarm dipanggil pada
      // SETIAP event cache; tanpa cancel, callback menumpuk di antrean idle
      // (semua dibereskan guard `done`, tapi tetap kebocoran jadwal).
      const w = window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        cancelIdleCallback?: (id: number) => void;
      };
      if (idleId !== undefined) w.cancelIdleCallback?.(idleId);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      if (typeof w.requestIdleCallback === "function") {
        idleId = w.requestIdleCallback(warmUp, { timeout: 3_500 });
      } else {
        timeoutId = setTimeout(warmUp, 2_000);
      }
    };

    // Warm hanya saat: tidak ada query in-flight DAN query ["home", …] pertama
    // sudah settle (atau belum pernah terdaftar — mis. deep link non-beranda).
    const maybeWarm = () => {
      if (done || queryClient.isFetching() > 0) return;
      const homeState = queryClient
        .getQueryCache()
        .find({ queryKey: ["home"] })?.state;
      if (!homeState || homeState.status === "success" || homeState.status === "error") {
        scheduleWarmUp();
      }
    };

    const unsub = queryClient.getQueryCache().subscribe(maybeWarm);
    maybeWarm(); // kasus cache sudah settle sebelum subscribe terpasang
    // Fallback: jangan tunda prefetch selamanya karena satu query macet.
    const fallback = setTimeout(scheduleWarmUp, 20_000);

    return () => {
      done = true;
      unsub();
      clearTimeout(fallback);
      if (timeoutId) clearTimeout(timeoutId);
      const w = window as Window & { cancelIdleCallback?: (id: number) => void };
      if (idleId !== undefined) w.cancelIdleCallback?.(idleId);
    };
  }, [queryClient]);

  // ===== Sinkronisasi halaman ↔ history (back/forward & deep link #jurnal dll.) =====
  const page = useRutinaStore((s) => s.page);
  const setPage = useRutinaStore((s) => s.setPage);
  // audit D-L8: sheet pencarian lazy sama seperti sheet lain — chunk-nya baru
  // di-fetch pada penggunaan pertama, bukan menumpuk beban startup.
  const searchOpen = useRutinaStore((s) => s.searchOpen);
  const [searchUsed, setSearchUsed] = React.useState(false);
  React.useEffect(() => {
    if (searchOpen) setSearchUsed(true);
  }, [searchOpen]);
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
    const onPop = () => {
      const target = HASH_PAGE[window.location.hash];
      if (target) {
        setPage(target);
      } else {
        // audit D-L5: hash tak dikenal (mis. user ketik #foo) → pulihkan hash
        // halaman aktif dengan replaceState, BUKAN pushState — loop lama
        // menambah satu entri history per tekan back sehingga tombol back
        // terasa macet di halaman yang sama.
        history.replaceState(null, "", PAGE_HASH[page] || window.location.pathname);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [setPage, page]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* defaultTheme system + enableSystem: pengguna OS dark mendapat tema
          gelap sejak awal, toggle manual di Profil tetap berlaku (next-themes). */}
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ThemeChromeSync />
        {/* Hormati prefers-reduced-motion untuk semua animasi framer-motion (ux #9) */}
        <MotionConfig reducedMotion="user">
        {/* Full-bleed app shell — fills the viewport edge-to-edge at every screen size.
            Content is centered with a max-width column so wide screens stay readable. */}
        <div className="relative h-dvh w-full bg-background paper-grid flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden overscroll-contain scroll-thin mx-auto w-full max-w-[512px]">
            <MainContent />
          </div>
          <BottomNav />
          <OverlayPages />
          <QuickActionHub />
          {searchUsed && <QuickSearchSheet />}
          <QuickActionSheets />
        </div>
        </MotionConfig>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
