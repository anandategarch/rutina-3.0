"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Flame,
  Target,
  Check,
  Plus,
  ArchiveRestore,
  NotebookText,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Quote as QuoteIcon,
  BookmarkPlus,
  Wallet,
  PartyPopper,
  CircleCheck,
  Share2,
  MoonStar,
  BadgeCheck,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useRutinaStore } from "@/store/rutina";
import { rutinaApi } from "@/lib/rutina/api";
import {
  greeting,
  formatDateID,
  dayName,
  addDays,
  todayStr,
  formatRupiah,
  parseDateStr,
  weekStart,
} from "@/lib/rutina/format";
import { SectionCard, Pill, EmptyState, ShowAllToggle } from "@/components/rutina/primitives";
import { LoadErrorState } from "@/components/rutina/load-error-state";
import { invalidateAfterMutation } from "@/lib/rutina/queries";
import { IlloSproutMission } from "@/components/rutina/illustrations";
import { habitIcon, habitColor } from "@/components/rutina/habit-icons";
import {
  CLAY,
  DeltaBadge,
  HeatGrid,
  MetricBar,
  MiniBars,
  NEUTRAL,
  RingStat,
  SAGE,
  SAGE_DEEP,
  Sparkline,
} from "@/components/rutina/charts";
import type { HomePayload, Habit } from "@/types/rutina";
import { cn } from "@/lib/utils";

const HIGHLIGHT_ICON: Record<string, React.ElementType> = {
  flame: Flame,
  wallet: Wallet,
  "piggy-bank": Wallet,
  "party-popper": PartyPopper,
};

// Sumber kebenaran XP ada di server (levelFromXp): 1 level = 500 XP.
const XP_PER_LEVEL = 500;

// Progressive disclosure agenda (ux-guidelines #84, #115): preview daftar
// dibatasi maks 6 item (maks 3 per kelompok waktu); sisanya via tombol
// "Lihat semua (X)" — mission ring & hitungan selesai tetap pakai data penuh.
const AGENDA_PREVIEW_TOTAL = 6;
const AGENDA_PREVIEW_PER_GROUP = 3;

