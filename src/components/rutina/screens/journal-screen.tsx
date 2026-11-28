"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Pin,
  PenLine,
  Loader2,
  NotebookText,
  CalendarDays,
  AlignLeft,
  AlertTriangle,
  Trash2,
  FolderOpen,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useRutinaStore } from "@/store/rutina";
import { rutinaApi } from "@/lib/rutina/api";
import {
  todayStr,
  addDays,
  weekStart,
  startOfMonth,
  formatDateID,
  rangeDays,
  parseDateStr,
  toDateStr,
  jakartaDateStr,
  formatNumber,
  formatDayMonth,
  monthName,
} from "@/lib/rutina/format";
import { MiniBars, DeltaBadge, HBarList, Sparkline, rampColor } from "@/components/rutina/charts";
import { ScreenHeader, SectionCard, StatTile, EmptyState, Pill, ShowAllToggle } from "@/components/rutina/primitives";
import { JOURNAL_MOODS } from "@/components/rutina/sheets/add-journal-sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { JournalEntry } from "@/types/rutina";
import { cn } from "@/lib/utils";

const FOLDERS = ["Umum", "Refleksi", "Ide", "Sorotan"];
const FOLDER_TONE: Record<string, "stone" | "writer" | "studio" | "garden"> = {
  Umum: "stone",
  Refleksi: "writer",
  Ide: "studio",
  Sorotan: "garden",
};

function relativeDate(s: string): string {
  const today = todayStr();
  if (s === today) return "Hari ini";
  if (s === addDays(today, -1)) return "Kemarin";
  return formatDateID(s);
}

/* ---------------- Halaman pertama jurnal (state kosong asli) ---------------- */

/**
 * Prompt refleksi harian — berputar deterministik mengikuti tanggal.
 * Tone editorial yang tenang, selalu terbuka (tidak menghakimi).
 */
const REFLECTION_PROMPTS = [
  "Apa satu hal kecil hari ini yang membuatmu bersyukur?",
  "Hari ini aku merasa… karena…",
  "Apa satu momen hari ini yang ingin kamu ingat setahun dari sekarang?",
  "Satu kemenangan kecil hari ini adalah…",
  "Apa yang ingin kamu katakan pada dirimu seminggu yang lalu?",
  "Hal apa yang paling menguras energi hari ini — dan apa yang bisa kamu lakukan besok?",
  "Jika hari ini adalah satu bab buku, apa judulnya?",
  "Apa satu kebiasaan yang terasa paling berat akhir-akhir ini, dan kenapa?",
];

function promptOfTheDay(): string {
  const seed = Number(todayStr().replaceAll("-", "")) % REFLECTION_PROMPTS.length;
  return REFLECTION_PROMPTS[seed];
}

/** Ilustrasi line-art Field Notes: buku terbuka dengan tunas tumbuh. */
function JournalDoodle() {
  return (
    <svg width="168" height="104" viewBox="0 0 168 104" fill="none" aria-hidden="true">
      {/* buku terbuka */}
      <path
        d="M24 78 C36 70, 60 68, 80 74 L80 26 C60 20, 36 22, 24 30 Z"
        fill="var(--writer-soft)"
        stroke="var(--writer)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M136 78 C124 70, 100 68, 80 74 L80 26 C100 20, 124 22, 136 30 Z"
        fill="var(--card)"
        stroke="var(--writer)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M80 74 L80 26" stroke="var(--writer)" strokeWidth="2" strokeLinecap="round" />
      {/* garis tulisan halaman kiri */}
      <path d="M32 40 C42 36, 58 35, 70 38" stroke="var(--writer)" strokeWidth="1.6" strokeLinecap="round" opacity="0.45" />
      <path d="M32 48 C42 44, 58 43, 70 46" stroke="var(--writer)" strokeWidth="1.6" strokeLinecap="round" opacity="0.45" />
      <path d="M32 56 C40 53, 50 52, 58 53" stroke="var(--writer)" strokeWidth="1.6" strokeLinecap="round" opacity="0.45" />
      {/* garis tulisan halaman kanan */}
      <path d="M90 38 C102 35, 118 36, 128 40" stroke="var(--writer)" strokeWidth="1.6" strokeLinecap="round" opacity="0.45" />
      <path d="M90 46 C102 43, 118 44, 128 48" stroke="var(--writer)" strokeWidth="1.6" strokeLinecap="round" opacity="0.45" />
      {/* tunas tumbuh dari buku */}
      <path
        d="M80 26 C80 18, 82 12, 86 6"
        stroke="var(--garden)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M86 6 C92 4, 98 6, 100 12 C94 16, 88 14, 86 6 Z"
        fill="var(--garden-soft)"
        stroke="var(--garden)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M82 14 C76 12, 70 14, 68 20 C74 24, 80 21, 82 14 Z"
        fill="var(--garden-soft)"
        stroke="var(--garden)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* titik aksen */}
      <circle cx="150" cy="22" r="2.5" fill="var(--gold)" opacity="0.8" />
      <circle cx="14" cy="18" r="2" fill="var(--garden)" opacity="0.6" />
    </svg>
  );
}

