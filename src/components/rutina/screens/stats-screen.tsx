"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Flame,
  Trophy,
  Lock,
  Lightbulb,
  Dumbbell,
  Wallet,
  NotebookText,
  Target,
  Scale,
  Timer,
  Route,
  Medal,
  CalendarDays,
  AlertTriangle,
  Loader2,
  RefreshCw,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import {
  CLAY,
  DeltaBadge,
  Donut,
  HBarList,
  HeatGrid,
  MetricBar,
  MiniBars,
  NEUTRAL,
  RadarChart,
  rampColor,
  SAGE,
  SAGE_DEEP,
  Sparkline,
  TrendLine,
} from "@/components/rutina/charts";
import { useRutinaStore } from "@/store/rutina";
import { rutinaApi } from "@/lib/rutina/api";
import {
  weekStart,
  startOfMonth,
  formatDayMonth,
  formatDateID,
  formatRupiah,
  formatNumber,
  formatDuration,
  monthName,
  parseDateStr,
  toDateStr,
  todayStr,
} from "@/lib/rutina/format";
import { ScreenHeader, SectionCard, StatTile, ProgressRing, Pill, EmptyState, HABIT_CATEGORY_META, ShowAllToggle } from "@/components/rutina/primitives";
import { IlloSproutMission, IlloRunRoute, IlloTrendBars } from "@/components/rutina/illustrations";
import { Button } from "@/components/ui/button";
import { JOURNAL_MOODS } from "@/components/rutina/sheets/add-journal-sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import type { StatsPayload, AchievementItem, MonthlyPoint } from "@/types/rutina";
import { cn } from "@/lib/utils";

const ACHIEVEMENT_ICON: Record<string, LucideIcon> = {
  sprout: Target,
  flame: Flame,
  dumbbell: Dumbbell,
  medal: Medal,
  trophy: Trophy,
  "pen-line": NotebookText,
  "notebook-pen": NotebookText,
  "piggy-bank": Wallet,
  wallet: Wallet,
  "heart-pulse": Flame,
  crown: Trophy,
};

function cellIntensityBg(habitsDone: number): string {
  if (habitsDone === 0) return "bg-secondary/70";
  if (habitsDone <= 2) return "bg-garden-soft";
  if (habitsDone <= 4) return "bg-garden/40";
  return "bg-garden/60";
}

/* ============ Kartu tren bulanan 6 bulan (deep dive) ============
 * Dua grafik (misi & latihan) + rincian per bulan di balik progressive
 * disclosure (aturan #9 — daftar panjang tidak boleh memaksa scroll). */
