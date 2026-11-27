"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Footprints,
  PersonStanding,
  Route,
  CircleDot,
  Dumbbell,
  Sparkles,
  HeartPulse,
  Activity,
  Zap,
  Brain,
  Smile,
  Moon,
  Droplets,
  Flame,
  Timer,
  Clock3,
  MapPin,
  Gauge,
  Trash2,
  ChevronDown,
  ChevronUp,
  UtensilsCrossed,
  Scale,
  Trophy,
  Target,
  AlertTriangle,
  CheckCircle2,
  Shuffle,
  Plus,
  Loader2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScreenHeader, SectionCard, StatTile, EmptyState, ProgressRing, ShowAllToggle } from "../primitives";
import {
  MiniBars,
  Sparkline,
  StackBar,
  HBarList,
  TrendLine,
  MetricBar,
  DeltaBadge,
  RingStat,
  ActivityRings,
  rampColor,
  SAGE,
  SAGE_DEEP,
  CLAY,
} from "../charts";
import { cn } from "@/lib/utils";
import { rutinaApi } from "@/lib/rutina/api";
import { invalidateAfterMutation } from "@/lib/rutina/queries";
import {
  todayStr,
  addDays,
  dayName,
  formatDateID,
  formatNumber,
  formatDuration,
  formatPace,
  formatDayMonth,
  parseDateStr,
  rangeDays,
  weekStart,
} from "@/lib/rutina/format";
import { useRutinaStore } from "@/store/rutina";
import type { Workout, StrengthItem, FoodEntry, CheckIn, BodyMetric } from "@/types/rutina";

// ============ Meta & helpers ============

const TYPE_META: Record<Workout["type"], { label: string; icon: React.ElementType }> = {
  run: { label: "Lari", icon: Footprints },
  walk: { label: "Jalan", icon: PersonStanding },
  runwalk: { label: "Lari + Jalan", icon: Route },
  badminton: { label: "Badminton", icon: CircleDot },
  strength: { label: "Beban", icon: Dumbbell },
};

const MEAL_META: { key: FoodEntry["meal"]; label: string }[] = [
  { key: "breakfast", label: "Pagi" },
  { key: "lunch", label: "Siang" },
  { key: "dinner", label: "Malam" },
  { key: "snack", label: "Snack" },
];

function parseStrength(json: string | null): StrengthItem[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? (arr as StrengthItem[]) : [];
  } catch {
    return [];
  }
}