/**
 * State kosong asli jurnal: ilustrasi + prompt refleksi harian + dua aksi
 * (jawab prompt dengan prefill, atau mulai halaman kosong).
 */
function JournalFirstPage({ onBlank, onPrompt }: { onBlank: () => void; onPrompt: (prompt: string) => void }) {
  const prompt = promptOfTheDay();
  return (
    <div className="flex flex-col items-center text-center py-8 px-4">
      <JournalDoodle />
      <p className="font-semibold text-foreground text-sm mt-3">Halaman pertamamu masih kosong</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-[250px] leading-relaxed">
        Tak perlu menulis banyak — satu paragraf jujur cukup untuk memulai arsip pribadimu.
      </p>
      <div className="mt-4 w-full max-w-[300px] rounded-xl border border-writer/30 bg-writer-soft/50 p-3.5 text-left">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-writer-deep" />
          <p className="text-xs font-bold uppercase tracking-wide text-writer-deep">Prompt refleksi hari ini</p>
        </div>
        <p className="text-sm font-semibold leading-snug mt-1.5">{prompt}</p>
        <button
          onClick={() => onPrompt(prompt)}
          className="press mt-2.5 inline-flex min-h-[44px] items-center gap-1.5 bg-writer-deep text-white text-xs font-bold rounded-full px-3.5 py-2"
        >
          <PenLine className="h-3.5 w-3.5" /> Jawab prompt ini
        </button>
      </div>
      <button
        onClick={onBlank}
        className="press link-draw mt-3 text-xs font-bold text-muted-foreground hover:text-foreground min-h-[44px]"
      >
        atau mulai dari halaman kosong
      </button>
    </div>
  );
}