function MonthlyTrendCard({ monthly }: { monthly: MonthlyPoint[] }) {
  const [expanded, setExpanded] = React.useState(false);
  const totalMissions = monthly.reduce((a, m) => a + m.missionsScheduled, 0);
  const totalSessions = monthly.reduce((a, m) => a + m.sessions, 0);
  const totalJournal = monthly.reduce((a, m) => a + m.journalEntries, 0);

  if (totalMissions === 0 && totalSessions === 0 && totalJournal === 0) {
    return (
      <SectionCard
        title="Tren 6 Bulan"
        tone="garden"
        icon={<TrendingUp className="h-4 w-4 text-garden-deep" />}
      >
        <p className="text-xs text-muted-foreground">
          Belum ada aktivitas 6 bulan terakhir untuk dibandingkan. Mulai satu misi hari ini — trennya akan tergambar di sini.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Tren 6 Bulan"
      tone="garden"
      icon={<TrendingUp className="h-4 w-4 text-garden-deep" />}
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs font-bold mb-1.5">Misi kebiasaan — selesai vs terjadwal</p>
          <MiniBars
            data={monthly.map((m) => ({ label: m.label, value: m.missionsDone, alt: m.missionsScheduled }))}
            height={92}
            showAlt
            label="Selesai"
            altLabel="Terjadwal"
            highlightIndex={monthly.length - 1}
          />
        </div>
        <div>
          <p className="text-xs font-bold mb-1.5">Sesi latihan per bulan</p>
          <MiniBars
            data={monthly.map((m) => ({ label: m.label, value: m.sessions }))}
            height={92}
            color="var(--chart-out)"
            highlightIndex={monthly.length - 1}
          />
        </div>

        <div id="monthly-detail" className={expanded ? "space-y-1.5" : "hidden"}>
          {monthly.map((m) => {
            const rate = m.missionsScheduled > 0 ? Math.round((m.missionsDone / m.missionsScheduled) * 100) : null;
            return (
              <div
                key={m.month}
                className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-xs"
              >
                <span className="w-9 shrink-0 font-bold">{m.label}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  misi {m.missionsDone}/{m.missionsScheduled}
                  {rate !== null && ` (${rate}%)`} · {m.sessions} sesi ({m.minutes} mnt) · {m.journalEntries} jurnal
                </span>
              </div>
            );
          })}
          <p className="text-[11px] text-muted-foreground pt-1">
            Catatan: jumlah terjadwal memakai jadwal kebiasaan aktif saat ini — kebiasaan yang diarsipkan/berubah jadwal bisa sedikit berbeda dari catatan aslinya.
          </p>
        </div>

        <ShowAllToggle
          total={monthly.length}
          visibleCount={expanded ? monthly.length : 0}
          expanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
          controlsId="monthly-detail"
          labelAll="Lihat rincian bulanan"
          labelLess="Tutup rincian"
        />
      </div>
    </SectionCard>
  );}

export default function StatsScreen() {
  const setPage = useRutinaStore((s) => s.setPage);
  const { data, isLoading, isError, refetch, isFetching } = useQuery({ queryKey: ["stats"], queryFn: rutinaApi.stats });

  if (isError) {
    return (
      <div className="flex flex-col min-h-full">
        <ScreenHeader title="Statistik" subtitle="Pola & tren semua modulmu" onBack={() => setPage("home")} />
        <div className="p-4">
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 flex flex-col items-center text-center gap-2.5">
            <span className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertTriangle className="h-6 w-6" />
            </span>
            <p className="text-sm font-bold">Gagal memuat statistik</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Data statistik tidak dapat diambil. Periksa koneksi internetmu, lalu coba lagi.
            </p>
            <Button
              onClick={() => refetch()}
              disabled={isFetching}
              className="mt-1.5 min-h-[44px] rounded-xl px-5 font-bold flex items-center gap-2"
            >
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Coba Lagi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return <StatsSkeleton />;
  }

  const stats = data as StatsPayload;

  // ===== Tren misi 4 pekan (dari monthlyCalendar dipadatkan per pekan Senin) =====
  const weekBuckets = new Map<string, number>();
  for (const d of stats.monthlyCalendar) {
    const ws = weekStart(d.date);
    weekBuckets.set(ws, (weekBuckets.get(ws) ?? 0) + d.missionsDone);
  }
  const missionTrend = Array.from(weekBuckets.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .slice(-4)
    .map(([ws, done]) => ({ label: formatDayMonth(ws), done }));

  // Riwayat misi harian 14 hari terakhir (untuk sparkline runtun)
  const streakSpark = stats.activityCalendar.slice(-14).map((a) => a.habitsDone);

  return (
    <div className="flex flex-col min-h-full">
      <ScreenHeader
        title="Statistik"
        subtitle="Pola & tren semua modulmu"
        onBack={() => setPage("home")}
      />

      <div className="p-4 space-y-4">
        {/* ===== Hero level & streak ===== */}
        <SectionCard className="bg-gold-soft/40">
          <div className="flex items-center gap-4">
            <ProgressRing progress={stats.levelProgress} size={124} stroke={10} color="var(--gold)">
              <div className="text-center">
                <p className="text-lg font-bold text-gold tabular leading-none">Lv{stats.level}</p>
              </div>
            </ProgressRing>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Total Pengalaman</p>
              <p className="text-2xl font-bold tabular">{formatNumber(stats.xp)}</p>
              <MetricBar value={stats.levelProgress * 100} max={100} height={10} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1.5">
                <span className="font-bold text-gold tabular">{formatNumber(stats.xpToNextLevel)} XP</span> lagi ke Level{" "}
                {stats.level + 1}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-1.5 rounded-full bg-card border border-border/70 px-3 py-1.5">
              <Flame className="h-3.5 w-3.5 text-gold" />
              <span className="text-xs font-bold tabular">{stats.streak.current} hari</span>
              <span className="text-xs text-muted-foreground">berjalan</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-card border border-border/70 px-3 py-1.5">
              <Trophy className="h-3.5 w-3.5 text-gold" />
              <span className="text-xs font-bold tabular">{stats.streak.best}</span>
              <span className="text-xs text-muted-foreground">terbaik</span>
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-card/70 border border-border/50 p-3">
            <div className="flex items-baseline justify-between mb-1">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Riwayat misi harian</p>
              <span className="text-xs text-muted-foreground tabular">14 hari terakhir</span>
            </div>
            <Sparkline data={streakSpark} height={36} />
          </div>
        </SectionCard>

        {/* ===== Keseimbangan hidup (radar) ===== */}
        <SectionCard
          title="Keseimbangan Hidup"
          tone="garden"
          icon={<Scale className="h-4 w-4 text-garden-deep" />}
          action={<span className="text-xs text-muted-foreground font-semibold">30 hari terakhir</span>}
        >
          {(() => {
            const habitScore = Math.min(1, Math.max(0, stats.weekly.completionRate));
            const fitnessScore = Math.min(1, stats.fitness.sessions30d / 12);
            const savingsRate =
              stats.finance.income30d > 0
                ? Math.min(1, Math.max(0, (stats.finance.income30d - stats.finance.expense30d) / stats.finance.income30d))
                : 0;
            const journalScore = Math.min(1, stats.journal.entries30d / 8);
            const checkinFilled = stats.mood14d.filter((m) => m.mood !== null || m.energy !== null).length;
            const checkinScore = Math.min(1, checkinFilled / 14);
            const axes = [
              { label: "Kebiasaan", value: habitScore, display: `${Math.round(habitScore * 100)}%` },
              { label: "Bugar", value: fitnessScore, display: `${stats.fitness.sessions30d} sesi` },
              { label: "Keuangan", value: savingsRate, display: `${Math.round(savingsRate * 100)}%` },
              { label: "Jurnal", value: journalScore, display: `${stats.journal.entries30d} entri` },
              { label: "Check-in", value: checkinScore, display: `${checkinFilled}/14` },
            ];
            const weakest = [...axes].sort((a, b) => a.value - b.value)[0];
            return (
              <>
                <RadarChart axes={axes} size={252} color={SAGE} />
                <div className="mt-2 rounded-xl bg-secondary/60 border border-border/50 p-3">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    <span className="font-bold text-foreground">{weakest.label}</span> adalah area paling santai
                    periode ini ({weakest.display}). Perhatikan dulu area ini supaya roda kehidupan tetap bulat.
                  </p>
                </div>
                <div className="mt-2 grid grid-cols-5 gap-1">
                  {axes.map((a) => (
                    <div key={a.label} className="text-center">
                      <p className="text-xs font-bold tabular">{Math.round(a.value * 100)}%</p>
                      <p className="text-[11px] text-muted-foreground font-semibold truncate">{a.label}</p>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </SectionCard>

        {/* ===== Tren misi selesai ===== */}
        <SectionCard
          title="Tren Misi Selesai"
          tone="garden"
          icon={<Target className="h-4 w-4 text-garden-deep" />}
          action={<DeltaBadge delta={stats.weekly.missionsDone - stats.weekly.prevWeekDone} suffix=" misi" />}
        >
          <MiniBars
            data={missionTrend.map((m) => ({ label: m.label, value: m.done }))}
            height={110}
            highlightIndex={missionTrend.length - 1}
          />
          <p className="text-xs text-muted-foreground mt-2 tabular">
            Pekan ini <span className="font-bold text-foreground">{stats.weekly.missionsDone}</span> dari{" "}
            {stats.weekly.missionsScheduled} misi ({Math.round(stats.weekly.completionRate * 100)}%) · pekan lalu{" "}
            {stats.weekly.prevWeekDone}/{stats.weekly.prevWeekScheduled}
          </p>
        </SectionCard>

        {/* ===== Tren bulanan 6 bulan (deep dive) ===== */}
        <MonthlyTrendCard monthly={stats.monthly} />

        {/* ===== Komposisi kategori kebiasaan ===== */}
        <SectionCard title="Komposisi Kategori" tone="garden" icon={<PieIcon />}>
          {stats.habitCategoryComposition.length === 0 ? (
            <EmptyState
              icon={<PieIcon />}
              illustration={<IlloSproutMission className="mx-auto h-20 w-auto" />}
              title="Belum ada kebiasaan aktif untuk dihitung"
            />
          ) : (
            <div className="flex items-center gap-4">
              <Donut
                size={124}
                thickness={14}
                slices={stats.habitCategoryComposition.map((entry) => ({
                  label: catLabel(entry.category),
                  value: entry.count,
                }))}
                center={
                  <>
                    <p className="text-lg font-extrabold tabular leading-none">
                      {stats.habitCategoryComposition.reduce((a, c) => a + c.count, 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">kebiasaan</p>
                  </>
                }
              />
              <div className="flex-1 min-w-0 space-y-1.5">
                {stats.habitCategoryComposition.map((entry, i) => (
                  <div key={entry.category} className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: rampColor(i, stats.habitCategoryComposition.length) }}
                    />
                    <span className="text-xs font-semibold truncate">{catLabel(entry.category)}</span>
                    <span className="text-xs tabular text-muted-foreground ml-auto">{entry.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        {/* ===== Kalender aktivitas bulan berjalan ===== */}
        <MonthlyMissionCalendar stats={stats} />

        {/* ===== Kebugaran ===== */}
        <SectionCard title="Kebugaran 30 Hari" tone="studio" icon={<Dumbbell className="h-4 w-4 text-studio-deep" />}>
          <div className="grid grid-cols-2 gap-2.5">
            <StatTile
              label="Sesi latihan"
              value={formatNumber(stats.fitness.sessions30d)}
              sub={`${stats.fitness.strengthSessions30d} sesi beban`}
              tone="studio"
              icon={<Dumbbell className="h-3.5 w-3.5" />}
              chart={
                stats.fitness.weeklyWorkouts.length >= 2 ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-muted-foreground">vs pekan lalu</span>
                    <DeltaBadge
                      delta={
                        stats.fitness.weeklyWorkouts[stats.fitness.weeklyWorkouts.length - 1].sessions -
                        stats.fitness.weeklyWorkouts[stats.fitness.weeklyWorkouts.length - 2].sessions
                      }
                    />
                  </div>
                ) : undefined
              }
            />
            <StatTile
              label="Total durasi"
              value={formatDuration(stats.fitness.minutes30d)}
              sub="menit bergerak"
              tone="studio"
              icon={<Timer className="h-3.5 w-3.5" />}
              chart={
                stats.fitness.weeklyWorkouts.some((w) => w.minutes > 0) ? (
                  <MiniBars
                    data={stats.fitness.weeklyWorkouts.map((w) => ({ label: w.label, value: w.minutes }))}
                    height={22}
                    showLabels={false}
                    color={SAGE_DEEP}
                    highlightIndex={stats.fitness.weeklyWorkouts.length - 1}
                  />
                ) : undefined
              }
            />
            <StatTile label="Kardio" value={`${formatNumber(stats.fitness.cardioKm30d, 1)} km`} sub="jarak tempuh 30d" tone="studio" icon={<Route className="h-3.5 w-3.5" />} />
            <StatTile label="Berat terkini" value={stats.fitness.latestWeight != null ? `${stats.fitness.latestWeight} kg` : "-"} sub="timbangan terakhir" tone="studio" icon={<Scale className="h-3.5 w-3.5" />} />
          </div>

          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mt-4 mb-1">
            Sesi latihan per pekan
          </p>
          {stats.fitness.weeklyWorkouts.some((w) => w.sessions > 0) ? (
            <MiniBars
              data={stats.fitness.weeklyWorkouts.map((w) => ({ label: w.label, value: w.sessions }))}
              height={72}
              labelEvery={2}
              highlightIndex={stats.fitness.weeklyWorkouts.length - 1}
            />
          ) : (
            <EmptyState
              icon={<Route className="h-6 w-6" />}
              illustration={<IlloRunRoute className="mx-auto h-20 w-auto" />}
              title="Belum ada sesi latihan dalam enam pekan terakhir"
            />
          )}

          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mt-4 mb-1">Tren berat badan</p>
          {stats.fitness.weightTrend.length > 1 ? (
            <TrendLine
              data={stats.fitness.weightTrend.map((w) => ({ label: formatDayMonth(w.date), value: w.weightKg }))}
              height={130}
              color={SAGE}
              formatValue={(v) => `${formatNumber(v, 1)} kg`}
            />
          ) : (
            <EmptyState
              icon={<Scale className="h-6 w-6" />}
              illustration={<IlloTrendBars className="mx-auto h-20 w-auto" />}
              title="Belum cukup data timbangan untuk menggambar tren"
              description="Catat berat badan minimal dua kali untuk melihat garis trennya."
            />
          )}

          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mt-4 mb-1">Mood &amp; energi 14 hari</p>
          <MiniBars
            data={stats.mood14d.map((d) => ({ label: formatDayMonth(d.date), value: d.mood ?? 0, alt: d.energy ?? 0 }))}
            height={92}
            showAlt
            labelEvery={4}
            color={SAGE}
            altColor={NEUTRAL}
          />
          <div className="flex flex-wrap items-center gap-4 mt-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SAGE }} /> Mood
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: NEUTRAL }} /> Energi
            </span>
            <span className="ml-auto text-xs text-muted-foreground">skala 0–5 · kosong = tidak tercatat</span>
          </div>
        </SectionCard>

        {/* ===== Keuangan ===== */}
        <SectionCard title="Keuangan 30 Hari" tone="vault" icon={<Wallet className="h-4 w-4 text-vault-deep" />}>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-vault-soft px-4 py-3 mb-3">
            <span className="text-xs font-bold text-vault-deep uppercase tracking-wide">Saldo bersih semua dompet</span>
            <span className="text-lg font-bold tabular text-vault-deep">{formatRupiah(stats.finance.netBalance, { compact: true })}</span>
          </div>
          <HBarList
            className="mt-1"
            height={10}
            items={[
              {
                label: "Arus masuk",
                value: stats.finance.income30d,
                caption: formatRupiah(stats.finance.income30d, { compact: true }),
                color: SAGE,
              },
              {
                label: "Arus keluar",
                value: stats.finance.expense30d,
                caption: formatRupiah(stats.finance.expense30d, { compact: true }),
                color: CLAY,
              },
            ]}
          />
          <p className="text-xs text-muted-foreground mt-2 tabular">
            Masuk <span className="font-bold text-garden-deep">{formatRupiah(stats.finance.income30d)}</span> · Keluar{" "}
            <span className="font-bold text-clay-deep">{formatRupiah(stats.finance.expense30d)}</span>
          </p>
          {stats.finance.categoryComposition.length > 0 && (
            <div className="mt-4 border-t border-border/60 pt-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                Komposisi pengeluaran · 30 hari
              </p>
              <HBarList
                height={8}
                items={stats.finance.categoryComposition.slice(0, 5).map((c) => ({
                  label: c.category,
                  value: c.amount,
                  caption: formatRupiah(c.amount, { compact: true }),
                  color: CLAY,
                }))}
              />
            </div>
          )}
        </SectionCard>

        {/* ===== Wawasan lintas modul (90 hari) ===== */}
        <CrossModuleCalendar stats={stats} />

        {/* ===== Mood & pencapaian ===== */}
        <SectionCard title="Mood Menulis" tone="writer" icon={<NotebookText className="h-4 w-4 text-writer-deep" />}>
          {stats.journal.moodDistribution.length === 0 ? (
            <p className="text-xs text-muted-foreground">Belum ada catatan dengan mood untuk dihitung.</p>
          ) : (
            <HBarList
              items={JOURNAL_MOODS.map((m) => {
                const count = stats.journal.moodDistribution.find((d) => d.mood === m.key)?.count ?? 0;
                return { label: m.label, value: count, caption: `${count}x` };
              })}
              height={8}
            />
          )}
          <p className="text-xs text-muted-foreground mt-3 tabular">
            {stats.journal.entries30d} entri · {formatNumber(stats.journal.words30d)} kata dalam 30 hari terakhir
          </p>
        </SectionCard>

        <SectionCard
          title={`Koleksi Piala (${stats.achievements.filter((a) => a.unlockedAt).length}/${stats.achievements.length})`}
          tone="gold"
          icon={<Trophy className="h-4 w-4 text-gold" />}
        >
          <div className="grid grid-cols-3 gap-2">
            {stats.achievements.map((a) => (
              <AchievementCard key={a.id} achievement={a} />
            ))}
          </div>
        </SectionCard>

        {/* ===== Insight list ===== */}
        <SectionCard title="Wawasan Statistik" tone="garden" icon={<Lightbulb className="h-4 w-4 text-garden-deep" />}>
          <ul className="space-y-2.5">
            {stats.insights.map((ins) => (
              <li key={ins.slice(0, 40)} className="flex items-start gap-2.5 rounded-xl bg-secondary/60 p-3">
                <Lightbulb className="h-4 w-4 text-garden-deep shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed text-foreground">{ins}</p>
              </li>
            ))}
          </ul>
        </SectionCard>

        <div className="h-2" />
      </div>
    </div>
  );
}

function PieIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-garden-deep">
      <path d="M21 12A9 9 0 1 1 12 3v9h9z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function catLabel(c: string): string {
  return HABIT_CATEGORY_META[c]?.label ?? c;
}

// ====== Kalender misi bulan berjalan (HeatGrid intensitas + nomor tanggal) ======

function MonthlyMissionCalendar({ stats }: { stats: StatsPayload }) {
  const today = todayStr();
  const first = parseDateStr(startOfMonth(today));
  const leadingBlanks = (first.getDay() + 6) % 7;

  // Intensitas = rasio misi selesai per hari (0–100)
  const cells = [
    ...Array.from({ length: leadingBlanks }, () => ({ value: 0 })),
    ...stats.monthlyCalendar.map((d) => ({
      value: d.date > today || d.missionsTotal === 0 ? 0 : Math.round((d.missionsDone / d.missionsTotal) * 100),
      label: `${formatDateID(d.date, true)}: ${d.missionsDone}/${d.missionsTotal} misi`,
    })),
  ];
  const todayCellIdx = leadingBlanks + Number(today.slice(8)) - 1;
  const todayStat = stats.monthlyCalendar.find((m) => m.date === today);

  return (
    <SectionCard
      title="Kalender Misi Bulan Ini"
      tone="garden"
      icon={<CalendarDays className="h-4 w-4 text-garden-deep" />}
      action={<span className="text-xs text-muted-foreground font-semibold">{monthName(first.getMonth())}</span>}
    >
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
          <span key={d} className="text-xs font-bold text-muted-foreground">
            {d}
          </span>
        ))}
      </div>
      <div className="relative">
        <HeatGrid cells={cells} columns={7} max={100} className="gap-1" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 grid gap-1"
          style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
        >
          {cells.map((c, i) => {
            const dayNum = i >= leadingBlanks ? i - leadingBlanks + 1 : null;
            if (dayNum === null) return <span key={i} className="aspect-square" />;
            const t = c.value / 100;
            return (
              <span
                key={i}
                className={cn(
                  "aspect-square rounded-[4px] flex items-center justify-center text-xs font-semibold tabular",
                  t >= 0.75 ? "text-primary-foreground" : t > 0 ? "text-foreground" : "text-muted-foreground/50",
                  i === todayCellIdx && "ring-2 ring-gold"
                )}
              >
                {dayNum}
              </span>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 mt-2">
        <div className="flex items-center gap-1" aria-hidden="true">
          {[0.3, 0.55, 0.8, 1].map((o) => (
            <span key={o} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: "var(--primary)", opacity: o }} />
          ))}
          <span className="text-xs text-muted-foreground ml-1">kosong → penuh</span>
        </div>
        <span className="text-xs text-muted-foreground tabular shrink-0">
          {todayStat && todayStat.missionsTotal > 0
            ? `Hari ini ${todayStat.missionsDone}/${todayStat.missionsTotal} misi`
            : "Hari ini belum ada misi"}
        </span>
      </div>
    </SectionCard>
  );
}

// ====== Kalender lintas modul 90 hari + detail hari ======

function CrossModuleCalendar({ stats }: { stats: StatsPayload }) {
  const [selectedDay, setSelectedDay] = React.useState<string | null>(null);

  // Kelompokkan 90 hari per bulan (3 baris-bulan)
  const byMonth = new Map<string, typeof stats.activityCalendar>();
  for (const d of stats.activityCalendar) {
    const key = d.date.slice(0, 7);
    const arr = byMonth.get(key) ?? [];
    arr.push(d);
    byMonth.set(key, arr);
  }

  return (
    <SectionCard
      title="Radar 90 Hari"
      tone="garden"
      icon={<CalendarDays className="h-4 w-4 text-garden-deep" />}
      action={<span className="text-xs text-muted-foreground font-semibold">ketuk sel untuk detail</span>}
    >
      <div className="space-y-3">
        {/* Header hari — pola grid 7 kolom (Sen–Min) seperti Kalender Misi Bulan Ini */}
        <div className="grid grid-cols-7 gap-2 text-center">
          {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
            <span key={d} className="text-xs font-bold text-muted-foreground">
              {d}
            </span>
          ))}
        </div>
        {Array.from(byMonth.entries()).map(([key, days]) => {
          const m = Number(key.slice(5, 7)) - 1;
          // Selisih ke Senin agar baris pertama sejajar dengan header hari
          const leadingBlanks = days.length > 0 ? (parseDateStr(days[0].date).getDay() + 6) % 7 : 0;
          return (
            <div key={key}>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">{monthName(m, true)}</p>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: leadingBlanks }, (_, i) => (
                  <span key={`blank-${i}`} className="aspect-square" aria-hidden="true" />
                ))}
                {days.map((d) => (
                  <button
                    key={d.date}
                    onClick={() => setSelectedDay(d.date)}
                    aria-label={`${formatDateID(d.date, true)}: misi ${d.habitsDone}, ${
                      d.hasTransaction ? "transaksi ada" : "tanpa transaksi"
                    }, ${d.hasWorkout ? "latihan ada" : "tanpa latihan"}, ${d.journaled ? "jurnal ada" : "tanpa jurnal"}`}
                    className={cn(
                      "press aspect-square min-h-[44px] rounded-[4px] p-1 grid grid-cols-2 gap-1.5 place-items-center transition-transform",
                      cellIntensityBg(d.habitsDone),
                      d.date === todayStr() && "ring-2 ring-gold"
                    )}
                  >
                    <Dot show={d.habitsDone > 0} className="bg-garden" />
                    <Dot show={d.hasTransaction} className="bg-vault" />
                    <Dot show={d.hasWorkout} className="bg-studio" />
                    <Dot show={d.journaled} className="bg-writer" />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
        <LegendDot className="bg-garden" label="Misi" />
        <LegendDot className="bg-vault" label="Transaksi" />
        <LegendDot className="bg-studio" label="Latihan" />
        <LegendDot className="bg-writer" label="Jurnal" />
      </div>

      <DayDetailDrawer day={selectedDay} stats={stats} onClose={() => setSelectedDay(null)} />
    </SectionCard>
  );
}

function Dot({ show, className }: { show: boolean; className: string }) {
  return <span className={cn("h-1.5 w-1.5 rounded-full", show ? className : "bg-transparent")} />;
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
      <span className={cn("h-1.5 w-1.5 rounded-full", className)} />
      {label}
    </span>
  );
}

function DayDetailDrawer({ day, stats, onClose }: { day: string | null; stats: StatsPayload; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["day-detail", day],
    queryFn: async () => {
      const [tx, wk, jn] = await Promise.all([rutinaApi.transactions(), rutinaApi.workouts(), rutinaApi.journal()]);
      return { transactions: tx.transactions, workouts: wk.workouts, entries: jn.entries };
    },
    enabled: !!day,
    staleTime: 30_000,
  });

  const activity = day ? stats.activityCalendar.find((a) => a.date === day) : null;
  const monthStat = day ? stats.monthlyCalendar.find((m) => m.date === day) : null;
  const dayTransactions = React.useMemo(
    () => (day ? (data?.transactions ?? []).filter((t) => t.date === day) : []),
    [data, day]
  );
  const dayWorkouts = React.useMemo(() => (day ? (data?.workouts ?? []).filter((w) => w.date === day) : []), [data, day]);
  const dayEntries = React.useMemo(
    () => (day ? (data?.entries ?? []).filter((e) => toDateStr(new Date(e.createdAt)) === day) : []),
    [data, day]
  );

  return (
    <Drawer open={!!day} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[80dvh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-gold">{day ? formatDateID(day, true) : ""}</DrawerTitle>
          <p className="text-xs text-muted-foreground">Ringkasan aktivitas lintas modul</p>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-3 overflow-y-auto scroll-thin">
          <div className="rounded-xl bg-garden-soft p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-garden-deep uppercase tracking-wide">Misi selesai</span>
              <span className="text-sm font-bold tabular text-garden-deep">
                {activity?.habitsDone ?? 0}
                {monthStat ? `/${monthStat.missionsTotal}` : ""} misi
              </span>
            </div>
            {monthStat && (
              <MetricBar
                value={activity?.habitsDone ?? 0}
                max={Math.max(1, monthStat.missionsTotal)}
                height={6}
                className="mt-2"
                label="Misi selesai hari ini"
              />
            )}
          </div>

          <div className="rounded-xl bg-vault-soft p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-vault-deep uppercase tracking-wide">Transaksi</span>
              <span className="text-sm font-bold tabular text-vault-deep">{dayTransactions.length} catatan</span>
            </div>
            {isLoading ? (
              <p className="text-xs text-muted-foreground mt-1">Memuat ...</p>
            ) : dayTransactions.length > 0 ? (
              <div className="mt-2 space-y-1">
                {dayTransactions.slice(0, 4).map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-xs">
                    <span className="truncate text-foreground/80">
                      {t.category}
                      {t.note ? ` · ${t.note}` : ""}
                    </span>
                    <span
                      className={cn(
                        "font-bold tabular shrink-0 ml-2",
                        t.type === "income" ? "text-garden-deep" : t.type === "expense" ? "text-clay-deep" : "text-muted-foreground"
                      )}
                    >
                      {t.type === "expense" ? "-" : t.type === "income" ? "+" : ""}
                      {formatRupiah(t.amount, { compact: true })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Tidak ada arus kas pada hari ini.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-studio-soft p-3">
              <span className="text-xs font-bold text-studio-deep uppercase tracking-wide">Latihan</span>
              {isLoading ? (
                // motion.csv #15: skeleton-shimmer, bukan pulse lama
                <div className="h-4 w-24 rounded bg-secondary skeleton-shimmer mt-1" />
              ) : (
                <>
                  <p className="text-sm font-bold tabular text-studio-deep mt-1">
                    {dayWorkouts.length > 0 ? `${dayWorkouts.length} sesi` : "Tidak ada"}
                  </p>
                  {dayWorkouts.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDuration(dayWorkouts.reduce((a, w) => a + w.durationMin, 0))}
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="rounded-xl bg-writer-soft p-3">
              <span className="text-xs font-bold text-writer-deep uppercase tracking-wide">Jurnal</span>
              {isLoading ? (
                // motion.csv #15: skeleton-shimmer, bukan pulse lama
                <div className="h-4 w-24 rounded bg-secondary skeleton-shimmer mt-1" />
              ) : (
                <>
                  <p className="text-sm font-bold tabular text-writer-deep mt-1">
                    {dayEntries.length > 0 ? `${dayEntries.length} catatan` : "Tidak ada"}
                  </p>
                  {dayEntries.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {dayEntries.reduce((a, e) => a + e.wordCount, 0)} kata
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ====== Kartu pencapaian ======

function AchievementCard({ achievement }: { achievement: AchievementItem }) {
  const Icon = ACHIEVEMENT_ICON[achievement.icon] ?? Trophy;
  const unlocked = !!achievement.unlockedAt;
  return (
    <div
      className={cn(
        "rounded-xl border p-2.5 flex flex-col items-center text-center gap-1.5",
        unlocked ? "bg-garden-soft border-garden/30" : "bg-secondary border-border/60 opacity-60 grayscale"
      )}
    >
      <span
        className={cn(
          "h-9 w-9 rounded-full flex items-center justify-center relative",
          unlocked ? "bg-garden/15 text-garden-deep" : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-5 w-5" />
        {!unlocked && <Lock className="absolute -bottom-0.5 -right-0.5 h-3 w-3 text-muted-foreground bg-card rounded-full p-[1px]" />}
      </span>
      <p className={cn("text-xs font-bold leading-tight", unlocked ? "text-garden-deep" : "text-muted-foreground")}>
        {achievement.title}
      </p>
      {unlocked ? (
        <Pill tone="garden" className="text-[11px] px-1.5 py-0.5">
          {formatDateID(achievement.unlockedAt!)}
        </Pill>
      ) : (
        <span className="text-xs text-muted-foreground leading-tight line-clamp-2">{achievement.description}</span>
      )}
    </div>
  );
}

// ====== Skeleton ======

function StatsSkeleton() {
  const setPage = useRutinaStore((s) => s.setPage);
  return (
    <div className="flex flex-col min-h-full">
      <ScreenHeader title="Statistik" subtitle="Pola & tren semua modulmu" onBack={() => setPage("home")} />
      <div className="p-4 space-y-4">
        {/* motion.csv #15: sweep gradien skeleton-shimmer menggantikan pulse lama */}
        <div className="h-36 rounded-xl bg-secondary skeleton-shimmer" />
        <div className="h-48 rounded-xl bg-secondary skeleton-shimmer" />
        <div className="grid grid-cols-2 gap-2.5">
          <div className="h-20 rounded-xl bg-secondary skeleton-shimmer" />
          <div className="h-20 rounded-xl bg-secondary skeleton-shimmer" />
        </div>
        <div className="h-40 rounded-xl bg-secondary skeleton-shimmer" />
        <div className="h-56 rounded-xl bg-secondary skeleton-shimmer" />
      </div>
    </div>
  );
}
