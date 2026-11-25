"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";
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
import { useRutinaStore, type MainTab } from "@/store/rutina";
import { cn } from "@/lib/utils";

import HomeScreen from "@/components/rutina/screens/home-screen";
import HabitsScreen from "@/components/rutina/screens/habits-screen";
import FitnessScreen from "@/components/rutina/screens/fitness-screen";
import FinanceScreen from "@/components/rutina/screens/finance-screen";
import JournalScreen from "@/components/rutina/screens/journal-screen";
import StatsScreen from "@/components/rutina/screens/stats-screen";
import ProfileScreen from "@/components/rutina/screens/profile-screen";

import AddHabitSheet from "@/components/rutina/sheets/add-habit-sheet";
import AddJournalSheet from "@/components/rutina/sheets/add-journal-sheet";
import AddTransactionSheet from "@/components/rutina/sheets/add-transaction-sheet";
import AddWorkoutSheet from "@/components/rutina/sheets/add-workout-sheet";
import AddFoodSheet from "@/components/rutina/sheets/add-food-sheet";
import LogCheckInSheet from "@/components/rutina/sheets/log-checkin-sheet";

const TABS: { key: MainTab; label: string; icon: React.ElementType }[] = [
  { key: "home", label: "Beranda", icon: Home },
  { key: "fitness", label: "Bugar", icon: Dumbbell },
  { key: "finance", label: "Vault", icon: Wallet },
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
      <div className="grid grid-cols-5 items-end px-2 pb-1">
        {TABS.slice(0, 2).map((t) => (
          <TabButton key={t.key} tab={t} active={page === t.key} onClick={() => setPage(t.key)} />
        ))}
        <div className="flex justify-center">
          <button
            onClick={() => setHubOpen(true)}
            aria-label="Buka Tindakan Cepat"
            className="press -mt-5 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lift flex items-center justify-center ring-4 ring-background"
          >
            <Plus className="h-6 w-6" strokeWidth={2.5} />
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
      <span
        className={cn(
          "flex items-center justify-center h-8 w-14 rounded-full transition-colors",
          active ? "bg-sage-soft text-sage-deep" : "text-muted-foreground"
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
      </span>
      <span className={cn("text-[10px] font-semibold", active ? "text-sage-deep" : "text-muted-foreground")}>
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
        <div className="px-5 pt-1 pb-6 overflow-y-auto scroll-thin">
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
                  className="press flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 text-left shadow-soft min-h-[64px]"
                >
                  <span className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", a.tone)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold leading-tight">{a.label}</span>
                    <span className="block text-[11px] text-muted-foreground truncate">{a.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 border-t border-border/60 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Jelajahi</p>
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
  const setQuickAction = useRutinaStore((s) => s.setQuickAction);
  const close = () => setQuickAction(null);

  return (
    <>
      <AddHabitSheet open={quickAction === "habit"} onClose={close} />
      <AddJournalSheet open={quickAction === "journal"} onClose={close} />
      <AddTransactionSheet open={quickAction === "transaction"} onClose={close} />
      <AddWorkoutSheet open={quickAction === "workout"} onClose={close} />
      <AddFoodSheet open={quickAction === "food"} onClose={close} />
      <LogCheckInSheet open={quickAction === "checkin"} onClose={close} />
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
          className="absolute inset-0 z-[45] bg-background overflow-y-auto overscroll-contain"
        >
          {page === "journal" && <JournalScreen />}
          {page === "stats" && <StatsScreen />}
          {page === "profile" && <ProfileScreen />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MainContent() {
  const page = useRutinaStore((s) => s.page);
  return (
    <div className="flex-1 flex flex-col pb-[calc(72px+env(safe-area-inset-bottom,0px))]">
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

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        {/* Outer backdrop for desktop preview — locked to viewport so the app shell stays fullscreen */}
        <div className="h-dvh w-full bg-[#eae7e0] dark:bg-[#0c0b0a] flex justify-center overflow-hidden">
          <div className="relative w-full max-w-[430px] h-dvh bg-background flex flex-col shadow-soft sm:border-x sm:border-border overflow-hidden">
            <div className="flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden overscroll-contain">
              <MainContent />
            </div>
            <BottomNav />
            <OverlayPages />
            <QuickActionHub />
            <QuickActionSheets />
          </div>
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