export default function HomeScreen() {
  const qc = useQueryClient();
  const setQuickAction = useRutinaStore((s) => s.setQuickAction);
  const setPage = useRutinaStore((s) => s.setPage);
  const openTransactionSheet = useRutinaStore((s) => s.openTransactionSheet);
  const openJournalSheet = useRutinaStore((s) => s.openJournalSheet);
  const [selectedDate, setSelectedDate] = React.useState(todayStr());

  // ux-guidelines #84 & #115 (progressive disclosure): kembalikan agenda ke
  // mode preview setiap tanggal berganti, agar daftar tak meledak jadi 20 baris.
  const [showAllAgenda, setShowAllAgenda] = React.useState(false);
  React.useEffect(() => {
    setShowAllAgenda(false);
  }, [selectedDate]);

  const { data, isLoading, isError, error: homeError, refetch } = useQuery({
    // audit B2-H2: tanggal terpilih masuk query key — ganti tanggal = refetch beranda
    queryKey: ["home", selectedDate],
    queryFn: () => rutinaApi.home(selectedDate),
  });

  // Data pendukung visual (cache dibagikan dengan layar Statistik/Keuangan)
  const statsQuery = useQuery({ queryKey: ["stats"], queryFn: rutinaApi.stats });
  const budgetsQuery = useQuery({ queryKey: ["budgets"], queryFn: rutinaApi.budgets });
  const goalsQuery = useQuery({ queryKey: ["goals"], queryFn: rutinaApi.goals });

  const checkMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value?: number }) =>
      rutinaApi.checkHabit(id, selectedDate, value),
    onMutate: async ({ id, value }) => {
      await qc.cancelQueries({ queryKey: ["home", selectedDate] });
      const prev = qc.getQueryData<HomePayload>(["home", selectedDate]);
      // Optimistic: toggle log pada tanggal yang dipilih di payload home
      qc.setQueryData<HomePayload>(["home", selectedDate], (old) => {
        if (!old) return old;
        return {
          ...old,
          agenda: old.agenda.map((a) => {
            if (a.habit.id !== id) return a;
            const logs = [...(a.habit.logs ?? [])];
            const idx = logs.findIndex((l) => l.date === selectedDate);
            if (idx >= 0) {
              const existing = logs[idx];
              if (
                a.habit.unitTarget !== null &&
                typeof value === "number" &&
                value > 0 &&
                (existing.value ?? 0) < value
              ) {
                logs[idx] = { ...existing, value, status: "done", note: null };
              } else {
                logs.splice(idx, 1);
              }
            } else {
              const nextValue =
                a.habit.unitTarget !== null
                  ? typeof value === "number" && value > 0
                    ? value
                    : a.habit.unitTarget
                  : null;
              logs.push({
                id: `optimistic-${a.habit.id}`,
                habitId: a.habit.id,
                date: selectedDate,
                status: "done",
                value: nextValue,
                note: null,
              });
            }
            const dayLog = logs.find((l) => l.date === selectedDate) ?? null;
            return {
              ...a,
              habit: { ...a.habit, logs },
              // field `log` bawaan payload hanya berlaku untuk hari ini
              log: selectedDate === old.today ? dayLog : a.log,
            };
          }),
        };
      });
      return { prev };
    },
    onError: (e: Error, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["home", selectedDate], ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["home"] });
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  const saveQuoteMutation = useMutation({
    mutationFn: (payload: { text: string; author: string }) =>
      rutinaApi.createJournal({
        title: "Kutipan hari ini",
        content: `"${payload.text}" — ${payload.author}`,
        folder: "Sorotan",
        mood: null,
      }),
    onSuccess: () => {
      // audit D-M3: entri jurnal baru menambah XP +15 dan menandai refleksi
      // selesai di Tutup Hari — home & stats wajib segar (invarian
      // invalidateAfterMutation: selalu home + stats + kunci modul).
      invalidateAfterMutation(qc, ["journal"]);
      toast.success("Kutipan disimpan ke Jurnal");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ===== Data visual turunan (read-only, tidak mengubah perilaku) =====
  // Di-memo-kan agar peta/sort hanya dihitung ulang saat payload/query berubah.
  // Diletakkan sebelum early-return supaya urutan hook tetap konsisten di semua cabang render.
  const {
    stripDays,
    xpToNextLevel,
    activityByDate,
    streakSpark,
    weekBars,
    todayBarIdx,
    workoutDelta,
    saldoSpark,
    cashflowBars,
    cashflowTodayIdx,
    topBudget,
    topGoals,
  } = React.useMemo(() => {
    const dd = data as HomePayload | undefined;
    // rolling 7 hari berakhir hari ini
    const stripDays: string[] = dd ? Array.from({ length: 7 }, (_, i) => addDays(dd.today, i - 6)) : [];
    const activityByDate = new Map(
      (statsQuery.data?.activityCalendar ?? []).map((a) => [a.date, a.habitsDone])
    );
    const streakSpark = stripDays.map((ds) => activityByDate.get(ds) ?? 0);
    const monday = dd ? weekStart(dd.today) : null;
    const weekDates: string[] = monday ? Array.from({ length: 7 }, (_, i) => addDays(monday, i)) : [];
    const weekBars = weekDates.map((ds) => ({
      label: dayName(ds, true),
      value: activityByDate.get(ds) ?? 0,
      alt: activityByDate.get(addDays(ds, -7)) ?? 0,
    }));
    const todayBarIdx = dd ? weekDates.indexOf(dd.today) : -1;
    const weeklyWorkouts = statsQuery.data?.fitness.weeklyWorkouts ?? [];
    const workoutDelta =
      weeklyWorkouts.length >= 2
        ? weeklyWorkouts[weeklyWorkouts.length - 1].sessions - weeklyWorkouts[weeklyWorkouts.length - 2].sessions
        : null;
    // Sparkline mini tile Saldo: pengeluaran harian 14 hari (data stats sudah di-fetch,
    // field dailyExpenseHeat sebelumnya tidak pernah dirender)
    const saldoSpark = (statsQuery.data?.finance.dailyExpenseHeat ?? []).slice(-14).map((x) => x.amount);
    // Grafik arus kas 7 hari (field weekCashflow dari payload home — kini divisualkan)
    const cashflowBars = (data?.weekCashflow ?? []).map((c) => ({
      label: dayName(c.date, true),
      value: c.expense,
      alt: c.income,
    }));
    const cashflowTodayIdx = (data?.weekCashflow ?? []).findIndex((c) => c.date === data?.today);
    return {
      stripDays,
      xpToNextLevel: XP_PER_LEVEL - ((dd?.xp ?? 0) % XP_PER_LEVEL),
      activityByDate,
      streakSpark,
      weekBars,
      todayBarIdx,
      workoutDelta,
      saldoSpark,
      cashflowBars,
      cashflowTodayIdx,
      topBudget: [...(budgetsQuery.data?.budgets ?? [])]
        .filter((b) => b.monthlyLimit > 0)
        .sort((a, b) => (b.spent ?? 0) / b.monthlyLimit - (a.spent ?? 0) / a.monthlyLimit)[0],
      topGoals: [...(goalsQuery.data?.goals ?? [])]
        .filter((g) => g.targetAmount > 0)
        .sort((a, b) => b.currentAmount / b.targetAmount - a.currentAmount / a.targetAmount)
        .slice(0, 3),
    };
    // selectedDate tidak dibaca blok ini (rolling 7 hari memakai dd.today
    // dari payload), jadi tidak masuk deps — hitungan kalender mengikuti data.
  }, [data, statsQuery.data, budgetsQuery.data, goalsQuery.data]);

  if (isError && !data) {
    return (
      <div className="px-4 pt-[max(4rem,env(safe-area-inset-top))]">
        <LoadErrorState
          onRetry={() => refetch()}
          error={homeError}
          tone="garden"
        />
      </div>
    );
  }

  if (isLoading || !data) {
    return <HomeSkeleton />;
  }

  const d = data as HomePayload;
  const profile = d.profile;
  const agenda = d.agenda.filter(
    (a) =>
      a.habit.scheduleType === "daily" ||
      a.habit.daysOfWeek.split(",").map(Number).includes(parseDateStr(selectedDate).getDay())
  );
  const agendaForSelected = agenda;
  // Log milik tanggal terpilih (payload server hanya menyertakan `log` untuk hari ini)
  const dayLogOf = (a: (typeof agenda)[number]) =>
    a.habit.logs?.find((l) => l.date === selectedDate) ?? null;
  const doneForSelected = agendaForSelected.filter((a) => {
    const dayLog = dayLogOf(a);
    return dayLog?.status === "done" || (a.habit.unitTarget && (dayLog?.value ?? 0) >= a.habit.unitTarget);
  }).length;

  const isTodaySelected = selectedDate === d.today;

  const grouped: Record<string, typeof agenda> = { morning: [], afternoon: [], evening: [], anytime: [] };
  agendaForSelected.forEach((a) => grouped[a.habit.timeOfDay]?.push(a));
  const groupLabels: { key: string; label: string }[] = [
    { key: "morning", label: "Pagi" },
    { key: "afternoon", label: "Siang" },
    { key: "evening", label: "Malam" },
    { key: "anytime", label: "Kapan saja" },
  ];

  // Preview daftar untuk render saja (ux-guidelines #84, #115): saat collapsed
  // dibatasi kuota total & per kelompok (urutan Pagi→Siang→Malam→Kapan saja),
  // saat expanded tampilkan semua. `agendaForSelected` & `grouped` penuh tetap
  // dipakai ring misi / done count / server missions.
  let agendaQuota = AGENDA_PREVIEW_TOTAL;
  const agendaPreviewGroups = groupLabels
    .map((g) => {
      const all: typeof agenda = grouped[g.key] ?? [];
      if (showAllAgenda) return { ...g, items: all };
      const take = Math.min(all.length, AGENDA_PREVIEW_PER_GROUP, Math.max(0, agendaQuota));
      agendaQuota -= take;
      return { ...g, items: all.slice(0, take) };
    })
    .filter((group) => group.items.length > 0);

  const HighlightIcon = d.highlight ? HIGHLIGHT_ICON[d.highlight.icon] ?? Flame : Flame;

  // ===== Fitur: Bagikan Rekap Pekan =====
  // Web Share API (mobile) dengan fallback salin ke clipboard — teks ringkas
  // berisi capaian pekan ini vs pekan lalu, tanpa data sensitif penuh.
  const weekRecapText = [
    "Rekap pekan Rutina:",
    `- Misi selesai ${d.weekRecap.missionsDone}/${d.weekRecap.missionsTotal} (pekan lalu ${d.weekRecap.prevDone}/${d.weekRecap.prevTotal})`,
    `- Latihan ${d.weekRecap.workouts} sesi`,
    `- Streak ${d.streak.current} hari · Level ${d.level}`,
    `- Masuk ${formatRupiah(d.weekRecap.income, { compact: true })} · Keluar ${formatRupiah(d.weekRecap.spent, { compact: true })}`,
  ].join("\n");
  const shareRecap = async () => {
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title: "Rekap Rutina", text: weekRecapText });
      } else {
        await navigator.clipboard.writeText(weekRecapText);
        toast.success("Rekap pekan disalin ke clipboard");
      }
    } catch {
      // Pengguna membatalkan share sheet — bukan kondisi error
    }
  };

  return (
    <div className="flex flex-col">
      {/* audit E-F5: refetch latar yang gagal saat cache masih ada tidak boleh
          bisu — beranda bisa menampilkan angka basi tanpa jalan pemulihan. */}
      {isError && data && (
        <div
          className="mx-4 mt-3 flex items-center gap-3 rounded-xl border border-clay/40 bg-clay-soft p-3"
          role="status"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-clay" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-xs font-semibold leading-snug text-clay-deep">
            Beranda mungkin tidak mutakhir — gagal memuat ulang data.
          </p>
          <button
            onClick={() => refetch()}
            className="press min-h-[44px] shrink-0 rounded-lg bg-clay px-3 text-xs font-bold text-white"
          >
            Coba Lagi
          </button>
        </div>
      )}
      {/* ===== Header ===== */}
      {/* Band header memakai tint teal (garden-soft) — disiplin tone:
          gold HANYA untuk streak/XP/piala (docs/DESIGN.md §1a). */}
      {/* pt safe-area: konten tidak tertutup notch/status bar di PWA standalone */}
      <div className="bg-garden-soft/30 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground">{formatDateID(d.today, true)}</p>
            <h1 className="text-2xl font-bold leading-tight mt-0.5">
              {greeting()}, {profile?.name ?? "Sahabat"}
            </h1>
            {profile?.identityVoice && (
              <p className="font-script text-lg text-garden-deep leading-snug mt-1 line-clamp-2">
                “{profile.identityVoice}”
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setPage("journal")}
              aria-label="Buka Jurnal"
              className="press h-11 w-11 rounded-full bg-card border border-border shadow-soft flex items-center justify-center text-writer-deep"
            >
              <NotebookText className="h-5 w-5" />
            </button>
            <button
              onClick={() => setPage("profile")}
              aria-label="Buka Profil"
              className="press h-11 w-11 rounded-full bg-garden text-white shadow-soft flex items-center justify-center font-bold"
            >
              {(profile?.name ?? "S").slice(0, 1).toUpperCase()}
            </button>
          </div>
        </div>

        {/* Progress: papan BENTO GRID (ui-ux-pro-max skill #39 "Bento Box Grid",
            status active) — kartu modular dengan span bervariasi: hero ring
            menempati 1 kolom × 3 baris, streak/level/saldo sebagai tile 1×1.
            Gap 10px, radius rounded-xl (24px), shadow halus, hover scale 1.02. */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {/* Hero tile — 1 kolom × 3 baris (seimbang dengan streak+level+saldo) */}
          <button
            onClick={() => setPage("habits")}
            aria-label="Lihat misi hari ini"
            className="press bento-tile row-span-3 bg-card rounded-xl border border-border/70 shadow-soft p-4 flex flex-col items-center justify-center"
          >
            <RingStat
              progress={agendaForSelected.length ? doneForSelected / agendaForSelected.length : 0}
              value={`${doneForSelected}/${agendaForSelected.length}`}
              caption="misi hari ini"
              size={104}
              stroke={10}
              color="var(--garden)"
            />
          </button>
          {/* Streak — tile 1×1 */}
          <div className="bento-tile bg-card rounded-xl border border-border/70 shadow-soft p-3.5 flex flex-col justify-between gap-2 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-gold-soft flex items-center justify-center shrink-0">
                <Flame className="h-4 w-4 text-gold" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Streak</p>
              {/* Rekor historis tetap terlihat saat streak berjalan sedang 0 — motivasi tanpa menggurui */}
              {d.streak.best > 0 && (
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-gold-deep bg-gold-soft rounded-full px-2 py-0.5 tabular shrink-0">
                  rekor {d.streak.best} hari
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xl font-extrabold tabular leading-none">
                {d.streak.current} <span className="text-xs font-bold text-muted-foreground">hari</span>
              </p>
              {statsQuery.data && (
                <div className="mt-1.5">
                  <Sparkline data={streakSpark} height={22} strokeWidth={2} />
                  <p className="text-[11px] text-muted-foreground mt-0.5">misi per hari · 7 hari</p>
                </div>
              )}
              {statsQuery.isError && (
                <button
                  onClick={() => statsQuery.refetch()}
                  className="press mt-1 inline-flex min-h-[44px] items-center text-left text-xs font-semibold text-muted-foreground underline underline-offset-2"
                >
                  Grafik streak gagal dimuat — ketuk untuk coba lagi
                </button>
              )}
            </div>
          </div>
          {/* Level — tile 1×1 interaktif */}
          <button
            onClick={() => setPage("stats")}
            aria-label="Buka statistik level"
            className="press bento-tile bg-card rounded-xl border border-border/70 shadow-soft p-3.5 text-left flex flex-col justify-between gap-2"
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Level <span className="font-extrabold text-foreground">{d.level}</span>
            </p>
            <div className="min-w-0">
              <p className="text-xl font-extrabold tabular leading-none">
                {d.xp.toLocaleString("id-ID")} <span className="text-xs font-bold text-muted-foreground">XP</span>
              </p>
              <MetricBar value={d.levelProgress * 100} max={100} height={7} className="mt-2" />
              <p className="text-[11px] text-muted-foreground mt-1 tabular">
                <span className="font-bold text-primary">{xpToNextLevel.toLocaleString("id-ID")} XP</span> ke Level{" "}
                {d.level + 1}
              </p>
            </div>
          </button>
          {/* Saldo — tile 1×1 interaktif (intipan lintas modul ke The Vault) */}
          <button
            onClick={() => setPage("finance")}
            aria-label="Buka keuangan"
            className="press bento-tile bg-card rounded-xl border border-border/70 shadow-soft p-3.5 text-left flex flex-col justify-between gap-2"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-vault-soft flex items-center justify-center shrink-0">
                <Wallet className="h-4 w-4 text-vault-deep" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Saldo</p>
            </div>
            <div className="min-w-0">
              <p className="text-lg font-extrabold tabular leading-none truncate">
                {statsQuery.data ? formatRupiah(statsQuery.data.finance.netBalance, { compact: true }) : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 truncate tabular">
                keluar{" "}
                <span className="font-bold text-clay-deep">
                  {statsQuery.data ? formatRupiah(statsQuery.data.finance.expense30d, { compact: true }) : "—"}
                </span>{" "}
                · 30 hari
              </p>
              {statsQuery.data && saldoSpark.length >= 2 && (
                <div className="mt-1.5">
                  <Sparkline data={saldoSpark} height={20} strokeWidth={2} color={CLAY} showDot={false} />
                  <p className="text-[11px] text-muted-foreground mt-0.5">pengeluaran harian · 14 hari</p>
                </div>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* ===== Agenda ===== */}
      {/* Momen dekoratif halaman (satu per halaman, taste-skill): selotip washi
          di puncak kartu — identitas "jurnal fisik" Field Notes. aria-hidden,
          tak mengganggu hierarki & tab order. */}
      <div className="px-4 mt-4 relative">
        <div
          aria-hidden="true"
          className="absolute -top-2.5 left-1/2 -translate-x-1/2 -rotate-2 h-5 w-24 rounded-sm bg-gold-soft/80 border border-border/60 shadow-soft pointer-events-none"
        />
        <SectionCard
          title={isTodaySelected ? "Agenda Hari Ini" : `Agenda ${formatDateID(selectedDate)}`}
          tone="garden"
          icon={<Target className="h-4 w-4 text-garden-deep" />}
          action={
            <button
              onClick={() => setQuickAction("habit")}
              className="press inline-flex min-h-[44px] items-center gap-1 text-xs font-bold text-garden-deep bg-garden-soft rounded-full px-3 py-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Tambah
            </button>
          }
        >
          {agendaForSelected.length === 0 ? (
            <EmptyState
              icon={<Target className="h-6 w-6" />}
              illustration={<IlloSproutMission className="mx-auto" />}
              title="Belum ada misi untuk hari ini"
              description="Tambahkan kebiasaan pertama dan mulai tanam kebiasaan baik."
              action={
                <button
                  onClick={() => setQuickAction("habit")}
                  className="press inline-flex min-h-[44px] items-center justify-center bg-garden-deep text-white text-sm font-bold rounded-xl px-4 py-2.5"
                >
                  Tambah Kebiasaan
                </button>
              }
            />
          ) : (
            <div id="agenda-hari-ini-list" className="space-y-4">
              {agendaPreviewGroups.map((g) => {
                const items = g.items;
                if (!items?.length) return null;
                return (
                  <div key={g.key}>
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                      {g.label}
                    </p>
                    {/* motion rule stagger-rows (ux #7): rise-in tiap baris agenda.
                        Collapsed ≤3 baris per kelompok (kuota 6 total) → di bawah
                        cap 8 anak; baris ke-9+ saat "Lihat semua" render instan
                        (nth-child(n+9)). Baris lama yang tetap ter-mount (key
                        habit.id stabil) tidak mengulang animasi. */}
                    <div className="space-y-2 stagger-rows">
                      {items.map((a) => {
                        const dayLog = dayLogOf(a);
                        return (
                          <AgendaRow
                            key={a.habit.id}
                            habit={a.habit}
                            log={dayLog}
                            isToday={isTodaySelected}
                            checking={checkMutation.isPending && checkMutation.variables?.id === a.habit.id}
                            onCheck={(value) => checkMutation.mutate({ id: a.habit.id, value })}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {/* ux-guidelines #84 & #115: disclosure "+n" — buka sisa agenda / lipat kembali */}
              <ShowAllToggle
                total={agendaForSelected.length}
                visibleCount={showAllAgenda ? agendaForSelected.length : Math.min(agendaForSelected.length, AGENDA_PREVIEW_TOTAL)}
                expanded={showAllAgenda}
                onToggle={() => setShowAllAgenda((v) => !v)}
                controlsId="agenda-hari-ini-list"
              />
              <button
                onClick={() => setPage("habits")}
                className="press w-full min-h-[44px] text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 py-1"
              >
                <ArchiveRestore className="h-3.5 w-3.5" />
                Kelola & pulihkan kebiasaan di Taman
              </button>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ===== Calendar strip ===== */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between gap-1">
          <button
            aria-label="Hari sebelumnya"
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            className="press h-11 w-11 rounded-full bg-card border border-border flex items-center justify-center shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div
            className="flex-1 grid grid-cols-7 gap-1"
            data-audit-tap-exception="chip-kalender-7-kolom"
          >
            {stripDays.map((ds) => {
              const active = ds === selectedDate;
              const isToday = ds === d.today;
              return (
                <button
                  key={ds}
                  onClick={() => setSelectedDate(ds)}
                  className={cn(
                    "press relative w-full flex flex-col items-center py-2 rounded-xl min-h-[52px] justify-center border after:content-[''] after:absolute after:inset-y-0 after:-left-2 after:-right-2",
                    active
                      ? "bg-gold text-white border-gold shadow-soft"
                      : "bg-card border-border/60 text-foreground"
                  )}
                >
                  <span className={cn("text-xs font-semibold", active ? "text-white/95" : "text-muted-foreground")}>
                    {dayName(ds, true)}
                  </span>
                  <span className={cn("text-sm font-bold tabular", isToday && !active && "text-gold")}>
                    {ds.slice(8)}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            aria-label="Hari berikutnya"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            className="press h-11 w-11 rounded-full bg-card border border-border flex items-center justify-center shrink-0"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {statsQuery.data && (
          <div className="mt-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Intensitas misi · 7 hari terakhir
            </p>
            <HeatGrid
              columns={7}
              className="gap-1"
              max={Math.max(1, d.profile?.dailyMissionTarget ?? 4, ...stripDays.map((ds) => activityByDate.get(ds) ?? 0))}
              cells={stripDays.map((ds) => ({
                value: activityByDate.get(ds) ?? 0,
                label: `${formatDateID(ds, true)}: ${activityByDate.get(ds) ?? 0} misi`,
              }))}
            />
          </div>
        )}
      </div>

      {/* ===== Sorotan Hari Ini ===== */}
      {/* motion.csv #4: reveal halus kartu (fade + y 8px — terbaca fade, bukan
          slide); aksen tunggal kartu, durasi 0.3s ease keluar-lembut. */}
      {d.highlight && (
        <motion.div
          className="px-4 mt-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative overflow-hidden rounded-xl bg-gold text-white dark:text-gold-soft p-4 shadow-lift">
            <div className="flex items-start gap-3 relative">
              <span className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <HighlightIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-white/95 dark:text-gold-soft/80">Sorotan Hari Ini</p>
                <p className="font-bold leading-snug mt-0.5">{d.highlight.title}</p>
                <p className="text-xs text-white/95 dark:text-gold-soft/90 mt-1 leading-relaxed">{d.highlight.description}</p>
              </div>
            </div>
            {d.highlight.kind === "budget" && topBudget && (
              <div className="relative mt-3 rounded-xl bg-card p-3 shadow-soft">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    Anggaran {topBudget.category}
                  </span>
                  <span className="text-xs font-bold tabular">
                    {Math.round(((topBudget.spent ?? 0) / topBudget.monthlyLimit) * 100)}%
                  </span>
                </div>
                <MetricBar value={topBudget.spent ?? 0} max={topBudget.monthlyLimit} height={8} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1.5 tabular">
                  {formatRupiah(topBudget.spent ?? 0)} dari {formatRupiah(topBudget.monthlyLimit)} limit bulanan
                </p>
              </div>
            )}
            {d.highlight.kind === "goal" && topGoals.length > 0 && (
              <div className="relative mt-3 rounded-xl bg-card p-3 shadow-soft">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Progres tabungan</p>
                <div className="flex gap-3 mt-2 overflow-x-auto no-scrollbar">
                  {topGoals.map((g) => (
                    <RingStat
                      key={g.id}
                      size={56}
                      stroke={6}
                      progress={g.currentAmount / g.targetAmount}
                      value={`${Math.round((g.currentAmount / g.targetAmount) * 100)}%`}
                      caption={g.name}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ===== Ritual Tutup Hari (Jaga Catatan) ===== */}
      {/* Tiga ketukan sebelum tidur: misi, kas, satu kalimat refleksi. Muncul
          hanya untuk hari ini WIB — ritual hari ini, bukan tanggal lampau. */}
      {d.dayClose && (
        <div className="px-4 mt-4">
          <SectionCard
            title="Tutup Hari"
            tone={d.dayClose.closed ? "gold" : "stone"}
            icon={
              d.dayClose.closed ? (
                <BadgeCheck className="h-4 w-4 text-gold-deep" />
              ) : (
                <MoonStar className="h-4 w-4 text-foreground" />
              )
            }
          >
            <div className="space-y-2">
              <DayCloseRow
                done={d.dayClose.habitsRemaining === 0}
                disabled={d.dayClose.habitsTotal === 0}
                label="Misi harian"
                detail={
                  d.dayClose.habitsTotal === 0
                    ? "Belum ada misi terjadwal"
                    : `${d.dayClose.habitsTotal - d.dayClose.habitsRemaining}/${d.dayClose.habitsTotal} selesai`
                }
                actionLabel="Lanjut"
                onClick={() => setPage("habits")}
              />
              <DayCloseRow
                done={d.dayClose.financeLogged}
                label="Catatan keuangan"
                detail={d.dayClose.financeLogged ? "Kas hari ini tercatat" : "Belum ada satu pun catatan"}
                actionLabel="Catat"
                onClick={() => openTransactionSheet()}
              />
              <DayCloseRow
                done={d.dayClose.journalLogged}
                label="Refleksi jurnal"
                detail={d.dayClose.journalLogged ? "Satu catatan sudah ditulis" : "Satu kalimat pun cukup"}
                actionLabel="Tulis"
                onClick={() =>
                  openJournalSheet({
                    title: `Tutup Hari — ${formatDateID(d.today)}`,
                    folder: "Refleksi",
                  })
                }
              />
            </div>
            {d.dayClose.closed ? (
              <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-gold-soft p-3">
                <BadgeCheck className="h-5 w-5 shrink-0 text-gold-deep" />
                <p className="min-w-0 text-xs font-semibold leading-relaxed text-gold-deep">
                  Hari ditutup rapi — misi, kas, dan refleksi semua tercatat.
                  Selamat beristirahat.
                </p>
              </div>
            ) : (
              <p className="mt-3 px-1 text-xs text-muted-foreground">
                Tiga ketukan kecil sebelum tidur: misi, kas, dan satu kalimat
                refleksi — hari besok lebih ringan kalau hari ini ditutup rapi.
              </p>
            )}
          </SectionCard>
        </div>
      )}

      {/* ===== Rekap Pekan ===== */}
      <div className="px-4 mt-4">
        <SectionCard
          title="Rekap Pekan"
          tone="studio"
          icon={<BarChart3 className="h-4 w-4 text-studio-deep" />}
          action={
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-semibold">Sen–Min</span>
              <button
                onClick={shareRecap}
                aria-label="Bagikan rekap pekan"
                className="press inline-flex min-h-[44px] items-center gap-1 text-xs font-bold text-studio-deep bg-studio-soft rounded-full px-3 py-1.5"
              >
                <Share2 className="h-3.5 w-3.5" />
                Bagikan
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-studio-soft p-3">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-studio-deep uppercase">Misi selesai</span>
                <DeltaBadge delta={d.weekRecap.missionsDone - d.weekRecap.prevDone} />
              </div>
              <MetricBar
                value={d.weekRecap.missionsDone}
                max={Math.max(1, d.weekRecap.missionsTotal)}
                height={8}
                className="mt-2.5"
              />
              <p className="mt-2 text-xs text-muted-foreground tabular">
                {d.weekRecap.missionsDone}/{d.weekRecap.missionsTotal} misi · pekan lalu {d.weekRecap.prevDone}/
                {d.weekRecap.prevTotal}
              </p>
            </div>
            <div className="rounded-xl bg-studio-soft p-3">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-studio-deep uppercase">Latihan</span>
                {workoutDelta !== null && <DeltaBadge delta={workoutDelta} />}
              </div>
              <p className="text-xl font-bold tabular text-studio-deep mt-1">{d.weekRecap.workouts} sesi</p>
              <p className="text-xs text-muted-foreground mt-0.5">minggu berjalan</p>
              {statsQuery.data && statsQuery.data.fitness.weeklyWorkouts.some((w) => w.sessions > 0) && (
                <div className="mt-1.5">
                  <MiniBars
                    data={statsQuery.data.fitness.weeklyWorkouts.map((w) => ({ label: w.label, value: w.sessions }))}
                    height={24}
                    showLabels={false}
                    color={SAGE_DEEP}
                    highlightIndex={statsQuery.data.fitness.weeklyWorkouts.length - 1}
                  />
                </div>
              )}
            </div>
          </div>
          {statsQuery.data && (
            <div className="mt-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
                Misi per hari · pekan ini vs pekan lalu
              </p>
              <MiniBars
                data={weekBars}
                showAlt
                height={72}
                highlightIndex={todayBarIdx >= 0 ? todayBarIdx : undefined}
              />
              <div className="flex gap-3 mt-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <span className="h-2 w-2 rounded-[3px]" style={{ background: SAGE }} /> Pekan ini
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <span className="h-2 w-2 rounded-[3px]" style={{ background: NEUTRAL }} /> Pekan lalu
                </span>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ===== Kutipan refleksi ===== */}
      {d.quote && (
        <div className="px-4 mt-4">
          <div className="relative rounded-xl bg-writer-soft border border-writer/15 p-4 overflow-hidden">
            <QuoteIcon className="absolute -top-2 -right-2 h-16 w-16 text-writer/10" />
            <p className="text-xs font-bold uppercase tracking-widest text-writer-deep/85 mb-1">
              Refleksi hari ini
            </p>
            <p className="font-script text-xl leading-snug text-writer-deep">
              “{d.quote.text}”
            </p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs font-semibold text-writer-deep/85">— {d.quote.author}</span>
              <button
                onClick={() => saveQuoteMutation.mutate({ text: d.quote!.text, author: d.quote!.author })}
                disabled={saveQuoteMutation.isPending}
                className="press inline-flex min-h-[44px] items-center gap-1 text-xs font-bold bg-writer-deep text-white rounded-full px-3 py-1.5 disabled:opacity-60"
              >
                <BookmarkPlus className="h-3.5 w-3.5" />
                Simpan ke Jurnal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Aktivitas lintas modul ===== */}
      <div className="px-4 mt-4 mb-2">
        <SectionCard title="Lintas Modul" icon={<CircleCheck className="h-4 w-4 text-foreground" />}>
          <div className="rounded-xl bg-vault-soft p-3">
            <div className="flex items-center gap-3">
              <span className="h-9 w-9 rounded-lg bg-white/60 flex items-center justify-center shrink-0">
                <Wallet className="h-5 w-5 text-vault-deep" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-vault-deep uppercase">Arus kas hari ini</p>
                <p className="text-sm font-bold text-foreground truncate tabular">
                  <span className="text-garden-deep">+{formatRupiah(d.cashflowToday.income, { compact: true })}</span>
                  {" · "}
                  <span className="text-clay-deep">−{formatRupiah(d.cashflowToday.expense, { compact: true })}</span>
                </p>
              </div>
            </div>
            {cashflowBars.length > 0 && (
              <div className="mt-2.5 border-t border-border/50 pt-2.5">
                <MiniBars
                  data={cashflowBars}
                  showAlt
                  label="Keluar"
                  altLabel="Masuk"
                  color={CLAY}
                  altColor={SAGE}
                  height={56}
                  showLabels={false}
                  highlightIndex={cashflowTodayIdx >= 0 ? cashflowTodayIdx : undefined}
                />
              </div>
            )}
          </div>
          <button
            onClick={() => setPage("stats")}
            className="press mt-3 w-full rounded-xl bg-secondary py-2.5 text-sm font-bold flex items-center justify-center gap-1.5 min-h-[44px]"
          >
            <BarChart3 className="h-4 w-4" />
            Buka Statistik
          </button>
        </SectionCard>
      </div>
    </div>
  );
}

// ============ Ritual Tutup Hari — baris checklist ============

// React.memo: baris re-render hanya saat statusnya berubah, bukan saat
// state lain Beranda berubah (pola sama dengan AgendaRow).
const DayCloseRow = React.memo(function DayCloseRow({
  done,
  label,
  detail,
  actionLabel,
  onClick,
  disabled,
}: {
  done: boolean;
  label: string;
  detail: string;
  actionLabel: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={`${label}: ${detail}`}
      className={cn(
        "press flex min-h-[44px] w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors",
        done ? "border-garden/20 bg-garden-soft" : "border-border/70 bg-card",
        disabled && "opacity-60"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          done ? "bg-garden text-white" : "bg-secondary text-muted-foreground"
        )}
        aria-hidden="true"
      >
        <CircleCheck className="h-4 w-4" strokeWidth={done ? 2.4 : 1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm font-bold leading-tight", done && "text-garden-deep")}>
          {label}
        </span>
        <span className="block text-xs text-muted-foreground truncate">{detail}</span>
      </span>
      <span
        className={cn(
          "shrink-0 inline-flex items-center gap-0.5 text-xs font-bold",
          done ? "text-garden-deep" : "text-primary"
        )}
      >
        {done ? "Beres" : actionLabel}
        <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
      </span>
    </button>
  );
});

// ============ Agenda row ============

// React.memo: baris agenda cukup re-render saat props-nya berubah,
// bukan saat state lain di HomeScreen berubah.
const AgendaRow = React.memo(function AgendaRow({
  habit,
  log,
  isToday,
  checking,
  onCheck,
}: {
  habit: Habit;
  log: import("@/types/rutina").HabitLog | null;
  isToday: boolean;
  /** Guard dobel-ketuk: true saat mutasi check baris ini sedang berjalan
      (pola sama dengan habits-screen) agar tap cepat 2× tidak toggle maju-mundur. */
  checking: boolean;
  onCheck: (value?: number) => void;
}) {
  const IconEl = React.createElement(habitIcon(habit.icon), {
    className: cn("h-5 w-5", habitColor(habit.color).deep),
  });
  const color = habitColor(habit.color);
  const done =
    log?.status === "done" || (habit.unitTarget !== null && (log?.value ?? 0) >= (habit.unitTarget ?? Infinity));
  const isMeasured = habit.unitTarget !== null;
  // Baris tanggal lampau hanya dibaca: pencatatan hanya diizinkan untuk hari ini
  const locked = !isToday;

  // motion rule check-pop (ux #119): aksen pop sekali per aksi sukses — check
  // jadi done atau +step menaikkan nilai. Counter lokal pendek-umur di-increment
  // di handler yang sama dengan mutasi; key pada span ikon ikut berubah →
  // animasi CSS replay tanpa animationend. State internal baris → memo
  // AgendaRow tetap aman; saat `checking` tombol disabled → guard dobel-ketuk
  // mencegah pop terpicu lagi.
  const [pop, setPop] = React.useState(0);

  const incr = () => {
    setPop((p) => p + 1); // +step selalu menaikkan nilai → selalu pop
    // audit D-L6: jepit ke unitTarget — selaras HabitCard di layar Kebiasaan;
    // tanpa clamp, bar optimistis bisa melampaui target sebelum server menjepit.
    const next = Math.min(habit.unitTarget ?? Infinity, (log?.value ?? 0) + habit.unitStep);
    onCheck(next);
  };

  // Un-check (done → todo) bukan momen sukses → tanpa pop.
  const toggleCheck = () => {
    if (!done) setPop((p) => p + 1);
    onCheck();
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border p-2.5 transition-colors",
        done ? "bg-garden-soft border-garden/20" : "bg-card border-border/70"
      )}
    >
      <span className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", color.soft)}>
        {IconEl}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-bold leading-tight truncate", done && "text-garden-deep")}>{habit.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {isMeasured
            ? `${log?.value ?? 0}/${habit.unitTarget} ${habit.unitLabel}`
            : habit.stackAfter
              ? habit.stackAfter
              : habit.reminderTime
                ? `Pengingat ${habit.reminderTime}`
                : "Kebiasaan harian"}
        </p>
        {isMeasured && (
          <MetricBar value={log?.value ?? 0} max={habit.unitTarget ?? 1} color="var(--primary)" overColor="var(--primary)" height={4} className="mt-1.5" />
        )}
      </div>
      {isMeasured ? (
        <button
          onClick={incr}
          aria-label={`Tambah progres ${habit.name}`}
          className={cn(
            "press h-11 min-w-11 px-2 rounded-xl bg-garden text-white font-bold text-sm flex items-center justify-center gap-1 disabled:opacity-50",
            locked && !done && "opacity-60"
          )}
          disabled={done || locked || checking}
        >
          {/* motion rule check-pop: key=pop → remount span → pop sekali per aksi */}
          <span key={pop} className={cn("inline-flex items-center justify-center", pop > 0 && "check-pop")}>
            {done ? <Check className="h-5 w-5" /> : `+${habit.unitStep}`}
          </span>
        </button>
      ) : (
        <button
          onClick={toggleCheck}
          aria-label={`Tandai ${habit.name} selesai`}
          className={cn(
            "press h-11 w-11 rounded-xl flex items-center justify-center border-2 transition-colors disabled:opacity-60",
            done ? "bg-garden border-garden text-white" : "border-input text-muted-foreground",
            locked && !done && "opacity-60"
          )}
          disabled={locked || checking}
        >
          {/* motion rule check-pop: key=pop → remount span → pop sekali per aksi */}
          <span key={pop} className={cn("inline-flex", pop > 0 && "check-pop")}>
            <Check className="h-5 w-5" strokeWidth={3} />
          </span>
        </button>
      )}
      {log?.status === "rest" && <Pill tone="gold">Jeda</Pill>}
      {locked && !done && <Pill tone="stone">Hanya hari ini</Pill>}
    </div>
  );
});

// ============ Skeleton ============

// Skeleton beranda — meniru tata letak home asli (stacks/shadcn.csv #41:
// skeleton matches content layout): header band, bento 2 kolom dengan satu
// tile tinggi (row-span-3), kartu agenda 3 baris, strip kalender 7 pill,
// kartu rekap pekan. skeleton-shimmer menggantikan animate-pulse
// (reduced-motion → latar statis, tanpa sweep).
function HomeSkeleton() {
  return (
    <div className="flex flex-col pb-4">
      {/* Header band + bento 2 kolom (tile hero row-span-3 + 3 tile 1×1) */}
      <div className="bg-garden-soft/30 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-4">
        <div className="h-3 w-40 rounded bg-secondary skeleton-shimmer" />
        <div className="mt-2 h-7 w-2/3 rounded-xl bg-secondary skeleton-shimmer" />
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="row-span-3 rounded-xl bg-secondary skeleton-shimmer" />
          <div className="h-14 rounded-xl bg-secondary skeleton-shimmer" />
          <div className="h-14 rounded-xl bg-secondary skeleton-shimmer" />
          <div className="h-14 rounded-xl bg-secondary skeleton-shimmer" />
        </div>
      </div>
      {/* Kartu agenda: judul + 3 baris */}
      <div className="px-4 mt-4">
        <div className="rounded-xl bg-card border border-border/70 p-4">
          <div className="h-4 w-36 rounded bg-secondary skeleton-shimmer" />
          <div className="mt-3 space-y-2">
            <div className="h-14 rounded-xl bg-secondary skeleton-shimmer" />
            <div className="h-14 rounded-xl bg-secondary skeleton-shimmer" />
            <div className="h-14 rounded-xl bg-secondary skeleton-shimmer" />
          </div>
        </div>
      </div>
      {/* Strip kalender: tombol prev/next + 7 pill */}
      <div className="px-4 mt-4 flex items-center gap-1">
        <div className="h-11 w-11 shrink-0 rounded-full bg-secondary skeleton-shimmer" />
        <div className="grid flex-1 grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-[52px] rounded-xl bg-secondary skeleton-shimmer" />
          ))}
        </div>
        <div className="h-11 w-11 shrink-0 rounded-full bg-secondary skeleton-shimmer" />
      </div>
      {/* Kartu rekap pekan */}
      <div className="px-4 mt-4">
        <div className="rounded-xl bg-card border border-border/70 p-4">
          <div className="h-4 w-28 rounded bg-secondary skeleton-shimmer" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="h-20 rounded-xl bg-secondary skeleton-shimmer" />
            <div className="h-20 rounded-xl bg-secondary skeleton-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}