export default function JournalScreen() {
  const setPage = useRutinaStore((s) => s.setPage);
  const openJournalSheet = useRutinaStore((s) => s.openJournalSheet);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({ queryKey: ["journal"], queryFn: rutinaApi.journal });
  const entries: JournalEntry[] = React.useMemo(() => data?.entries ?? [], [data]);

  // ===== Filter & pencarian (debounce) =====
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const [folder, setFolder] = React.useState("Semua");
  const [moodFilter, setMoodFilter] = React.useState<string | null>(null);
  const [pinnedOnly, setPinnedOnly] = React.useState(false);

  const filtered = React.useMemo(
    () =>
      entries.filter((e) => {
        if (pinnedOnly && !e.pinned) return false;
        if (folder !== "Semua" && e.folder !== folder) return false;
        if (moodFilter && e.mood !== moodFilter) return false;
        if (debounced) {
          const hay = `${e.title} ${e.content}`.toLowerCase();
          if (!hay.includes(debounced)) return false;
        }
        return true;
      }),
    [entries, debounced, folder, moodFilter, pinnedOnly]
  );

  // ux-guidelines #84 & #115 (progressive disclosure): daftar catatan dibatasi
  // 10 entri + tombol "Muat semua"; reset ke preview setiap filter berubah.
  const [visibleCount, setVisibleCount] = React.useState(10);
  React.useEffect(() => {
    setVisibleCount(10);
  }, [debounced, folder, moodFilter, pinnedOnly]);

  // ===== Statistik menulis =====
  // Statistik turunan berat (map kalender, sort, dll.) dibungkus useMemo agar
  // tidak dihitung ulang setiap ketikan pada kolom pencarian.
  const today = todayStr();
  const {
    dayOf,
    wordsThisWeek,
    entriesThisMonth,
    totalWords,
    avgWords,
    first,
    monthDays,
    leadingBlanks,
    countByDay,
    wordsByDay,
    maxDayWords,
    weeklyWords,
    weekDelta,
    entriesWeekly,
    dailyWords30,
    words30,
    lastEntry,
    folderCounts,
    maxFolder,
    moodCounts,
    maxMood,
  } = React.useMemo(() => {
    // audit D-M7: bucketing timestamp → tanggal WIB (bukan zona perangkat).
    // toDateStr(new Date(iso)) memakai zona lokal; perangkat di UTC+8 dekat
    // tengah malam WIB menaruh entri di tanggal yang salah (kalender jurnal
    // vs statistik vs server berbeda hari). jakartaDateStr selaras dengan
    // /api/stats yang sudah memakai helper ini.
    const dayOf = (iso: string) => jakartaDateStr(new Date(iso));
    const ws = weekStart(today);
    const ms = startOfMonth(today);
    const wordsThisWeek = entries.filter((e) => dayOf(e.createdAt) >= ws).reduce((a, e) => a + e.wordCount, 0);
    const entriesThisMonth = entries.filter((e) => dayOf(e.createdAt) >= ms).length;
    const totalWords = entries.reduce((a, e) => a + e.wordCount, 0);
    const avgWords = entries.length ? Math.round(totalWords / entries.length) : 0;

    // ===== Kalender menulis bulan berjalan =====
    const first = parseDateStr(ms);
    const dim = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const monthDays = rangeDays(ms, toDateStr(new Date(first.getFullYear(), first.getMonth(), dim)));
    const leadingBlanks = (first.getDay() + 6) % 7; // Senin mulai
    const countByDay = new Map<string, number>();
    for (const e of entries) {
      const d = dayOf(e.createdAt);
      if (d >= ms) countByDay.set(d, (countByDay.get(d) ?? 0) + 1);
    }

    // Intensitas kalender = jumlah kata per hari bulan ini
    const wordsByDay = new Map<string, number>();
    for (const e of entries) {
      const d = dayOf(e.createdAt);
      if (d >= ms) wordsByDay.set(d, (wordsByDay.get(d) ?? 0) + e.wordCount);
    }
    const maxDayWords = Math.max(1, ...monthDays.map((d) => wordsByDay.get(d) ?? 0));

    // ===== Kata per pekan (6 pekan terakhir) =====
    const weeklyWords: { label: string; value: number }[] = [];
    for (let w = 5; w >= 0; w--) {
      const start = weekStart(addDays(today, -7 * w));
      const end = addDays(start, 6);
      const words = entries
        .filter((e) => {
          const d = dayOf(e.createdAt);
          return d >= start && d <= end;
        })
        .reduce((a, e) => a + e.wordCount, 0);
      weeklyWords.push({ label: w === 0 ? "Ini" : formatDayMonth(start), value: words });
    }
    const weekDelta = weeklyWords[weeklyWords.length - 1].value - weeklyWords[weeklyWords.length - 2].value;

    // Entri per pekan (4 pekan terakhir) — mini bar di tile "Bulan ini"
    const entriesWeekly: { label: string; value: number }[] = [];
    for (let w = 3; w >= 0; w--) {
      const start = weekStart(addDays(today, -7 * w));
      const end = addDays(start, 6);
      const count = entries.filter((e) => {
        const d = dayOf(e.createdAt);
        return d >= start && d <= end;
      }).length;
      entriesWeekly.push({ label: w === 0 ? "Ini" : formatDayMonth(start), value: count });
    }

    // ===== Tren kata 30 hari terakhir =====
    const byDay30 = new Map<string, number>();
    for (const e of entries) {
      const d = dayOf(e.createdAt);
      byDay30.set(d, (byDay30.get(d) ?? 0) + e.wordCount);
    }
    const dailyWords30 = rangeDays(addDays(today, -29), today).map((d) => byDay30.get(d) ?? 0);
    const words30 = dailyWords30.reduce((a, b) => a + b, 0);

    // ===== Draf terakhir (semangat "lanjutkan menulis" dari Beranda) =====
    const lastEntry =
      entries.length > 0
        ? [...entries].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
        : null;

    // ===== Distribusi =====
    const folderCounts = FOLDERS.map((f) => ({ folder: f, count: entries.filter((e) => e.folder === f).length }));
    const maxFolder = Math.max(1, ...folderCounts.map((f) => f.count));
    const moodCounts = JOURNAL_MOODS.map((m) => ({
      ...m,
      count: entries.filter((e) => e.mood === m.key).length,
    }));
    const maxMood = Math.max(1, ...moodCounts.map((m) => m.count));

    return {
      dayOf,
      wordsThisWeek,
      entriesThisMonth,
      totalWords,
      avgWords,
      first,
      monthDays,
      leadingBlanks,
      countByDay,
      wordsByDay,
      maxDayWords,
      weeklyWords,
      weekDelta,
      entriesWeekly,
      dailyWords30,
      words30,
      lastEntry,
      folderCounts,
      maxFolder,
      moodCounts,
      maxMood,
    };
    // today ikut jadi dependensi supaya pergantian hari tetap dihitung benar
  }, [entries, today]);

  const [activeEntry, setActiveEntry] = React.useState<JournalEntry | null>(null);

  // Gagal muat saat pertama (tanpa cache) → gate layar penuh, BUKAN statistik
  // nol yang membaca seperti arsip hilang (pola sama dengan layar Statistik).
  if (isError && !data) {
    return (
      <div className="flex flex-col min-h-full">
        <ScreenHeader
          title="Jurnal"
          subtitle="Refleksi & arsip tulisanmu"
          tone="writer"
          onBack={() => setPage("home")}
        />
        <div className="p-4">
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 flex flex-col items-center text-center gap-2.5">
            <span className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertTriangle className="h-6 w-6" />
            </span>
            <p className="text-sm font-bold">Gagal memuat catatan</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Arsip jurnal tidak dapat diambil. Periksa koneksi internetmu, lalu coba lagi.
            </p>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="press mt-1.5 min-h-[44px] rounded-xl bg-writer-deep px-5 text-sm font-bold text-white flex items-center gap-2 disabled:opacity-60"
            >
              {isFetching && <Loader2 className="h-4 w-4 animate-spin" />}
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <ScreenHeader
        title="Jurnal"
        subtitle="Refleksi & arsip tulisanmu"
        tone="writer"
        onBack={() => setPage("home")}
      />

      <div className="p-4 space-y-4">
        {/* ===== Pencarian & filter ===== */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul atau isi catatan"
              aria-label="Cari catatan"
              className="pl-10 bg-card h-11"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5">
            {["Semua", ...FOLDERS].map((f) => (
              <button
                key={f}
                onClick={() => setFolder(f)}
                aria-pressed={folder === f}
                className={cn(
                  "press shrink-0 rounded-full px-4 min-h-[44px] text-xs font-bold border transition-colors",
                  folder === f
                    ? "bg-writer-deep text-white border-writer-deep"
                    : "bg-card text-muted-foreground border-border/70"
                )}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {JOURNAL_MOODS.map((m) => {
              const Icon = m.icon as LucideIcon;
              const active = moodFilter === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => setMoodFilter(active ? null : m.key)}
                  aria-pressed={active}
                  aria-label={`Filter mood ${m.label}`}
                  className={cn(
                    "press h-11 w-11 rounded-full flex items-center justify-center border transition-colors",
                    active
                      ? "bg-writer-soft border-writer/40 text-writer-deep"
                      : "bg-card border-border/60 text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
            <button
              onClick={() => setPinnedOnly(!pinnedOnly)}
              aria-pressed={pinnedOnly}
              className={cn(
                "press inline-flex items-center gap-1.5 rounded-full px-4 min-h-[44px] text-xs font-bold border transition-colors ml-auto",
                pinnedOnly
                  ? "bg-gold-soft border-gold/40 text-gold"
                  : "bg-card text-muted-foreground border-border/70"
              )}
            >
              <Pin className="h-3.5 w-3.5" />
              Disematkan
            </button>
          </div>
        </div>

        {/* ===== Lanjutkan draf terakhir ===== */}
        {lastEntry && (
          <button
            onClick={() => setActiveEntry(lastEntry)}
            className="press w-full text-left rounded-xl border border-writer/30 bg-writer-soft p-4 flex items-center gap-3 shadow-soft"
          >
            <span className="h-10 w-10 rounded-xl bg-card text-writer-deep flex items-center justify-center shrink-0">
              <PenLine className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold uppercase tracking-widest text-writer-deep">
                Lanjutkan Menulis
              </span>
              <span className="block text-sm font-bold leading-tight truncate mt-0.5">
                {lastEntry.title || "Tanpa judul"}
              </span>
              <span className="block text-xs text-muted-foreground truncate mt-0.5">
                {relativeDate(dayOf(lastEntry.updatedAt))} · {lastEntry.wordCount} kata · {lastEntry.folder}
              </span>
            </span>
            <NotebookText className="h-4 w-4 text-writer-deep shrink-0" />
          </button>
        )}

        {/* ===== Statistik menulis ringkas ===== */}
        <div className="grid grid-cols-3 gap-2.5">
          <StatTile
            label="Pekan ini"
            value={formatNumber(wordsThisWeek)}
            sub="kata ditulis"
            tone="writer"
            icon={<PenLine className="h-3.5 w-3.5" />}
            chart={
              <MiniBars
                data={weeklyWords.slice(-4).map((w) => ({ label: w.label, value: w.value }))}
                height={22}
                showLabels={false}
                highlightIndex={3}
              />
            }
          />
          <StatTile
            label="Bulan ini"
            value={formatNumber(entriesThisMonth)}
            sub="entri baru"
            tone="writer"
            icon={<CalendarDays className="h-3.5 w-3.5" />}
            chart={
              <MiniBars
                data={entriesWeekly.map((w) => ({ label: w.label, value: w.value }))}
                height={22}
                showLabels={false}
                highlightIndex={3}
              />
            }
          />
          <StatTile
            label="Rata-rata"
            value={formatNumber(avgWords)}
            sub="kata / entri"
            tone="writer"
            icon={<AlignLeft className="h-3.5 w-3.5" />}
            chart={
              dailyWords30.length >= 2 ? (
                <Sparkline data={dailyWords30.slice(-14)} height={22} strokeWidth={1.8} showDot={false} />
              ) : undefined
            }
          />
        </div>

        {/* ===== Total arsip & tren kata ===== */}
        <SectionCard
          title="Arsip Penulisan"
          tone="writer"
          icon={<NotebookText className="h-4 w-4 text-writer-deep" />}
        >
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-writer-soft px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-writer-deep">Total Catatan</p>
              <p className="text-2xl font-extrabold tabular text-foreground mt-0.5">{formatNumber(entries.length)}</p>
              <p className="text-xs text-muted-foreground">entri terarsip</p>
            </div>
            <div className="rounded-xl bg-writer-soft px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-writer-deep">Total Kata</p>
              <p className="text-2xl font-extrabold tabular text-foreground mt-0.5">{formatNumber(totalWords)}</p>
              <p className="text-xs text-muted-foreground">semua catatanmu</p>
            </div>
          </div>
          {entries.length > 0 && (
            <div className="mt-3">
              <div className="flex items-baseline justify-between mb-1">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Tren kata · 30 hari terakhir
                </p>
                <span className="text-xs font-bold tabular text-writer-deep">{formatNumber(words30)} kata</span>
              </div>
              <Sparkline data={dailyWords30} height={44} />
            </div>
          )}
        </SectionCard>

        {/* ===== Kalender menulis ===== */}
        <SectionCard
          title="Ritme Menulis"
          tone="writer"
          icon={<CalendarDays className="h-4 w-4 text-writer-deep" />}
          action={
            <span className="text-xs text-muted-foreground font-semibold">
              {monthName(first.getMonth(), true)} {first.getFullYear()}
            </span>
          }
        >
          <p className="text-xs text-muted-foreground mb-2">Intensitas hijau = jumlah kata yang ditulis hari itu</p>
          <div className="grid grid-cols-7 gap-1 text-center">
            {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
              <span key={d} className="text-xs font-bold text-muted-foreground pb-1">
                {d}
              </span>
            ))}
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {monthDays.map((d) => {
              const count = countByDay.get(d) ?? 0;
              const words = wordsByDay.get(d) ?? 0;
              const t = Math.max(0, Math.min(1, words / maxDayWords));
              const isToday = d === today;
              return (
                <div
                  key={d}
                  role="img"
                  title={`${formatDateID(d, true)}${
                    count > 0 ? ` · ${count} entri · ${formatNumber(words)} kata` : " · belum menulis"
                  }`}
                  aria-label={`${formatDateID(d, true)}${
                    count > 0 ? ` · ${count} entri · ${formatNumber(words)} kata` : " · belum menulis"
                  }`}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg py-1.5 min-h-[40px] tabular",
                    count > 0 ? "text-writer-deep font-bold" : "text-muted-foreground"
                  )}
                  style={{
                    background:
                      words > 0
                        ? `color-mix(in srgb, var(--chart-2) ${Math.round(22 + 42 * t)}%, var(--card))`
                        : "var(--secondary)",
                  }}
                >
                  <span className="text-xs font-semibold leading-none">{d.slice(8)}</span>
                  {count > 0 && <span className="text-xs leading-none mt-0.5">{count}</span>}
                  {isToday && <span className="h-1 w-1 rounded-full bg-sage-deep mt-1" />}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-end gap-1.5" aria-hidden="true">
            <span className="text-xs text-muted-foreground">Sepi</span>
            {[0.15, 0.45, 0.7, 1].map((t) => (
              <span
                key={t}
                className="h-2.5 w-2.5 rounded-[3px]"
                style={{ background: `color-mix(in srgb, var(--chart-2) ${Math.round(22 + 42 * t)}%, var(--card))` }}
              />
            ))}
            <span className="text-xs text-muted-foreground">Rajin</span>
          </div>
        </SectionCard>

        {/* ===== Kata per pekan ===== */}
        <SectionCard
          title="Kata per Pekan"
          tone="writer"
          icon={<PenLine className="h-4 w-4 text-writer-deep" />}
          action={<DeltaBadge delta={weekDelta} suffix=" kata" />}
        >
          <MiniBars data={weeklyWords} height={88} labelEvery={1} highlightIndex={weeklyWords.length - 1} />
          <p className="text-xs text-muted-foreground mt-2">6 pekan terakhir · batang pekat = pekan berjalan</p>
        </SectionCard>

        {/* ===== Distribusi folder & mood ===== */}
        <SectionCard title="Pola Penulisan" tone="writer" icon={<FolderOpen className="h-4 w-4 text-writer-deep" />}>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Folder</p>
          <div className="space-y-2">
            {folderCounts.map((f) => (
              <div key={f.folder} className="flex items-center gap-2">
                <span className="text-xs font-semibold w-20 shrink-0">{f.folder}</span>
                {/* motion rule (ux #13): transform bukan layout — wrapper statis + scaleX */}
                <div className="flex-1 h-2.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full w-full rounded-full bg-writer-deep/80 origin-left transition-transform duration-300"
                    style={{ transform: `scaleX(${maxFolder > 0 ? f.count / maxFolder : 0})` }}
                  />
                </div>
                <span className="text-xs font-bold tabular text-muted-foreground w-6 text-right">{f.count}</span>
              </div>
            ))}
          </div>

          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mt-4 mb-2">Mood saat menulis</p>
          <HBarList
            items={moodCounts.map((m, i) => ({
              label: m.label,
              value: m.count,
              max: maxMood,
              color: rampColor(i, moodCounts.length),
              caption: `${m.count} entri`,
            }))}
            height={8}
          />
        </SectionCard>

        {/* ===== Daftar catatan ===== */}
        <SectionCard
          title={`Catatan (${filtered.length})`}
          tone="writer"
          icon={<NotebookText className="h-4 w-4 text-writer-deep" />}
        >
          {isError ? (
            <EmptyState
              icon={<AlertTriangle className="h-6 w-6" />}
              title="Gagal memuat catatan"
              description="Server tidak bisa dijangkau saat ini. Periksa koneksi internetmu, lalu coba lagi."
              action={
                <button
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="press bg-writer-deep text-white text-sm font-bold rounded-xl px-4 min-h-[44px] inline-flex items-center justify-center gap-2"
                >
                  {isFetching && <Loader2 className="h-4 w-4 animate-spin" />}
                  Coba Lagi
                </button>
              }
            />
          ) : isLoading ? (
            <div className="space-y-3">
              {/* motion.csv #15: skeleton-shimmer menggantikan pulse lama */}
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-secondary/70 h-24 skeleton-shimmer" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            entries.length === 0 ? (
              <JournalFirstPage
                onBlank={() => openJournalSheet()}
                onPrompt={(prompt) => openJournalSheet({ content: `${prompt}\n\n`, folder: "Refleksi" })}
              />
            ) : (
              <EmptyState
                icon={<NotebookText className="h-6 w-6" />}
                title="Tidak ada catatan yang cocok"
                description="Coba ubah kata kunci atau filter folder dan mood."
                action={
                  <button
                    onClick={() => {
                      setSearch("");
                      setFolder("Semua");
                      setMoodFilter(null);
                      setPinnedOnly(false);
                    }}
                    className="press bg-writer-deep text-white text-sm font-bold rounded-xl px-4 py-2.5 min-h-[44px] inline-flex items-center justify-center"
                  >
                    Hapus semua filter
                  </button>
                }
              />
            )
          ) : (
            <div id="jurnal-list" className="space-y-2.5">
              {filtered.slice(0, visibleCount).map((e) => {
                const moodMeta = e.mood ? JOURNAL_MOODS.find((m) => m.key === e.mood) : null;
                const MoodIcon = moodMeta?.icon as LucideIcon | undefined;
                return (
                  <button
                    key={e.id}
                    onClick={() => setActiveEntry(e)}
                    className="press w-full text-left rounded-xl border border-border/70 bg-card p-4 space-y-2 shadow-soft [content-visibility:auto] [contain-intrinsic-size:auto_112px]"
                  >
                    <div className="flex items-start gap-2">
                      {e.pinned && <Pin className="h-4 w-4 text-writer-deep shrink-0 mt-0.5 fill-writer-soft" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold leading-tight truncate">{e.title || "Tanpa judul"}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">{e.content}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Pill tone={FOLDER_TONE[e.folder] ?? "stone"}>{e.folder}</Pill>
                      {MoodIcon && moodMeta && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                          <MoodIcon className="h-3.5 w-3.5 text-writer" />
                          {moodMeta.label}
                        </span>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground tabular">
                        {relativeDate(dayOf(e.updatedAt))} · {e.wordCount} kata
                      </span>
                    </div>
                  </button>
                );
              })}
              {/* ux-guidelines #84 & #115: disclosure hanya saat ada entri tersembunyi (>10) */}
              {filtered.length > 10 && (
                <ShowAllToggle
                  labelAll="Muat semua"
                  total={filtered.length}
                  visibleCount={visibleCount}
                  expanded={visibleCount >= filtered.length}
                  onToggle={() => setVisibleCount(visibleCount >= filtered.length ? 10 : filtered.length)}
                  controlsId="jurnal-list"
                />
              )}
            </div>
          )}
        </SectionCard>

        {/* FAB tulis */}
        <div className="sticky bottom-3 flex justify-end z-20">
          <button
            onClick={() => openJournalSheet()}
            aria-label="Tulis catatan baru"
            className="press h-14 w-14 rounded-full bg-writer-deep text-white shadow-lift flex items-center justify-center"
          >
            <PenLine className="h-6 w-6" />
          </button>
        </div>
      </div>

      <EntrySheet entry={activeEntry} onClose={() => setActiveEntry(null)} />
    </div>
  );
}

// ============ Sheet baca/edit entri ============

function EntrySheet({ entry, onClose }: { entry: JournalEntry | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [folder, setFolder] = React.useState("Umum");
  const [mood, setMood] = React.useState<string | null>(null);
  const [pinned, setPinned] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [confirmDiscard, setConfirmDiscard] = React.useState(false);

  React.useEffect(() => {
    if (entry) {
      setTitle(entry.title);
      setContent(entry.content);
      setFolder(entry.folder);
      setMood(entry.mood);
      setPinned(entry.pinned);
      setConfirmDelete(false);
      setConfirmDiscard(false);
    }
  }, [entry]);

  // Ada edit yang belum disimpan? Bandingkan state lokal dengan entri aslinya.
  const dirty =
    !!entry &&
    (title !== entry.title ||
      content !== entry.content ||
      folder !== entry.folder ||
      mood !== entry.mood ||
      pinned !== entry.pinned);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["journal"] });
    qc.invalidateQueries({ queryKey: ["home"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      rutinaApi.updateJournal(entry!.id, {
        title: title.trim(),
        content: content.trim(),
        folder,
        mood,
        pinned,
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Perubahan disimpan");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => rutinaApi.deleteJournal(entry!.id),
    onSuccess: () => {
      invalidate();
      toast.success("Catatan dihapus");
      setConfirmDelete(false);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSave = !!entry && content.trim().length > 0 && !saveMutation.isPending;

  return (
    <>
      <Drawer
        open={!!entry}
        onOpenChange={(o) => {
          if (!o) {
            // Jangan buang edit yang belum disimpan begitu saja — konfirmasi dulu.
            if (dirty && !saveMutation.isPending) {
              setConfirmDiscard(true);
              return;
            }
            onClose();
          }
        }}
      >
        <DrawerContent className="max-h-[92dvh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-writer-deep">Baca & Edit Catatan</DrawerTitle>
            {entry && (
              <p className="text-xs text-muted-foreground">
                Terakhir diperbarui {relativeDate(jakartaDateStr(new Date(entry.updatedAt)))}
              </p>
            )}
          </DrawerHeader>

          <div className="px-4 pb-6 space-y-4 overflow-y-auto scroll-thin">
            <div className="space-y-1.5">
              <label htmlFor="edit-title" className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Judul
              </label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="edit-content" className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Isi catatan
              </label>
              <Textarea
                id="edit-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-40 resize-none"
              />
              <p className="text-xs text-muted-foreground tabular text-right">
                {content.trim() ? content.trim().split(/\s+/).length : 0} kata
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Folder</p>
              <Select value={folder} onValueChange={setFolder}>
                <SelectTrigger className="w-full min-h-[44px]" aria-label="Pilih folder catatan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOLDERS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Mood</p>
              <div className="grid grid-cols-5 gap-2">
                {JOURNAL_MOODS.map((m) => {
                  const Icon = m.icon as LucideIcon;
                  const active = mood === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setMood(active ? null : m.key)}
                      aria-pressed={active}
                      aria-label={`Mood ${m.label}`}
                      className={cn(
                        "press flex flex-col items-center justify-center gap-1 rounded-xl border py-3 min-h-[64px]",
                        active
                          ? "bg-writer-soft border-writer/40 text-writer-deep"
                          : "bg-secondary border-border/60 text-muted-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-semibold leading-none">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Pin className="h-4 w-4 text-writer-deep" />
                Sematkan di atas
              </div>
              <Switch checked={pinned} onCheckedChange={setPinned} aria-label="Sematkan catatan" />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={!canSave}
                className="press flex-1 min-h-[48px] rounded-xl bg-writer-deep text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                aria-label="Hapus catatan"
                className="press h-12 min-h-[48px] w-14 rounded-xl border border-destructive/40 text-destructive flex items-center justify-center"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus catatan ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Catatan &ldquo;{entry?.title || "Tanpa judul"}&rdquo; akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="press min-h-[44px] flex-1 sm:flex-none">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // preventDefault: dialog tetap terbuka selama proses hapus (spinner terlihat),
                // ditutup lewat onClose() di onSuccess mutation.
                e.preventDefault();
                deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
              className="press min-h-[44px] flex-1 sm:flex-none bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menghapus…
                </>
              ) : (
                "Hapus"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Buang perubahan?</AlertDialogTitle>
            <AlertDialogDescription>Perubahan yang belum disimpan akan hilang.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="press min-h-[44px] flex-1 sm:flex-none">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDiscard(false);
                onClose();
              }}
              className="press min-h-[44px] flex-1 sm:flex-none bg-destructive text-white hover:bg-destructive/90"
            >
              Buang
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