function clampScore(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

const TYPE_FILTERS = [
  { key: "run", label: "Lari" },
  { key: "walk", label: "Jalan" },
  { key: "runwalk", label: "Lari+Jalan" },
  { key: "badminton", label: "Badminton" },
  { key: "strength", label: "Beban" },
];

// ============ Screen root ============

export default function FitnessScreen() {
  const workoutsQuery = useQuery({ queryKey: ["workouts"], queryFn: rutinaApi.workouts });
  const checkinsQuery = useQuery({ queryKey: ["checkins"], queryFn: rutinaApi.checkins });

  const workouts = workoutsQuery.data?.workouts ?? [];
  const checkins = checkinsQuery.data?.checkins ?? [];

  // Sasaran kebugaran: satu sumber state untuk tab Latihan & Tubuh (sinkron dengan localStorage)
  const [goals, setGoals] = React.useState<FitnessGoals>(readGoals);

  return (
    <div className="flex flex-col min-h-full">
      <Tabs defaultValue="latihan" className="flex flex-col">
        {/* Header + strip tab dalam satu wrapper sticky: offset tidak bergantung tinggi header */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md">
          <ScreenHeader title="Bugar" subtitle="Latihan, asupan & tubuh dalam satu layar" tone="studio" />
          <div className="px-4 pt-3 pb-2 border-b border-border/40">
            <TabsList className="w-full grid grid-cols-3 h-[52px] rounded-xl bg-secondary p-1">
              <TabsTrigger
                value="latihan"
                className="press rounded-xl text-sm font-bold data-[state=active]:bg-card data-[state=active]:text-studio-deep data-[state=active]:shadow-soft min-h-[44px]"
              >
                <Dumbbell className="h-4 w-4" /> Latihan
              </TabsTrigger>
              <TabsTrigger
                value="asupan"
                className="press rounded-xl text-sm font-bold data-[state=active]:bg-card data-[state=active]:text-studio-deep data-[state=active]:shadow-soft min-h-[44px]"
              >
                <UtensilsCrossed className="h-4 w-4" /> Asupan
              </TabsTrigger>
              <TabsTrigger
                value="tubuh"
                className="press rounded-xl text-sm font-bold data-[state=active]:bg-card data-[state=active]:text-studio-deep data-[state=active]:shadow-soft min-h-[44px]"
              >
                <HeartPulse className="h-4 w-4" /> Tubuh
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="latihan" className="px-4 pt-4 pb-6 space-y-4">
          <WorkoutTab workouts={workouts} loading={workoutsQuery.isLoading || checkinsQuery.isLoading} checkins={checkins} goals={goals} />
        </TabsContent>
        <TabsContent value="asupan" className="px-4 pt-4 pb-6 space-y-4">
          <NutritionTab workouts={workouts} />
        </TabsContent>
        <TabsContent value="tubuh" className="px-4 pt-4 pb-6 space-y-4">
          <BodyTab workouts={workouts} checkins={checkins} goals={goals} onGoalsChange={setGoals} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TabSkeleton() {
  return (
    <div className="space-y-3">
      {/* motion.csv #15: skeleton-shimmer menggantikan <Skeleton> shadcn
          (ber-pulse) — ukuran & bentuk kartu dipertahankan persis;
          src/components/ui/skeleton.tsx tidak diubah (dipakai sheet lain) */}
      <div className="skeleton-shimmer h-28 rounded-xl" />
      <div className="skeleton-shimmer h-36 rounded-xl" />
      <div className="skeleton-shimmer h-48 rounded-xl" />
    </div>
  );
}

// ---------- Visual harian 7 hari (kit MiniBars) ----------

function WeeklyDailyCharts({ workouts }: { workouts: Workout[] }) {
  const today = todayStr();
  const days = React.useMemo(() => {
    const labels = rangeDays(addDays(today, -6), today);
    const agg = labels.map((d) => ({ label: dayName(d, true), km: 0, tonnage: 0, kcal: 0, minutes: 0 }));
    const idx = new Map(labels.map((d, i) => [d, i]));
    for (const w of workouts) {
      const i = idx.get(w.date);
      if (i === undefined) continue;
      agg[i].minutes += w.durationMin;
      agg[i].km += w.distanceKm ?? 0;
      agg[i].kcal += w.calories ?? 0;
      if (w.type === "strength") {
        for (const it of parseStrength(w.strength)) agg[i].tonnage += it.weight * it.reps * it.sets;
      }
    }
    return agg;
  }, [workouts, today]);

  const charts = [
    { title: "Jarak kardio", unit: "km", digits: 1, color: SAGE, values: days.map((d) => Math.round(d.km * 10) / 10) },
    { title: "Tonase beban", unit: "kg", digits: 0, color: SAGE_DEEP, values: days.map((d) => Math.round(d.tonnage)) },
    { title: "Kalori", unit: "kkal", digits: 0, color: SAGE, values: days.map((d) => Math.round(d.kcal)) },
    { title: "Durasi", unit: "menit", digits: 0, color: SAGE_DEEP, values: days.map((d) => Math.round(d.minutes)) },
  ];

  return (
    <div className="mt-3 border-t border-border/60 pt-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Pola 7 hari terakhir</p>
      <div className="grid grid-cols-2 gap-2">
        {charts.map((c) => (
          <div key={c.title} className="rounded-xl bg-secondary/50 p-2.5">
            <div className="mb-1 flex items-baseline justify-between gap-1">
              <span className="truncate text-xs font-semibold text-muted-foreground">{c.title}</span>
              <span className="shrink-0 text-xs font-bold tabular">
                {formatNumber(c.values[6] ?? 0, c.digits)}
                <span className="ml-0.5 text-[11px] font-semibold text-muted-foreground"> {c.unit}</span>
              </span>
            </div>
            <MiniBars data={days.map((d, i) => ({ label: d.label, value: c.values[i] }))} height={48} color={c.color} highlightIndex={6} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Bar komponen kesiapan (Coach) ----------

function RingLegend({
  color,
  label,
  display,
  pct,
}: {
  color: string;
  label: string;
  display: string;
  pct: number;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} aria-hidden />
          {label}
        </span>
        <span className="text-xs font-bold tabular text-foreground">{display}</span>
      </div>
      <MetricBar value={Math.min(1.5, Math.max(0, pct)) * 100} max={100} color={color} height={6} />
    </div>
  );
}

function ReadinessBar({
  label,
  value,
  max,
  display,
  color,
  overColor = CLAY,
}: {
  label: string;
  value: number | null;
  max: number;
  display: string;
  color: string;
  overColor?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <span className="text-xs font-bold tabular">{display}</span>
      </div>
      <MetricBar value={value ?? 0} max={max} color={color} overColor={overColor} height={6} />
    </div>
  );
}

// ============================================================
// TAB LATIHAN
// ============================================================

function WorkoutTab({
  workouts,
  loading,
  checkins,
  goals,
}: {
  workouts: Workout[];
  loading: boolean;
  checkins: CheckIn[];
  goals: FitnessGoals;
}) {
  const openQuickAction = useRutinaStore((s) => s.setQuickAction);
  const today = todayStr();
  const wStart = weekStart(today);

  const weekWorkouts = workouts.filter((w) => w.date >= wStart && w.date <= today);

  const summary = React.useMemo(() => {
    let cardioKm = 0;
    let totalMin = 0;
    let calories = 0;
    let tonnage = 0;
    const days = new Set<string>();
    for (const w of weekWorkouts) {
      days.add(w.date);
      totalMin += w.durationMin;
      if (w.distanceKm != null) cardioKm += w.distanceKm;
      if (w.calories != null) calories += w.calories;
      if (w.type === "strength") {
        for (const it of parseStrength(w.strength)) {
          tonnage += it.weight * it.reps * it.sets;
        }
      }
    }
    return { sessions: weekWorkouts.length, cardioKm, totalMin, calories, tonnage, activeDays: days.size };
  }, [weekWorkouts]);

  // ===== Coach: skor kesiapan =====
  const todayCheckin = checkins.find((c) => c.date === today);
  const refCheckin = todayCheckin ?? checkins[0] ?? null;

  let readiness: number | null = null;
  let readinessLabel = "";
  if (refCheckin) {
    const sleepHours = refCheckin.sleepHours ?? 7;
    const soreness = refCheckin.soreness ?? 3;
    const stress = refCheckin.stress ?? 3;
    const energy = refCheckin.energy ?? 3;
    readiness = clampScore(sleepHours * 12 + (5 - soreness) * 10 + (5 - stress) * 8 + energy * 10);
    readinessLabel =
      readiness >= 75 ? "Mantap — boleh latihan intens hari ini" : readiness >= 50 ? "Wajar — intensitas moderat" : "Kurang — recovery dulu";
  }

  // ===== Coach: deteksi deload sederhana =====
  const deloadExercise = React.useMemo(() => {
    const strengthWorkouts = workouts
      .filter((w) => w.type === "strength")
      .sort((a, b) => b.date.localeCompare(a.date));
    const byEx = new Map<string, number[]>(); // max weight per sesi, urut terbaru dulu
    for (const w of strengthWorkouts) {
      const byName = new Map<string, number>();
      for (const it of parseStrength(w.strength)) {
        byName.set(it.exercise, Math.max(byName.get(it.exercise) ?? 0, it.weight));
      }
      byName.forEach((maxW, name) => {
        const arr = byEx.get(name) ?? [];
        arr.push(maxW);
        byEx.set(name, arr);
      });
    }
    for (const [name, occ] of byEx) {
      if (occ.length >= 3 && occ[0] <= occ[2]) return name;
    }
    return null;
  }, [workouts]);

  const cardioWeekCount = weekWorkouts.filter((w) => w.type !== "strength").length;
  const varietyWarning = cardioWeekCount >= 5;

  if (loading) return <TabSkeleton />;

  return (
    <>
      {/* Ringkasan mingguan — ring aktivitas vs sasaran */}
      <SectionCard title="Ringkasan Pekan Ini" tone="studio" icon={<Timer className="h-4 w-4 text-studio-deep" />}>
        <div className="flex items-center gap-4">
          <ActivityRings
            size={132}
            stroke={12}
            gap={4}
            rings={[
              { value: summary.sessions, max: Math.max(1, goals.weeklySessions), color: SAGE_DEEP },
              { value: summary.totalMin, max: Math.max(1, goals.weeklyMinutes), color: SAGE },
              { value: summary.activeDays, max: 7, color: "var(--chart-3)" },
            ]}
          />
          <div className="min-w-0 flex-1 space-y-2">
            <RingLegend
              color={SAGE_DEEP}
              label="Sesi"
              display={`${summary.sessions}/${goals.weeklySessions}`}
              pct={goals.weeklySessions > 0 ? summary.sessions / goals.weeklySessions : 0}
            />
            <RingLegend
              color={SAGE}
              label="Durasi"
              display={`${formatDuration(summary.totalMin)}/${formatDuration(goals.weeklyMinutes)}`}
              pct={goals.weeklyMinutes > 0 ? summary.totalMin / goals.weeklyMinutes : 0}
            />
            <RingLegend
              color="var(--chart-3)"
              label="Hari aktif"
              display={`${summary.activeDays}/7`}
              pct={summary.activeDays / 7}
            />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <StatTile label="Kardio" value={formatNumber(summary.cardioKm, 1)} sub="km" icon={<Footprints className="h-3.5 w-3.5" />} tone="studio" />
          <StatTile label="Tonase" value={formatNumber(summary.tonnage, 0)} sub="kg beban" icon={<Scale className="h-3.5 w-3.5" />} tone="studio" />
          <StatTile label="Kalori" value={formatNumber(summary.calories)} sub="kkal" icon={<Flame className="h-3.5 w-3.5" />} tone="studio" />
        </div>
        <WeeklyDailyCharts workouts={workouts} />
      </SectionCard>

      {/* Kartu Coach */}
      <SectionCard
        title="Coach Latihan"
        tone="gold"
        icon={<Sparkles className="h-4 w-4 text-gold" />}
      >
        {refCheckin && readiness !== null ? (
          <div className="flex items-center gap-4">
            <RingStat
              progress={readiness / 100}
              size={110}
              stroke={11}
              color={readiness >= 50 ? SAGE : CLAY}
              value={<span className="text-2xl leading-none">{readiness}</span>}
              caption="skor kesiapan"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Kesiapan latihan</p>
              <p className="text-sm font-bold leading-snug">{readinessLabel}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Berdasarkan check-in {todayCheckin ? "hari ini" : formatDateID(refCheckin.date)}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Belum ada check-in terbaru. Isi dulu agar coach bisa menilai kesiapanmu.
          </div>
        )}

        {refCheckin && (
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
            <ReadinessBar
              label="Tidur"
              value={refCheckin.sleepHours}
              max={8}
              display={refCheckin.sleepHours !== null ? `${formatNumber(refCheckin.sleepHours, 1)} jam` : "–"}
              color={SAGE}
              overColor={SAGE}
            />
            <ReadinessBar
              label="Energi"
              value={refCheckin.energy}
              max={5}
              display={refCheckin.energy !== null ? `${refCheckin.energy}/5` : "–"}
              color={refCheckin.energy !== null && refCheckin.energy <= 2 ? CLAY : SAGE}
            />
            <ReadinessBar
              label="Nyeri"
              value={refCheckin.soreness}
              max={5}
              display={refCheckin.soreness !== null ? `${refCheckin.soreness}/5` : "–"}
              color={refCheckin.soreness !== null && refCheckin.soreness >= 3 ? CLAY : SAGE}
            />
            <ReadinessBar
              label="Stres"
              value={refCheckin.stress}
              max={5}
              display={refCheckin.stress !== null ? `${refCheckin.stress}/5` : "–"}
              color={refCheckin.stress !== null && refCheckin.stress >= 3 ? CLAY : SAGE}
            />
          </div>
        )}

        <ul className="mt-3 space-y-2">
          {deloadExercise && (
            <li className="flex items-start gap-2 rounded-xl bg-clay-soft p-2.5">
              <AlertTriangle className="h-4 w-4 text-clay-deep shrink-0 mt-0.5" />
              <span className="text-sm text-clay-deep leading-snug">
                <span className="font-bold">{deloadExercise}</span> tidak naik beban dalam 3 sesi terakhir — pertimbangkan
                sesi deload (turunkan volume sekitar 30%).
              </span>
            </li>
          )}
          {varietyWarning && (
            <li className="flex items-start gap-2 rounded-xl bg-gold-soft p-2.5">
              <Shuffle className="h-4 w-4 text-gold shrink-0 mt-0.5" />
              <span className="text-sm text-foreground leading-snug">
                Sudah <span className="font-bold tabular">{cardioWeekCount} sesi kardio</span> pekan ini — beri variasi
                gerakan atau recovery aktif agar Adaptasi tetap optimal.
              </span>
            </li>
          )}
          {!deloadExercise && !varietyWarning && (
            <li className="flex items-start gap-2 rounded-xl bg-garden-soft p-2.5">
              <CheckCircle2 className="h-4 w-4 text-garden-deep shrink-0 mt-0.5" />
              <span className="text-sm text-garden-deep leading-snug">
                Pola latihan seimbang — tidak ada tanda overtraining pekan ini.
              </span>
            </li>
          )}
        </ul>

        {!todayCheckin && (
          <Button
            onClick={() => openQuickAction("checkin")}
            className="press mt-3 w-full h-11 rounded-xl bg-gold text-white font-bold hover:bg-gold/90 min-h-[44px]"
          >
            <HeartPulse className="h-4 w-4" /> Isi check-in
          </Button>
        )}
      </SectionCard>

      {/* Kalkulator e1RM — papan rekor */}
      <E1rmCard workouts={workouts} />

      {/* Keseimbangan otot */}
      <MuscleBalanceCard workouts={workouts} />

      {/* Riwayat aktivitas */}
      <HistorySection workouts={workouts} />

      {/* Rekap tren 6 pekan */}
      <TrendSection workouts={workouts} />
    </>
  );
}

// ---------- e1RM ----------

function E1rmCard({ workouts }: { workouts: Workout[] }) {
  const openQuickAction = useRutinaStore((s) => s.setQuickAction);
  const top3 = React.useMemo(() => {
    const best = new Map<string, { name: string; muscleGroup: string; e1rm: number }>();
    const history = new Map<string, number[]>();
    const dated = workouts.filter((w) => w.type === "strength").sort((a, b) => a.date.localeCompare(b.date));
    for (const w of dated) {
      const byName = new Map<string, { e1rm: number; muscleGroup: string }>();
      for (const it of parseStrength(w.strength)) {
        const val = it.weight * (1 + it.reps / 30);
        const cur = byName.get(it.exercise);
        if (!cur || val > cur.e1rm) byName.set(it.exercise, { e1rm: val, muscleGroup: it.muscleGroup });
      }
      byName.forEach((v, name) => {
        const arr = history.get(name) ?? [];
        arr.push(v.e1rm);
        history.set(name, arr);
        const b = best.get(name);
        if (!b || v.e1rm > b.e1rm) best.set(name, { name, muscleGroup: v.muscleGroup, e1rm: v.e1rm });
      });
    }
    return [...best.values()]
      .sort((a, b) => b.e1rm - a.e1rm)
      .slice(0, 3)
      .map((r) => ({ ...r, history: history.get(r.name) ?? [] }));
  }, [workouts]);

  const rankTone = ["text-gold", "text-muted-foreground", "text-gold-deep"];

  return (
    <SectionCard title="Kalkulator e1RM" tone="studio" icon={<Trophy className="h-4 w-4 text-studio-deep" />}>
      <p className="text-xs text-muted-foreground mb-3">
        Papan rekor satu repetisi maksimal (rumus Epley) dari semua sesi beban.
      </p>
      {top3.length === 0 ? (
        <EmptyState
          icon={<Dumbbell className="h-6 w-6" />}
          title="Belum ada data beban"
          description="Catat sesi latihan beban untuk melihat papan rekor e1RM-mu."
          action={
            <Button
              onClick={() => openQuickAction("workout")}
              className="press bg-studio-deep text-white text-sm font-bold rounded-xl px-4 py-2.5 min-h-[44px] inline-flex items-center justify-center"
            >
              Catat Latihan
            </Button>
          }
        />
      ) : (
        <ol className="space-y-2">
          {top3.map((row, idx) => (
            <li
              key={row.name}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 px-3 py-2.5"
            >
              <span className={cn("flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-bold tabular", rankTone[idx])}>
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate">{row.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{row.muscleGroup}</p>
                {row.history.length >= 2 && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <Sparkline data={row.history} height={24} color={SAGE} className="min-w-0 flex-1" />
                    <DeltaBadge
                      delta={row.history[row.history.length - 1] - row.history[row.history.length - 2]}
                      suffix=" kg"
                    />
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold tabular text-studio-deep">{formatNumber(row.e1rm, 1)} kg</p>
                <p className="text-xs text-muted-foreground">e1RM</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}

// ---------- Keseimbangan otot ----------

type MuscleGroupKey = "push" | "pull" | "legs" | "core";

const MUSCLE_GROUPS: { key: MuscleGroupKey; label: string; short: string; match: string[] }[] = [
  {
    key: "push",
    label: "Push (dada · bahu · trisep)",
    short: "push",
    match: ["dada", "chest", "pect", "bahu", "shoulder", "delt", "trisep", "triceps"],
  },
  { key: "pull", label: "Pull (punggung · bisep)", short: "pull", match: ["punggung", "back", "lats", "bisep", "biceps"] },
  {
    key: "legs",
    label: "Kaki (quads · hamstring · glute)",
    short: "kaki",
    match: ["kaki", "leg", "qua", "hamstring", "glute", "calf", "betis"],
  },
  { key: "core", label: "Core & lainnya", short: "core", match: [] },
];

function classifyMuscleGroup(raw: string): MuscleGroupKey {
  const s = raw.toLowerCase();
  for (const g of MUSCLE_GROUPS) {
    if (g.match.some((m) => s.includes(m))) return g.key;
  }
  return "core";
}

function MuscleBalanceCard({ workouts }: { workouts: Workout[] }) {
  const openQuickAction = useRutinaStore((s) => s.setQuickAction);
  const rows = React.useMemo(() => {
    const end = todayStr();
    const start = addDays(end, -29);
    const vol = new Map<string, number>();
    for (const w of workouts) {
      if (w.type !== "strength" || w.date < start || w.date > end) continue;
      for (const it of parseStrength(w.strength)) {
        const key = classifyMuscleGroup(it.muscleGroup);
        vol.set(key, (vol.get(key) ?? 0) + it.weight * it.reps * it.sets);
      }
    }
    return MUSCLE_GROUPS.map((g) => ({
      key: g.key,
      label: g.label,
      short: g.short,
      tonnage: Math.round(vol.get(g.key) ?? 0),
    }));
  }, [workouts]);

  const mainMax = Math.max(...rows.filter((r) => r.key !== "core").map((r) => r.tonnage), 0);
  const weakMain = rows.filter((r) => r.key !== "core" && mainMax > 0 && r.tonnage < mainMax * 0.5);
  const total = rows.reduce((a, r) => a + r.tonnage, 0);

  return (
    <SectionCard title="Keseimbangan Otot" tone="studio" icon={<Shuffle className="h-4 w-4 text-studio-deep" />}>
      <p className="mb-3 text-xs text-muted-foreground">Volume tonase per kelompok otot dalam 30 hari terakhir.</p>
      {total === 0 ? (
        <EmptyState
          icon={<Dumbbell className="h-6 w-6" />}
          title="Belum ada volume beban"
          description="Catat sesi latihan beban untuk melihat keseimbangan push, pull, dan kaki."
          action={
            <Button
              onClick={() => openQuickAction("workout")}
              className="press bg-studio-deep text-white text-sm font-bold rounded-xl px-4 py-2.5 min-h-[44px] inline-flex items-center justify-center"
            >
              Catat Latihan
            </Button>
          }
        />
      ) : (
        <>
          <HBarList
            items={rows
              .filter((r) => r.key !== "core" || r.tonnage > 0)
              .map((r) => ({
                label: r.label,
                value: r.tonnage,
                max: Math.max(1, mainMax),
                color: r.key !== "core" && mainMax > 0 && r.tonnage < mainMax * 0.5 ? CLAY : SAGE,
                caption: `${formatNumber(r.tonnage)} kg`,
              }))}
          />
          {weakMain.length > 0 ? (
            <p className="mt-3 rounded-xl bg-clay-soft px-3 py-2.5 text-xs leading-snug text-clay-deep">
              Ketimpangan terdeteksi — tambah volume untuk {weakMain.map((w) => w.short).join(", ")}.
            </p>
          ) : (
            <p className="mt-3 rounded-xl bg-garden-soft px-3 py-2.5 text-xs leading-snug text-garden-deep">
              Distribusi volume push · pull · kaki relatif seimbang.
            </p>
          )}
        </>
      )}
    </SectionCard>
  );
}

// ---------- Riwayat ----------

function HistorySection({ workouts }: { workouts: Workout[] }) {
  const openQuickAction = useRutinaStore((s) => s.setQuickAction);
  const today = todayStr();
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [range, setRange] = React.useState<7 | 30 | 90>(30);

  // ux-guidelines #84: pratinjau 5 sesi teratas, sisanya via disclosure "Lihat semua"
  const [showAllWorkouts, setShowAllWorkouts] = React.useState(false);

  // Disclosure direset ke tertutup saat filter tipe/rentang berubah
  React.useEffect(() => {
    setShowAllWorkouts(false);
  }, [typeFilter, range]);

  const filtered = React.useMemo(
    () =>
      workouts.filter(
        (w) =>
          (typeFilter === "all" || w.type === typeFilter) &&
          w.date >= addDays(today, -(range - 1)) &&
          w.date <= today
      ),
    [workouts, typeFilter, range, today]
  );

  return (
    <SectionCard title="Riwayat Aktivitas" tone="studio" icon={<MapPin className="h-4 w-4 text-studio-deep" />}>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {[{ key: "all", label: "Semua" }, ...TYPE_FILTERS].map((f) => (
          <button
            key={f.key}
            onClick={() => setTypeFilter(f.key)}
            aria-pressed={typeFilter === f.key}
            className={cn(
              "press shrink-0 rounded-full px-4 py-2 text-xs font-semibold min-h-[44px]",
              typeFilter === f.key
                ? "bg-studio text-white shadow-soft"
                : "bg-secondary text-muted-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mt-2 mb-3">
        {([7, 30, 90] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            aria-pressed={range === r}
            className={cn(
              "press flex-1 rounded-full px-3 py-2 text-xs font-semibold min-h-[44px]",
              range === r ? "bg-studio-soft text-studio-deep border border-studio/40" : "bg-secondary text-muted-foreground"
            )}
          >
            {r} hari
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Route className="h-6 w-6" />}
          title="Belum ada sesi"
          description={`Tidak ada latihan ${typeFilter !== "all" ? "pada filter ini " : ""}${range} hari terakhir.`}
          action={
            <Button
              onClick={() => openQuickAction("workout")}
              className="press bg-studio-deep text-white text-sm font-bold rounded-xl px-4 py-2.5 min-h-[44px] inline-flex items-center justify-center"
            >
              Catat Latihan
            </Button>
          }
        />
      ) : (
        <div id="riwayat-aktivitas-list" className="max-h-[440px] overflow-y-auto scroll-thin space-y-2 pr-0.5">
          {/* ux-guidelines #84: saat tertutup, maksimal 5 sesi teratas */}
          {(showAllWorkouts ? filtered : filtered.slice(0, 5)).map((w) => (
            <WorkoutHistoryCard key={w.id} workout={w} />
          ))}
          {/* ux-guidelines #84: disclosure "Lihat semua" di bawah daftar (aria-controls → riwayat-aktivitas-list) */}
          {(filtered.length > 5 || showAllWorkouts) && (
            <ShowAllToggle
              total={filtered.length}
              visibleCount={showAllWorkouts ? filtered.length : Math.min(filtered.length, 5)}
              expanded={showAllWorkouts}
              onToggle={() => setShowAllWorkouts((v) => !v)}
              controlsId="riwayat-aktivitas-list"
            />
          )}
        </div>
      )}
    </SectionCard>
  );
}

// React.memo: props stabil (objek workout dari hasil useMemo, tanpa callback inline)
const WorkoutHistoryCard = React.memo(function WorkoutHistoryCard({ workout: w }: { workout: Workout }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = React.useState(false);
  const meta = TYPE_META[w.type];
  const Icon = meta.icon;
  const items = w.type === "strength" ? parseStrength(w.strength) : [];

  const deleteMutation = useMutation({
    mutationFn: rutinaApi.deleteWorkout,
    onSuccess: () => {
      invalidateAfterMutation(queryClient, ["workouts"]);
      toast.success("Latihan dihapus");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Gagal menghapus latihan");
    },
  });

  return (
    <article className="rounded-xl border border-border/70 bg-card p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-studio-soft text-studio-deep">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{w.title ?? meta.label}</p>
          <p className="text-xs text-muted-foreground">{formatDateID(w.date, true)}</p>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs tabular text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" /> {formatDuration(w.durationMin)}
            </span>
            {w.distanceKm != null && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {formatNumber(w.distanceKm, 1)} km
              </span>
            )}
            {w.paceMin != null && (
              <span className="flex items-center gap-1">
                <Gauge className="h-3.5 w-3.5" /> {formatPace(w.paceMin)}
              </span>
            )}
            {w.calories != null && (
              <span className="flex items-center gap-1">
                <Flame className="h-3.5 w-3.5" /> {formatNumber(w.calories)} kkal
              </span>
            )}
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              aria-label={`Hapus sesi ${w.title ?? meta.label}`}
              className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-clay-soft text-clay-deep"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-[320px]">
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus latihan ini?</AlertDialogTitle>
              <AlertDialogDescription>
                Sesi &ldquo;{w.title ?? meta.label}&rdquo; pada {formatDateID(w.date)} akan dihapus permanen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(w.id)}
                disabled={deleteMutation.isPending}
                className="rounded-xl bg-destructive text-white hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {items.length > 0 && (
        <>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="press mt-2 flex min-h-[44px] items-center gap-1 text-xs font-bold text-studio-deep"
            aria-expanded={expanded}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {items.length} gerakan beban
          </button>
          {expanded && (
            <ul className="mt-1 space-y-2 rounded-xl bg-studio-soft/60 p-2.5">
              {items.map((it, i) => {
                // Tonase per gerakan dibandingkan gerakan terberat sesi ini —
                // angka mentah kg×rep×set kini didampingi bar visual (ux-guidelines)
                const tonnage = it.weight * it.reps * it.sets;
                const maxTonnage = Math.max(1, ...items.map((x) => x.weight * x.reps * x.sets));
                return (
                  <li key={`${it.exercise}-${i}`}>
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate font-semibold">{it.exercise}</span>
                      <span className="shrink-0 tabular text-muted-foreground">
                        {formatNumber(it.weight, 1)}kg × {it.reps} × {it.sets}
                        <span className="ml-1.5 font-bold text-studio-deep">{formatNumber(tonnage, 0)}kg</span>
                      </span>
                    </div>
                    <MetricBar
                      value={tonnage}
                      max={maxTonnage}
                      height={4}
                      className="mt-1"
                      color={SAGE_DEEP}
                      label={`Volume ${it.exercise}`}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </article>
  );
});

// ---------- Tren 6 pekan ----------

function TrendSection({ workouts }: { workouts: Workout[] }) {
  const today = todayStr();

  const data = React.useMemo(() => {
    const weeks: { label: string; Sesi: number; Menit: number; Tonase: number; Jarak: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = weekStart(addDays(today, -7 * i));
      const end = addDays(start, 6);
      const inWeek = workouts.filter((w) => w.date >= start && w.date <= end);
      let tonnage = 0;
      let km = 0;
      for (const w of inWeek) {
        if (w.distanceKm != null) km += w.distanceKm;
        if (w.type === "strength") {
          for (const it of parseStrength(w.strength)) tonnage += it.weight * it.reps * it.sets;
        }
      }
      weeks.push({
        label: String(parseDateStr(start).getDate()),
        Sesi: inWeek.length,
        Menit: Math.round(inWeek.reduce((a, w) => a + w.durationMin, 0)),
        Tonase: Math.round(tonnage),
        Jarak: Math.round(km * 10) / 10,
      });
    }
    return weeks;
  }, [workouts, today]);

  return (
    <SectionCard title="Rekap Tren 6 Pekan" tone="studio" icon={<Activity className="h-4 w-4 text-studio-deep" />}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
            Sesi per pekan
          </p>
          <MiniBars data={data.map((d) => ({ label: d.label, value: d.Sesi }))} height={64} labelEvery={2} />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
            Menit per pekan
          </p>
          <MiniBars
            data={data.map((d) => ({ label: d.label, value: d.Menit }))}
            height={64}
            labelEvery={2}
            color={SAGE_DEEP}
          />
        </div>
      </div>
      <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
        <TrendSparkRow title="Tonase beban per pekan" unit="kg" data={data.map((d) => d.Tonase)} />
        <TrendSparkRow
          title="Jarak kardio per pekan"
          unit="km"
          digits={1}
          data={data.map((d) => d.Jarak)}
          color={SAGE_DEEP}
        />
      </div>
    </SectionCard>
  );
}

function TrendSparkRow({
  title,
  data,
  unit,
  digits = 0,
  color = SAGE,
}: {
  title: string;
  data: number[];
  unit: string;
  digits?: number;
  color?: string;
}) {
  const last = data.length > 0 ? data[data.length - 1] : 0;
  const prev = data.length >= 2 ? data[data.length - 2] : null;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">{title}</span>
        <span className="flex items-center gap-1.5">
          <span className="text-xs font-bold tabular">
            {formatNumber(last, digits)} {unit}
          </span>
          {prev !== null && <DeltaBadge delta={last - prev} suffix={` ${unit}`} />}
        </span>
      </div>
      <Sparkline data={data} height={34} color={color} />
    </div>
  );
}

// ============================================================
// TAB ASUPAN
// ============================================================

function NutritionTab({ workouts = [] }: { workouts?: Workout[] }) {
  const queryClient = useQueryClient();
  const openQuickAction = useRutinaStore((s) => s.setQuickAction);
  const foodsQuery = useQuery({ queryKey: ["foods"], queryFn: rutinaApi.foods });

  const [calTarget, setCalTarget] = React.useState(() => readCalorieTarget());
  const [targetDraft, setTargetDraft] = React.useState(() => String(readCalorieTarget()));

  // Di-memo: array baru tiap render akan memaksa semua useMemo turunannya menghitung ulang
  const entries = React.useMemo(() => foodsQuery.data?.entries ?? [], [foodsQuery.data]);
  const today = todayStr();
  const todayEntries = React.useMemo(() => entries.filter((e) => e.date === today), [entries, today]);

  const totals = React.useMemo(() => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    for (const e of todayEntries) {
      calories += e.calories;
      protein += e.protein ?? 0;
      carbs += e.carbs ?? 0;
      fat += e.fat ?? 0;
    }
    return { calories, protein, carbs, fat };
  }, [todayEntries]);

  const trend7 = React.useMemo(() => {
    return rangeDays(addDays(today, -6), today).map((d) => ({
      label: dayName(d, true),
      value: Math.round(entries.filter((e) => e.date === d).reduce((a, e) => a + e.calories, 0)),
    }));
  }, [entries, today]);

  const macro7 = React.useMemo(() => {
    return rangeDays(addDays(today, -6), today).map((d) => {
      const dayEntries = entries.filter((e) => e.date === d);
      return {
        label: dayName(d, true),
        Protein: Math.round(dayEntries.reduce((a, e) => a + (e.protein ?? 0), 0)),
        Karbo: Math.round(dayEntries.reduce((a, e) => a + (e.carbs ?? 0), 0)),
        Lemak: Math.round(dayEntries.reduce((a, e) => a + (e.fat ?? 0), 0)),
      };
    });
  }, [entries, today]);

  const balance7 = React.useMemo(() => {
    return rangeDays(addDays(today, -6), today).map((d) => ({
      label: dayName(d, true),
      value: Math.round(entries.filter((e) => e.date === d).reduce((a, e) => a + e.calories, 0)),
      alt: Math.round(workouts.filter((w) => w.date === d).reduce((a, w) => a + (w.calories ?? 0), 0)),
    }));
  }, [entries, workouts, today]);

  const deleteMutation = useMutation({
    mutationFn: rutinaApi.deleteFood,
    onSuccess: () => {
      invalidateAfterMutation(queryClient, ["foods"]);
      toast.success("Asupan dihapus");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Gagal menghapus asupan");
    },
  });

  const saveTarget = () => {
    const n = Number(targetDraft);
    if (!Number.isFinite(n) || n < 500 || n > 10000) {
      toast.error("Target kalori harus antara 500 dan 10.000 kkal");
      return;
    }
    const v = Math.round(n);
    if (typeof window !== "undefined") window.localStorage.setItem("rutina-calorie-target", String(v));
    setCalTarget(v);
    toast.success("Target kalori diperbarui");
  };

  if (foodsQuery.isLoading) return <TabSkeleton />;

  const remaining = calTarget - Math.round(totals.calories);
  const over = remaining < 0;
  const progress = calTarget > 0 ? totals.calories / calTarget : 0;

  const macroRows = [
    { label: "Protein", grams: totals.protein },
    { label: "Karbohidrat", grams: totals.carbs },
    { label: "Lemak", grams: totals.fat },
  ];
  const macroTotal = macroRows.reduce((a, m) => a + m.grams, 0);

  return (
    <>
      {/* Ring kalori */}
      <SectionCard title="Kalori Hari Ini" tone="studio" icon={<Flame className="h-4 w-4 text-studio-deep" />}>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <div className="flex justify-center">
            <ProgressRing
              progress={progress}
              size={148}
              stroke={13}
              color={over ? "var(--clay)" : "var(--chart-1)"}
            >
              <div className="text-center px-3">
                <p className="text-2xl font-bold tabular leading-none">{formatNumber(Math.round(totals.calories))}</p>
                <p className="text-xs text-muted-foreground mt-1">dari {formatNumber(calTarget)} kkal</p>
              </div>
            </ProgressRing>
          </div>
          <div className="w-full space-y-2.5 sm:w-auto sm:flex-1">
            <p className={cn("text-sm font-bold text-center sm:text-left", over ? "text-clay-deep" : "text-garden-deep")}>
              {over
                ? `Lebih ${formatNumber(-remaining)} kkal dari target`
                : `Sisa ${formatNumber(remaining)} kkal hari ini`}
            </p>
            <div>
              <MetricBar value={totals.calories} max={Math.max(1, calTarget)} height={10} />
              <div className="mt-1 flex justify-between text-xs text-muted-foreground tabular">
                <span>Tercatat {formatNumber(Math.round(totals.calories))} kkal</span>
                <span>Target {formatNumber(calTarget)} kkal</span>
              </div>
            </div>
            <div>
              <label htmlFor="target-kalori" className="mb-1 block text-xs font-semibold text-muted-foreground">
                Target kalori harian (kkal)
              </label>
              <div className="flex gap-2">
                <Input
                  id="target-kalori"
                  type="number"
                  inputMode="numeric"
                  min={500}
                  max={10000}
                  aria-label="Target kalori harian"
                  value={targetDraft}
                  onChange={(e) => setTargetDraft(e.target.value)}
                  className="h-11 flex-1 tabular"
                />
              <Button
                type="button"
                onClick={saveTarget}
                variant="secondary"
                className="press h-11 rounded-xl px-5 text-xs font-bold min-h-[44px]"
              >
                Ubah Target
              </Button>
            </div>
            </div>
            <Button
              type="button"
              onClick={() => openQuickAction("food")}
              className="press h-11 w-full rounded-xl bg-studio text-white font-bold hover:bg-studio-deep min-h-[44px]"
            >
              <Plus className="h-4 w-4" /> Catat Asupan
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* Neraca kalori */}
      <SectionCard title="Neraca Kalori 7 Hari" tone="studio" icon={<Activity className="h-4 w-4 text-studio-deep" />}>
        <MiniBars data={balance7} height={72} color={SAGE} altColor={CLAY} showAlt altLabel="Keluar (latihan)" highlightIndex={6} />
        <div className="mt-2 flex items-center justify-center gap-4">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: SAGE }} /> Masuk (makan)
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: CLAY }} /> Keluar (latihan)
          </span>
        </div>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          Kalori keluar dihitung dari sesi latihan yang mencatat kalori.
        </p>
      </SectionCard>

      {/* Makro */}
      <SectionCard title="Makro Hari Ini" tone="studio" icon={<Scale className="h-4 w-4 text-studio-deep" />}>
        {macroTotal > 0 ? (
          <div className="space-y-3">
            <StackBar
              segments={macroRows.map((m, i) => ({
                label: m.label,
                value: m.grams,
                color: rampColor(i, macroRows.length),
              }))}
              height={14}
            />
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {macroRows.map((m, i) => (
                <span key={m.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: rampColor(i, macroRows.length) }} />
                  {m.label}
                  <span className="font-bold tabular text-foreground">{formatNumber(m.grams, 1)} g</span>
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Proporsi dari total makro tercatat hari ini.</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Belum ada data makro hari ini.</p>
        )}
      </SectionCard>

      {/* Entri per meal */}
      <SectionCard title="Asupan Hari Ini" tone="studio" icon={<UtensilsCrossed className="h-4 w-4 text-studio-deep" />}>
        {todayEntries.length === 0 ? (
          <EmptyState
            icon={<UtensilsCrossed className="h-6 w-6" />}
            title="Belum ada asupan hari ini"
            description="Catat makanan pertamamu untuk memantau kalori dan makro."
            action={
              <Button
                onClick={() => openQuickAction("food")}
                className="press rounded-xl bg-studio text-white font-bold hover:bg-studio-deep min-h-[44px]"
              >
                <Plus className="h-4 w-4" /> Catat Asupan
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {/* Distribusi kalori per waktu makan */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
                Distribusi kalori hari ini
              </p>
              <StackBar
                segments={MEAL_META.map((meal, i) => ({
                  label: meal.label,
                  value: todayEntries.filter((e) => e.meal === meal.key).reduce((a, e) => a + e.calories, 0),
                  color: rampColor(i, MEAL_META.length),
                }))}
              />
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                {MEAL_META.map((meal, i) => {
                  const kcal = todayEntries.filter((e) => e.meal === meal.key).reduce((a, e) => a + e.calories, 0);
                  const total = todayEntries.reduce((a, e) => a + e.calories, 0) || 1;
                  return (
                    <span key={meal.key} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <span className="h-2 w-2 rounded-[3px]" style={{ background: rampColor(i, MEAL_META.length) }} />
                      {meal.label} {Math.round((kcal / total) * 100)}%
                    </span>
                  );
                })}
              </div>
            </div>
            {MEAL_META.map((meal) => {
              const mealEntries = todayEntries.filter((e) => e.meal === meal.key);
              const mealKcal = mealEntries.reduce((a, e) => a + e.calories, 0);
              return (
                <div key={meal.key}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{meal.label}</span>
                    <span className="text-xs font-bold tabular text-studio-deep">{formatNumber(mealKcal)} kkal</span>
                  </div>
                  {mealEntries.length === 0 ? (
                    <p className="rounded-xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                      Belum ada catatan.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {mealEntries.map((e) => (
                        <li
                          key={e.id}
                          className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{e.name}</p>
                            {e.portion && <p className="text-xs text-muted-foreground truncate">{e.portion}</p>}
                          </div>
                          <span className="shrink-0 text-xs font-bold tabular text-studio-deep">
                            {formatNumber(e.calories)} kkal
                          </span>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                disabled={deleteMutation.isPending}
                                aria-label={`Hapus ${e.name}`}
                                className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-clay-soft text-clay-deep"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="max-w-[320px]">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus catatan asupan ini?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Catatan &ldquo;{e.name}&rdquo; akan dihapus permanen dan tidak bisa dikembalikan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(e.id)}
                                  disabled={deleteMutation.isPending}
                                  className="rounded-xl bg-destructive text-white hover:bg-destructive/90"
                                >
                                  {deleteMutation.isPending ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin" /> Menghapus…
                                    </>
                                  ) : (
                                    "Hapus"
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Tren 7 hari */}
      <SectionCard title="Tren 7 Hari" tone="studio" icon={<Activity className="h-4 w-4 text-studio-deep" />}>
        <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Kalori (kkal/hari)</p>
        <MiniBars data={trend7} height={72} color={SAGE} highlightIndex={6} />
        <p className="mt-1.5 text-center text-xs text-muted-foreground">
          Rata-rata {formatNumber(Math.round(trend7.reduce((a, d) => a + d.value, 0) / Math.max(1, trend7.length)))} kkal/hari · target{" "}
          {formatNumber(calTarget)} kkal.
        </p>
        <div className="mt-4 border-t border-border/60 pt-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Makro (g/hari)</p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { title: "Protein", values: macro7.map((m) => m.Protein), color: rampColor(0, 3) },
                { title: "Karbo", values: macro7.map((m) => m.Karbo), color: rampColor(1, 3) },
                { title: "Lemak", values: macro7.map((m) => m.Lemak), color: rampColor(2, 3) },
              ] as const
            ).map((col) => (
              <div key={col.title}>
                <p className="mb-1 text-xs font-semibold text-muted-foreground">{col.title}</p>
                <MiniBars
                  data={trend7.map((d, i) => ({ label: d.label, value: col.values[i] }))}
                  height={44}
                  color={col.color}
                  labelEvery={2}
                  highlightIndex={6}
                />
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
    </>
  );
}

function readCalorieTarget(): number {
  if (typeof window === "undefined") return 2200;
  const raw = window.localStorage.getItem("rutina-calorie-target");
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= 500 && n <= 10000 ? n : 2200;
}

// ============================================================
// TAB TUBUH
// ============================================================

interface FitnessGoals {
  weeklySessions: number;
  weeklyMinutes: number;
  dailyHydration: number;
  weightGoalKg?: number | null;
}

const DEFAULT_GOALS: FitnessGoals = { weeklySessions: 5, weeklyMinutes: 240, dailyHydration: 8 };

function readGoals(): FitnessGoals {
  if (typeof window === "undefined") return DEFAULT_GOALS;
  try {
    const raw = window.localStorage.getItem("rutina-fitness-goals");
    if (!raw) return DEFAULT_GOALS;
    return { ...DEFAULT_GOALS, ...(JSON.parse(raw) as Partial<FitnessGoals>) };
  } catch {
    return DEFAULT_GOALS;
  }
}

// ---------- Bar skor check-in (1-5) ----------

function scoreBar(label: string, value: number | null, highIsBad: boolean) {
  const color =
    value === null ? SAGE : highIsBad ? (value >= 3 ? CLAY : SAGE) : value <= 2 ? CLAY : SAGE;
  return { label, value: value ?? 0, max: 5, color, caption: value !== null ? `${value}/5` : "–" };
}

// ---------- Bar progres sasaran ----------

function GoalProgressRow({ label, value, max, display }: { label: string; value: number; max: number; display: string }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <span className="text-xs font-bold tabular">{display}</span>
      </div>
      <MetricBar value={value} max={Math.max(1, max)} color={SAGE} overColor={SAGE} height={6} />
    </div>
  );
}

function BodyTab({
  workouts,
  checkins,
  goals,
  onGoalsChange,
}: {
  workouts: Workout[];
  checkins: CheckIn[];
  goals: FitnessGoals;
  onGoalsChange: (next: FitnessGoals) => void;
}) {
  const queryClient = useQueryClient();
  const openQuickAction = useRutinaStore((s) => s.setQuickAction);
  const metricsQuery = useQuery({ queryKey: ["body-metrics"], queryFn: rutinaApi.bodyMetrics });
  const metrics = metricsQuery.data?.metrics ?? [];

  const today = todayStr();
  const todayMetric = metrics.find((m) => m.date === today);

  // ===== Berat =====
  const weightPoints = metrics.filter((m) => m.weightKg !== null) as (BodyMetric & { weightKg: number })[];
  const latestWeight = weightPoints.length > 0 ? weightPoints[weightPoints.length - 1] : null;
  const [weightRange, setWeightRange] = React.useState<30 | 90 | 365>(30);
  const [weightInput, setWeightInput] = React.useState("");

  const weightData = weightPoints
    .filter((p) => p.date >= addDays(today, -(weightRange - 1)))
    .map((p) => ({ label: formatDayMonth(p.date), value: p.weightKg }));
  const weightDelta = weightData.length >= 2 ? weightData[weightData.length - 1].value - weightData[0].value : null;

  const weightMutation = useMutation({
    mutationFn: rutinaApi.upsertBodyMetric,
    onSuccess: () => {
      invalidateAfterMutation(queryClient, ["body-metrics"]);
      setWeightInput("");
      toast.success("Berat badan tersimpan");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Gagal menyimpan berat");
    },
  });

  const submitWeight = () => {
    const n = Number(weightInput);
    if (!Number.isFinite(n) || n < 20 || n > 300) {
      toast.error("Masukkan berat badan yang wajar (20-300 kg)");
      return;
    }
    weightMutation.mutate({ date: today, weightKg: Math.round(n * 10) / 10 });
  };

  // ===== Hidrasi =====
  const glasses = Math.round(todayMetric?.hydrationGlasses ?? 0);
  const hydrationMutation = useMutation({
    mutationFn: rutinaApi.upsertBodyMetric,
    onSuccess: () => {
      invalidateAfterMutation(queryClient, ["body-metrics"]);
      toast.success("Hidrasi dicatat");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Gagal mencatat hidrasi");
    },
  });

  const addGlass = () => {
    hydrationMutation.mutate({ date: today, hydrationGlasses: glasses + 1 });
  };

  // ===== Check-in =====
  const todayCheckin = checkins.find((c) => c.date === today);
  const checkinMap = React.useMemo(() => new Map(checkins.map((c) => [c.date, c])), [checkins]);
  const last14 = rangeDays(addDays(today, -13), today);

  // ===== Sasaran =====
  const [editingGoals, setEditingGoals] = React.useState(false);
  const [goalDraft, setGoalDraft] = React.useState<Record<keyof FitnessGoals, string>>(() => ({
    weeklySessions: String(goals.weeklySessions),
    weeklyMinutes: String(goals.weeklyMinutes),
    dailyHydration: String(goals.dailyHydration),
    weightGoalKg: String(goals.weightGoalKg ?? ""),
  }));

  const wStart = weekStart(today);
  const weekWorkouts = workouts.filter((w) => w.date >= wStart && w.date <= today);
  const weekMinutes = Math.round(weekWorkouts.reduce((a, w) => a + w.durationMin, 0));
  const weekActiveDays = new Set(weekWorkouts.map((w) => w.date)).size;

  const startEditGoals = () => {
    setGoalDraft({
      weeklySessions: String(goals.weeklySessions),
      weeklyMinutes: String(goals.weeklyMinutes),
      dailyHydration: String(goals.dailyHydration),
      weightGoalKg: String(goals.weightGoalKg ?? ""),
    });
    setEditingGoals(true);
  };

  const saveGoals = () => {
    const s = Math.round(Number(goalDraft.weeklySessions));
    const m = Math.round(Number(goalDraft.weeklyMinutes));
    const h = Math.round(Number(goalDraft.dailyHydration));
    const wRaw = goalDraft.weightGoalKg.trim();
    const w = wRaw === "" ? null : Math.round(Number(wRaw) * 10) / 10;
    if (![s, m, h].every((v) => Number.isFinite(v) && v > 0) || s > 35 || m > 3000 || h > 30) {
      toast.error("Sasaran tidak wajar (maks 35 sesi, 3.000 menit, 30 gelas)");
      return;
    }
    if (w !== null && (!Number.isFinite(w) || w < 20 || w > 300)) {
      toast.error("Berat sasaran harus antara 20 dan 300 kg");
      return;
    }
    const next: FitnessGoals = { weeklySessions: s, weeklyMinutes: m, dailyHydration: h, weightGoalKg: w };
    if (typeof window !== "undefined") window.localStorage.setItem("rutina-fitness-goals", JSON.stringify(next));
    onGoalsChange(next);
    setEditingGoals(false);
    toast.success("Sasaran kebugaran diperbarui");
  };

  if (metricsQuery.isLoading) return <TabSkeleton />;

  const checkinBars = todayCheckin
    ? [
        scoreBar("Mood", todayCheckin.mood, false),
        scoreBar("Energi", todayCheckin.energy, false),
        scoreBar("Nyeri", todayCheckin.soreness, true),
        scoreBar("Stres", todayCheckin.stress, true),
      ]
    : [];

  const goalTiles = [
    {
      label: "Sesi Pekan",
      value: `${weekWorkouts.length}/${goals.weeklySessions}`,
      pct: goals.weeklySessions > 0 ? Math.min(100, Math.round((weekWorkouts.length / goals.weeklySessions) * 100)) : 0,
      sub: "sasaran sesi",
      icon: <Dumbbell className="h-3.5 w-3.5" />,
      tone: "studio" as const,
    },
    {
      label: "Menit Pekan",
      value: formatDuration(weekMinutes),
      pct: goals.weeklyMinutes > 0 ? Math.min(100, Math.round((weekMinutes / goals.weeklyMinutes) * 100)) : 0,
      sub: `sasaran ${formatDuration(goals.weeklyMinutes)}`,
      icon: <Timer className="h-3.5 w-3.5" />,
      tone: "garden" as const,
    },
    {
      label: "Hidrasi",
      value: `${glasses}/${goals.dailyHydration}`,
      pct: goals.dailyHydration > 0 ? Math.min(100, Math.round((glasses / goals.dailyHydration) * 100)) : 0,
      sub: "gelas hari ini",
      icon: <Droplets className="h-3.5 w-3.5" />,
      tone: "vault" as const,
    },
  ];

  return (
    <>
      {/* Berat badan */}
      <SectionCard title="Berat Badan" tone="studio" icon={<Scale className="h-4 w-4 text-studio-deep" />}>
        {latestWeight ? (
          <div className="mb-3 flex items-end gap-2">
            <span className="text-3xl font-bold tabular leading-none">{formatNumber(latestWeight.weightKg, 1)}</span>
            <span className="pb-0.5 text-sm font-semibold text-muted-foreground">kg</span>
            {weightDelta !== null && <DeltaBadge delta={weightDelta} suffix=" kg" className="mb-0.5" />}
            <span className="ml-auto pb-0.5 text-xs text-muted-foreground">{formatDateID(latestWeight.date)}</span>
          </div>
        ) : (
          <p className="mb-3 text-sm text-muted-foreground">Belum ada catatan berat badan.</p>
        )}

        <div>
          <label htmlFor="berat-hari-ini" className="mb-1 block text-xs font-semibold text-muted-foreground">
            Catat berat badan hari ini (kg)
          </label>
          <div className="flex gap-2">
            <Input
              id="berat-hari-ini"
              type="number"
              inputMode="decimal"
              step="0.1"
              min={20}
              max={300}
              aria-label="Berat badan hari ini"
              placeholder="67.5"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              className="h-11 flex-1 tabular"
            />
            <Button
              type="button"
              onClick={submitWeight}
              disabled={weightMutation.isPending || weightInput === ""}
              className="press h-11 rounded-xl bg-studio px-5 text-xs font-bold text-white hover:bg-studio-deep min-h-[44px]"
            >
              {weightMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
            </Button>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          {([30, 90, 365] as const).map((r) => (
            <button
              key={r}
              onClick={() => setWeightRange(r)}
              aria-pressed={weightRange === r}
              className={cn(
                "press flex-1 rounded-full px-3 py-2 text-xs font-semibold min-h-[44px]",
                weightRange === r
                  ? "bg-studio-soft text-studio-deep border border-studio/40"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {r === 365 ? "1 tahun" : `${r} hari`}
            </button>
          ))}
        </div>

        {weightData.length >= 2 ? (
          <div className="mt-3">
            <TrendLine
              data={weightData}
              height={170}
              color={SAGE}
              target={goals.weightGoalKg ?? undefined}
              formatValue={(v) => `${formatNumber(v, 1)} kg`}
            />
            {goals.weightGoalKg != null ? (
              <p className="mt-1 text-center text-xs text-muted-foreground">
                Garis putus-putus menandai berat sasaran {formatNumber(goals.weightGoalKg, 1)} kg.
              </p>
            ) : (
              <p className="mt-1 text-center text-xs text-muted-foreground">
                Atur berat sasaran di kartu Sasaran Kebugaran untuk melihat garis target.
              </p>
            )}
          </div>
        ) : (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Minimal dua catatan berat dibutuhkan untuk grafik.
          </p>
        )}
      </SectionCard>

      {/* Hidrasi */}
      <SectionCard title="Hidrasi Hari Ini" tone="vault" icon={<Droplets className="h-4 w-4 text-vault-deep" />}>
        <div className="flex items-center gap-3">
          <div>
            <p className="text-3xl font-bold tabular leading-none">
              {glasses}
              <span className="ml-1 text-sm font-semibold text-muted-foreground">gelas</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Target {goals.dailyHydration} gelas per hari</p>
          </div>
          <Button
            type="button"
            onClick={addGlass}
            disabled={hydrationMutation.isPending}
            className="press ml-auto h-11 rounded-xl bg-vault-soft px-5 text-xs font-bold text-vault-deep hover:bg-vault-soft/80 min-h-[44px]"
          >
            {hydrationMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4" /> 1 Gelas
              </>
            )}
          </Button>
        </div>
        <MetricBar
          value={glasses}
          max={Math.max(1, goals.dailyHydration)}
          color={SAGE}
          overColor={SAGE}
          height={10}
          className="mt-3"
        />
        <p className="mt-1.5 text-xs text-muted-foreground tabular">
          {glasses} dari {goals.dailyHydration} gelas target harian
        </p>
        <div
          role="img"
          className="mt-3 flex flex-wrap items-center gap-1.5"
          aria-label={`Hidrasi ${glasses} dari ${goals.dailyHydration} gelas`}
        >
          {Array.from({ length: Math.max(1, goals.dailyHydration) }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-7 w-7 rounded-full border transition-colors",
                i < glasses ? "border-vault bg-vault" : "border-border/70 bg-secondary"
              )}
            >
              {i < glasses && <Droplets className="m-auto h-3.5 w-3.5 text-white" />}
            </span>
          ))}
          {glasses > goals.dailyHydration && (
            <span className="text-xs font-bold tabular text-vault-deep">+{glasses - goals.dailyHydration}</span>
          )}
        </div>
        {glasses >= goals.dailyHydration && goals.dailyHydration > 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-garden-deep">
            <CheckCircle2 className="h-4 w-4" /> Target hidrasi harian tercapai.
          </p>
        )}
      </SectionCard>

      {/* Check-in */}
      <SectionCard
        title="Check-in"
        tone="gold"
        icon={<HeartPulse className="h-4 w-4 text-gold" />}
      >
        {todayCheckin ? (
          <>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { icon: Smile, label: "Mood", value: todayCheckin.mood, tone: "bg-studio-soft text-studio-deep", labelTone: "text-studio-deep" },
                  { icon: Zap, label: "Energi", value: todayCheckin.energy, tone: "bg-gold-soft text-gold-deep", labelTone: "text-gold-deep" },
                  { icon: Activity, label: "Nyeri", value: todayCheckin.soreness, tone: "bg-secondary text-secondary-foreground", labelTone: "text-muted-foreground" },
                  { icon: Brain, label: "Stres", value: todayCheckin.stress, tone: "bg-vault-soft text-vault-deep", labelTone: "text-vault-deep" },
                ] as const
              ).map((row) => {
                const Icon = row.icon;
                return (
                  <div key={row.label} className={cn("rounded-xl p-2.5 text-center", row.tone)}>
                    <Icon className="mx-auto h-4 w-4" />
                    <p className="mt-1 text-sm font-bold tabular">{row.value !== null ? `${row.value}/5` : "-"}</p>
                    <p className={cn("text-xs font-semibold uppercase tracking-wide", row.labelTone)}>{row.label}</p>
                  </div>
                );
              })}
            </div>
            <HBarList className="mt-3" height={7} items={checkinBars} />
            <div className="mt-3 rounded-xl bg-secondary/70 px-3 py-2.5">
              {todayCheckin.sleepHours !== null ? (
                // Angka jam tidur kini divisualkan sebagai bar vs target 8 jam
                // (komponen ReadinessBar yang sama dengan kartu Coach)
                <ReadinessBar
                  label="Tidur"
                  value={todayCheckin.sleepHours}
                  max={8}
                  display={`${formatNumber(todayCheckin.sleepHours, 1)} jam`}
                  color={SAGE}
                  overColor={SAGE}
                />
              ) : (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Moon className="h-4 w-4" /> Tidur
                  </span>
                  <span className="text-sm font-bold tabular">-</span>
                </div>
              )}
            </div>
            {todayCheckin.note && (
              <p className="mt-2 rounded-xl bg-secondary/70 px-3 py-2.5 text-xs italic text-muted-foreground">
                &ldquo;{todayCheckin.note}&rdquo;
              </p>
            )}
          </>
        ) : (
          <button
            onClick={() => openQuickAction("checkin")}
            className="press flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-gold/50 bg-gold-soft/60 px-4 py-6 min-h-[44px]"
          >
            <HeartPulse className="h-7 w-7 text-gold" />
            <span className="text-sm font-bold text-gold">Isi Check-in Harian</span>
            <span className="text-xs text-muted-foreground">Mood, energi, nyeri, stres, dan tidur hari ini</span>
          </button>
        )}

        <div className="mt-4">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Riwayat 14 hari
          </p>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {last14.map((d) => {
              const c = checkinMap.get(d);
              const mood = c?.mood ?? null;
              const bg =
                mood === null
                  ? "bg-secondary border border-border/70"
                  : mood >= 4
                    ? "bg-garden"
                    : mood === 3
                      ? "bg-chart-neutral"
                      : "bg-clay";
              return (
                <div key={d} className="flex shrink-0 flex-col items-center gap-1">
                  <span
                    role="img"
                    title={`${formatDateID(d)}${mood !== null ? ` · mood ${mood}/5` : ""}`}
                    aria-label={
                      mood !== null
                        ? `${formatDateID(d)}, mood ${mood}/5`
                        : `${formatDateID(d)}, mood tidak dicatat`
                    }
                    className={cn("h-7 w-7 rounded-full", bg)}
                  />
                  <span className="text-[11px] font-semibold text-muted-foreground">{dayName(d, true)}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Hijau: mood bagus · Abu-abu: biasa · Merah bata: kurang
          </p>
        </div>
      </SectionCard>

      {/* Sasaran kebugaran */}
      <SectionCard
        title="Sasaran Kebugaran"
        tone="studio"
        icon={<Target className="h-4 w-4 text-studio-deep" />}
        action={
          <button
            onClick={() => (editingGoals ? setEditingGoals(false) : startEditGoals())}
            className="press min-h-[44px] rounded-full px-3 text-xs font-bold text-studio-deep"
          >
            {editingGoals ? "Batal" : "Ubah"}
          </button>
        }
      >
        {editingGoals ? (
          <div className="space-y-2.5">
            {(
              [
                { key: "weeklySessions" as const, label: "Sesi per pekan", min: 1, step: "1", placeholder: "5" },
                { key: "weeklyMinutes" as const, label: "Menit per pekan", min: 1, step: "1", placeholder: "240" },
                { key: "dailyHydration" as const, label: "Gelas per hari", min: 1, step: "1", placeholder: "8" },
                { key: "weightGoalKg" as const, label: "Berat sasaran (kg)", min: 20, step: "0.1", placeholder: "opsional" },
              ]
            ).map((g) => (
              <div key={g.key} className="flex items-center gap-3">
                <label className="min-w-0 flex-1 text-xs font-semibold text-muted-foreground">{g.label}</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={g.min}
                  step={g.step}
                  placeholder={g.placeholder}
                  value={goalDraft[g.key]}
                  onChange={(e) => setGoalDraft((prev) => ({ ...prev, [g.key]: e.target.value }))}
                  className="h-11 w-24 tabular text-right"
                  aria-label={g.label}
                />
              </div>
            ))}
            <Button
              type="button"
              onClick={saveGoals}
              className="press h-11 w-full rounded-xl bg-studio font-bold text-white hover:bg-studio-deep min-h-[44px]"
            >
              Simpan Sasaran
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {goalTiles.map((t) => (
                <StatTile
                  key={t.label}
                  label={t.label}
                  value={t.value}
                  sub={`${t.pct}% sasaran`}
                  icon={t.icon}
                  tone={t.tone}
                />
              ))}
            </div>
            <div className="mt-3 space-y-2.5 border-t border-border/60 pt-3">
            <GoalProgressRow
              label="Hari aktif pekan ini"
              value={weekActiveDays}
              max={7}
              display={`${weekActiveDays}/7 hari`}
            />
            <GoalProgressRow
              label="Sesi pekan ini"
              value={weekWorkouts.length}
              max={goals.weeklySessions}
              display={`${weekWorkouts.length}/${goals.weeklySessions}`}
            />
            <GoalProgressRow
              label="Menit gerak pekan ini"
              value={weekMinutes}
              max={goals.weeklyMinutes}
              display={`${formatDuration(weekMinutes)} / ${formatDuration(goals.weeklyMinutes)}`}
            />
            <GoalProgressRow
              label="Hidrasi hari ini"
              value={glasses}
              max={goals.dailyHydration}
              display={`${glasses}/${goals.dailyHydration} gelas`}
            />
            </div>
          </>
        )}
      </SectionCard>
    </>
  );
}
