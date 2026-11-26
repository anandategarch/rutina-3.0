"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sprout,
  Leaf,
  TreePine,
  TreeDeciduous,
  Flower2,
  Plus,
  Flame,
  Trophy,
  CalendarCheck,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Search,
  Library,
  HeartPulse,
  Ruler,
  AlertTriangle,
  LayoutGrid,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  Timer,
  Check,
  Minus,
  ChevronRight,
  CalendarDays,
  Clock3,
  Link2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useRutinaStore } from "@/store/rutina";
import { rutinaApi } from "@/lib/rutina/api";
import { Input } from "@/components/ui/input";
import {
  todayStr,
  addDays,
  formatDayMonth,
  formatNumber,
  weekStart,
  daysBetween,
  rangeDays,
  dayOfWeek,
} from "@/lib/rutina/format";
import {
  ScreenHeader,
  SectionCard,
  StatTile,
  EmptyState,
  Pill,
  HABIT_CATEGORY_META,
  TIME_OF_DAY_META,
} from "@/components/rutina/primitives";
import {
  MiniBars,
  Sparkline,
  RingStat,
  MetricBar,
  HeatGrid,
  SAGE,
} from "@/components/rutina/charts";
import { habitIcon, habitColor } from "@/components/rutina/habit-icons";
import AddHabitSheet from "@/components/rutina/sheets/add-habit-sheet";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
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
import { cn } from "@/lib/utils";
import type { Habit, HabitLog } from "@/types/rutina";

// =====================================================================
// Helper murni (di luar komponen)
// =====================================================================

function isScheduled(h: Habit, ds: string): boolean {
  if (h.scheduleType === "daily") return true;
  const days = h.daysOfWeek.split(",").map(Number);
  return days.includes(dayOfWeek(ds));
}

function logOn(h: Habit, ds: string): HabitLog | undefined {
  return (h.logs ?? []).find((l) => l.date === ds);
}

function isDoneLog(h: Habit, log?: HabitLog | null): boolean {
  if (!log) return false;
  if (log.status === "done") return true;
  return h.unitTarget !== null && (log.value ?? 0) >= h.unitTarget;
}

function habitCurrentStreak(h: Habit, today: string): number {
  const byDate = new Map((h.logs ?? []).map((l) => [l.date, l]));
  let streak = 0;
  let cursor = today;
  for (let i = 0; i < 60; i++) {
    if (!isScheduled(h, cursor)) {
      cursor = addDays(cursor, -1);
      continue;
    }
    if (isDoneLog(h, byDate.get(cursor))) {
      streak++;
      cursor = addDays(cursor, -1);
      continue;
    }
    if (cursor === today && streak === 0) {
      cursor = addDays(cursor, -1); // grace untuk hari ini yang belum selesai
      continue;
    }
    break;
  }
  return streak;
}

function habitBestStreak(h: Habit, today: string): number {
  const byDate = new Map((h.logs ?? []).map((l) => [l.date, l]));
  let best = 0;
  let run = 0;
  for (const ds of rangeDays(addDays(today, -34), today)) {
    if (!isScheduled(h, ds)) continue;
    if (isDoneLog(h, byDate.get(ds))) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
}

function habitWeekProgress(h: Habit, today: string): { done: number; scheduled: number } {
  let done = 0;
  let scheduled = 0;
  for (const ds of rangeDays(weekStart(today), today)) {
    if (!isScheduled(h, ds)) continue;
    scheduled++;
    if (isDoneLog(h, logOn(h, ds))) done++;
  }
  return { done, scheduled };
}

function habitRate(h: Habit, today: string): number {
  let done = 0;
  let scheduled = 0;
  for (const ds of rangeDays(addDays(today, -34), today)) {
    if (!isScheduled(h, ds)) continue;
    scheduled++;
    if (isDoneLog(h, logOn(h, ds))) done++;
  }
  return scheduled > 0 ? done / scheduled : 0;
}

function missedLast7(h: Habit, today: string): number {
  const since = addDays(today, -6);
  return (h.logs ?? []).filter((l) => l.date >= since && l.date <= today && l.status === "missed")
    .length;
}

function overallStreaks(habits: Habit[], today: string): { current: number; best: number } {
  const doneDates = new Set<string>();
  habits.forEach((h) =>
    (h.logs ?? []).forEach((l) => {
      if (isDoneLog(h, l)) doneDates.add(l.date);
    })
  );
  let current = 0;
  let cursor = today;
  for (let i = 0; i < 60; i++) {
    if (doneDates.has(cursor)) {
      current++;
      cursor = addDays(cursor, -1);
      continue;
    }
    if (cursor === today && current === 0) {
      cursor = addDays(cursor, -1);
      continue;
    }
    break;
  }
  const sorted = Array.from(doneDates).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const ds of sorted) {
    if (prev !== null && daysBetween(prev, ds) === 1) run++;
    else run = 1;
    best = Math.max(best, run);
    prev = ds;
  }
  return { current, best };
}

// =====================================================================
// Taman Pertumbuhan — tahap & ilustrasi
// =====================================================================

const STAGES = [
  { label: "Benih", min: 0, next: 6 },
  { label: "Tunas", min: 6, next: 31 },
  { label: "Pohon Muda", min: 31, next: 81 },
  { label: "Pohon Dewasa", min: 81, next: 201 },
  { label: "Berbunga", min: 201, next: null },
];

function stageOf(total: number) {
  if (total <= 5) return STAGES[0];
  if (total <= 30) return STAGES[1];
  if (total <= 80) return STAGES[2];
  if (total <= 200) return STAGES[3];
  return STAGES[4];
}

const STAGE_ICONS = [Sprout, Leaf, TreePine, TreeDeciduous, Flower2];

function Flower({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 72, 144, 216, 288].map((deg) => (
        <circle
          key={deg}
          cx={4.2 * Math.cos((deg * Math.PI) / 180)}
          cy={4.2 * Math.sin((deg * Math.PI) / 180)}
          r="2.6"
          fill="var(--garden)"
          opacity="0.9"
        />
      ))}
      <circle r="2.1" fill="var(--gold)" />
    </g>
  );
}

function GardenIllustration({ stage }: { stage: number }) {
  return (
    <svg
      viewBox="0 0 320 170"
      className="block w-full h-auto"
      role="img"
      aria-label={`Ilustrasi taman tahap ${STAGES[stage]?.label ?? "Benih"}`}
    >
      <defs>
        <linearGradient id="garden-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--garden-soft)" />
          <stop offset="100%" stopColor="var(--cream)" />
        </linearGradient>
      </defs>

      {/* Langit */}
      <rect width="320" height="170" rx="14" fill="url(#garden-sky)" />

      {/* Matahari */}
      <g transform="translate(268 34)">
        <g stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" opacity="0.55">
          <line x1="0" y1="-20" x2="0" y2="-26" />
          <line x1="0" y1="20" x2="0" y2="26" />
          <line x1="-20" y1="0" x2="-26" y2="0" />
          <line x1="20" y1="0" x2="26" y2="0" />
          <line x1="14" y1="-14" x2="18.5" y2="-18.5" />
          <line x1="-14" y1="14" x2="-18.5" y2="18.5" />
          <line x1="14" y1="14" x2="18.5" y2="18.5" />
          <line x1="-14" y1="-14" x2="-18.5" y2="-18.5" />
        </g>
        <circle r="13" fill="var(--gold)" opacity="0.35" />
        <circle r="9" fill="var(--gold)" opacity="0.9" />
      </g>

      {/* Awan */}
      <g fill="#ffffff" opacity="0.9">
        <ellipse cx="66" cy="42" rx="26" ry="10" />
        <ellipse cx="86" cy="36" rx="17" ry="8" />
        <ellipse cx="152" cy="56" rx="20" ry="7" opacity="0.7" />
      </g>

      {/* Tanah */}
      <path
        d="M0 140 C 70 130, 130 144, 200 138 C 250 134, 290 140, 320 136 L320 170 L0 170 Z"
        fill="var(--garden)"
        opacity="0.16"
      />
      <path
        d="M0 154 C 90 148, 210 160, 320 152 L320 170 L0 170 Z"
        fill="var(--studio)"
        opacity="0.28"
      />

      {/* Rumput kecil */}
      <g stroke="var(--garden-deep)" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.45">
        <path d="M50 148 q -3 -7 -1 -11" />
        <path d="M55 149 q 2 -6 5 -9" />
        <path d="M242 146 q -3 -7 -1 -11" />
        <path d="M247 147 q 2 -6 5 -9" />
      </g>

      {/* ===== Tahap 0: Benih ===== */}
      {stage === 0 && (
        <g>
          <ellipse cx="160" cy="151" rx="15" ry="5" fill="var(--studio)" opacity="0.5" />
          <ellipse cx="160" cy="146" rx="6.5" ry="8.5" fill="var(--gold)" />
          <path
            d="M160 141 C 158 135, 163 131, 160 126"
            stroke="var(--garden-deep)"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          <ellipse cx="156" cy="125" rx="4.5" ry="2.5" fill="var(--garden)" transform="rotate(-28 156 125)" />
          <g fill="var(--gold)" opacity="0.55">
            <circle cx="132" cy="132" r="1.6" />
            <circle cx="190" cy="128" r="1.6" />
            <circle cx="205" cy="140" r="1.4" />
          </g>
        </g>
      )}

      {/* ===== Tahap 1: Tunas ===== */}
      {stage === 1 && (
        <g>
          <ellipse cx="160" cy="152" rx="17" ry="5" fill="var(--studio)" opacity="0.45" />
          <path
            d="M160 150 C 157 140, 163 132, 160 120"
            stroke="var(--garden-deep)"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M160 133 C 150 131, 143 123, 147 115 C 156 117, 161 124, 160 133 Z"
            fill="var(--garden)"
          />
          <path
            d="M160 127 C 170 125, 177 117, 173 109 C 164 111, 159 118, 160 127 Z"
            fill="var(--garden)"
            opacity="0.85"
          />
          <g fill="var(--gold)" opacity="0.55">
            <circle cx="128" cy="134" r="1.6" />
            <circle cx="196" cy="132" r="1.6" />
          </g>
        </g>
      )}

      {/* ===== Tahap 2: Pohon Muda ===== */}
      {stage === 2 && (
        <g>
          <ellipse cx="160" cy="153" rx="19" ry="5" fill="var(--studio)" opacity="0.4" />
          <path
            d="M160 152 C 155 138, 165 122, 160 98"
            stroke="var(--garden-deep)"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M161 118 C 169 113, 173 107, 175 100"
            stroke="var(--garden-deep)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <ellipse cx="160" cy="92" rx="14" ry="10" fill="var(--garden)" />
          <ellipse
            cx="146"
            cy="99"
            rx="9"
            ry="6.5"
            fill="var(--garden)"
            opacity="0.85"
            transform="rotate(-22 146 99)"
          />
          <ellipse
            cx="175"
            cy="97"
            rx="9"
            ry="6.5"
            fill="var(--garden-deep)"
            opacity="0.85"
            transform="rotate(22 175 97)"
          />
          <ellipse cx="160" cy="78" rx="8" ry="6" fill="var(--garden)" opacity="0.9" />
        </g>
      )}

      {/* ===== Tahap 3 & 4: Pohon Dewasa / Berbunga ===== */}
      {(stage === 3 || stage === 4) && (
        <g>
          <ellipse cx="160" cy="153" rx="23" ry="5.5" fill="var(--studio)" opacity="0.4" />
          <path
            d="M157 153 C 152 140, 149 126, 152 106 L 168 106 C 172 126, 168 140, 163 153 Z"
            fill="var(--garden-deep)"
          />
          <path
            d="M154 118 C 145 114, 139 108, 137 100"
            stroke="var(--garden-deep)"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M166 114 C 175 110, 181 104, 183 96"
            stroke="var(--garden-deep)"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="136" cy="94" r="16" fill="var(--garden)" opacity="0.92" />
          <circle cx="184" cy="90" r="17" fill="var(--garden-deep)" opacity="0.9" />
          <circle cx="160" cy="94" r="16" fill="var(--garden)" opacity="0.85" />
          <circle cx="160" cy="76" r="20" fill="var(--garden)" />
          {/* Buah (tahap dewasa) */}
          {stage === 3 && (
            <g fill="var(--gold)">
              <circle cx="146" cy="88" r="3.5" />
              <circle cx="172" cy="82" r="3.5" />
              <circle cx="160" cy="68" r="3.5" />
              <circle cx="152" cy="100" r="3.5" />
            </g>
          )}
          {/* Bunga & kelopak jatuh (tahap berbunga) */}
          {stage === 4 && (
            <g>
              <Flower x={146} y={88} />
              <Flower x={172} y={82} />
              <Flower x={160} y={66} />
              <Flower x={186} y={94} />
              <Flower x={137} y={102} />
              <g fill="var(--garden)" opacity="0.5">
                <ellipse cx="118" cy="118" rx="2.5" ry="1.6" transform="rotate(-30 118 118)" />
                <ellipse cx="204" cy="112" rx="2.5" ry="1.6" transform="rotate(25 204 112)" />
                <ellipse cx="132" cy="142" rx="2.2" ry="1.4" transform="rotate(15 132 142)" />
              </g>
            </g>
          )}
        </g>
      )}
    </svg>
  );
}

// =====================================================================
// Label status untuk tooltip sel grafik
// =====================================================================

const MATRIX_STATE_LABEL: Record<string, string> = {
  done: "Selesai",
  missed: "Meleset",
  rest: "Jeda",
  none: "Tanpa jadwal",
  pending: "Belum dicatat",
  future: "Akan datang",
};

// =====================================================================
// Milestone runtun untuk kartu api
// =====================================================================

const MILESTONES = [7, 14, 30, 50, 75, 100, 150, 200];

function nextStreakMilestone(current: number): number | null {
  return MILESTONES.find((m) => m > current) ?? null;
}

// =====================================================================
// Screen utama
// =====================================================================

type FilterKey = "all" | "consistent" | "attention" | "measured" | "health";

const FILTERS: { key: FilterKey; label: string; icon: React.ElementType }[] = [
  { key: "all", label: "Semua", icon: LayoutGrid },
  { key: "consistent", label: "Konsisten", icon: TrendingUp },
  { key: "attention", label: "Perlu perhatian", icon: AlertTriangle },
  { key: "measured", label: "Terukur", icon: Ruler },
  { key: "health", label: "Terhubung Bugar", icon: HeartPulse },
];

interface CheckVars {
  id: string;
  value?: number;
  toastMsg?: string;
}

type CheckAction = "created" | "upgraded" | "removed";
interface CheckActionCtx {
  prev: { habits: Habit[] } | undefined;
  action: CheckAction;
}

export default function HabitsScreen() {
  const qc = useQueryClient();
  const setQuickAction = useRutinaStore((s) => s.setQuickAction);
  const today = todayStr();

  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<FilterKey>("all");
  const [tab, setTab] = React.useState<"active" | "archived">("active");
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editingHabit, setEditingHabit] = React.useState<Habit | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ["habits"],
    queryFn: rutinaApi.habits,
  });

  const habits: Habit[] = React.useMemo(() => data?.habits ?? [], [data]);
  const activeHabits = React.useMemo(() => habits.filter((h) => !h.archived), [habits]);
  const archivedHabits = React.useMemo(() => habits.filter((h) => h.archived), [habits]);

  // ===== Check cepat (optimistic) =====
  const checkMutation = useMutation({
    mutationFn: (vars: CheckVars) => rutinaApi.checkHabit(vars.id, today, vars.value),
    onMutate: async (vars): Promise<CheckActionCtx> => {
      await qc.cancelQueries({ queryKey: ["habits"] });
      const prev = qc.getQueryData<{ habits: Habit[] }>(["habits"]);
      let action: CheckAction = "created";
      qc.setQueryData<{ habits: Habit[] }>(["habits"], (old) => {
        if (!old) return old;
        return {
          habits: old.habits.map((h) => {
            if (h.id !== vars.id) return h;
            const logs = [...(h.logs ?? [])];
            const idx = logs.findIndex((l) => l.date === today);
            if (idx >= 0) {
              const existing = logs[idx];
              if (
                h.unitTarget !== null &&
                typeof vars.value === "number" &&
                vars.value > 0 &&
                (existing.value ?? 0) < vars.value
              ) {
                logs[idx] = { ...existing, value: vars.value, status: "done", note: null };
                action = "upgraded";
              } else {
                logs.splice(idx, 1);
                action = "removed";
              }
            } else {
              const value =
                h.unitTarget !== null
                  ? typeof vars.value === "number" && vars.value > 0
                    ? vars.value
                    : h.unitTarget
                  : null;
              logs.push({
                id: `optimistic-${h.id}`,
                habitId: h.id,
                date: today,
                status: "done",
                value,
                note: null,
              });
              action = "created";
            }
            return { ...h, logs };
          }),
        };
      });
      return { prev, action };
    },
    onSuccess: (_res, vars, ctx) => {
      if (vars.toastMsg) toast.success(vars.toastMsg);
      else if (ctx?.action === "removed") toast.success("Check-in dibatalkan");
      else if (ctx?.action === "upgraded") toast.success("Progres tersimpan");
      else toast.success("Check-in tercatat");
    },
    onError: (e: Error, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["habits"], ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["home"] });
    },
  });

  // ===== Statistik agregat =====
  const totalCheckIns = React.useMemo(
    () => habits.reduce((acc, h) => acc + (h.logs ?? []).filter((l) => l.status === "done").length, 0),
    [habits]
  );
  const stage = stageOf(totalCheckIns);
  const stageProgress = React.useMemo(() => {
    if (stage.next === null) return 1;
    return Math.min(1, (totalCheckIns - stage.min) / (stage.next - stage.min));
  }, [stage, totalCheckIns]);
  const stageIdx = STAGES.indexOf(stage);

  const streaks = React.useMemo(() => overallStreaks(habits, today), [habits, today]);
  const nextMilestone = nextStreakMilestone(streaks.current);
  const milestonesDone = MILESTONES.filter((m) => streaks.current >= m).length;

  const doneThisWeek = React.useMemo(() => {
    const ws = weekStart(today);
    return habits.reduce(
      (acc, h) => acc + (h.logs ?? []).filter((l) => l.status === "done" && l.date >= ws).length,
      0
    );
  }, [habits, today]);

  const scheduledThisWeek = React.useMemo(() => {
    const ws = weekStart(today);
    let n = 0;
    for (const ds of rangeDays(ws, today)) {
      n += activeHabits.filter((h) => isScheduled(h, ds)).length;
    }
    return n;
  }, [activeHabits, today]);

  // ===== Tren 7 pekan =====
  const weeklyData: { label: string; value: number }[] = React.useMemo(() => {
    const allLogs = habits.flatMap((h) => h.logs ?? []);
    const out: { label: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const ws = addDays(weekStart(today), -7 * i);
      const we = addDays(ws, 6);
      const days = rangeDays(ws, we).filter((d) => d <= today);
      const done = allLogs.filter((l) => l.status === "done" && days.includes(l.date)).length;
      const scheduled = days.reduce(
        (acc, d) => acc + activeHabits.filter((h) => isScheduled(h, d)).length,
        0
      );
      out.push({
        label: formatDayMonth(ws),
        value: scheduled > 0 ? Math.round((done / scheduled) * 100) : 0,
      });
    }
    return out;
  }, [habits, activeHabits, today]);

  // ===== Ritme 7 hari =====
  const last7Done = React.useMemo(
    () =>
      rangeDays(addDays(today, -6), today).map(
        (ds) => activeHabits.filter((h) => isDoneLog(h, logOn(h, ds))).length
      ),
    [activeHabits, today]
  );
  const last7Total = last7Done.reduce((a, b) => a + b, 0);
  const weekPct = scheduledThisWeek > 0 ? Math.round((doneThisWeek / scheduledThisWeek) * 100) : 0;

  // ===== Kalender konsistensi 12 pekan (kolom = pekan, baris = hari) =====
  const calendar = React.useMemo(() => {
    type Cell = { date: string; state: "done" | "missed" | "rest" | "none" | "pending" | "future" };
    const allLogs = habits.flatMap((h) => h.logs ?? []);
    const stateFor = (ds: string): Cell["state"] => {
      if (ds > today) return "future";
      const dayLogs = allLogs.filter((l) => l.date === ds);
      if (dayLogs.some((l) => l.status === "done")) return "done";
      const sched = activeHabits.filter((h) => isScheduled(h, ds)).length;
      if (sched === 0) return "none";
      if (dayLogs.some((l) => l.status === "missed")) return "missed";
      if (dayLogs.some((l) => l.status === "rest")) return "rest";
      return ds < today ? "missed" : "pending";
    };
    const weeks: { start: string; cells: Cell[] }[] = [];
    for (let w = 11; w >= 0; w--) {
      const ws = addDays(weekStart(today), -7 * w);
      weeks.push({
        start: ws,
        cells: rangeDays(ws, addDays(ws, 6)).map((ds) => ({ date: ds, state: stateFor(ds) })),
      });
    }
    const monthLabels = weeks.map((wk, i) => {
      const m = wk.start.slice(5, 7);
      const prev = i > 0 ? weeks[i - 1].start.slice(5, 7) : null;
      return prev !== m ? formatDayMonth(wk.start).split(" ")[1] : "";
    });
    return { weeks, monthLabels };
  }, [habits, activeHabits, today]);

  // ===== Coach: Goldilocks Nudge =====
  const suggestions = React.useMemo(() => {
    const list: { text: string; icon: React.ElementType }[] = [];
    for (const h of activeHabits) {
      const missed = missedLast7(h, today);
      const wp = habitWeekProgress(h, today);
      const doneLogs = (h.logs ?? []).filter((l) => l.status === "done");
      const avgValue =
        doneLogs.length > 0
          ? doneLogs.reduce((acc, l) => acc + (l.value ?? 0), 0) / doneLogs.length
          : 0;

      if (missed >= 2) {
        list.push({
          text: `Turunkan target ${h.name} agar tetap realistis — ${missed} kali meleset dalam 7 hari terakhir.`,
          icon: TrendingDown,
        });
      } else if (wp.scheduled > 0 && wp.done === wp.scheduled) {
        list.push({ text: `Pertahankan ritme ${h.name} — pekan ini sempurna.`, icon: Flame });
      } else if (h.unitTarget !== null && doneLogs.length >= 3 && avgValue > h.unitTarget) {
        list.push({
          text: `Naikkan target ${h.name} sedikit — rata-rata progresmu melebihi target.`,
          icon: TrendingUp,
        });
      }
    }
    return list.slice(0, 2);
  }, [activeHabits, today]);

  // ===== Perpustakaan: filter + search =====
  const visibleHabits = React.useMemo(() => {
    const base = tab === "active" ? activeHabits : archivedHabits;
    const q = search.trim().toLowerCase();
    return base.filter((h) => {
      if (q) {
        const catLabel = HABIT_CATEGORY_META[h.category]?.label ?? h.category;
        const match =
          h.name.toLowerCase().includes(q) || catLabel.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filter === "consistent") return habitRate(h, today) >= 0.8;
      if (filter === "attention") return missedLast7(h, today) >= 1;
      if (filter === "measured") return h.unitTarget !== null;
      if (filter === "health") return h.category === "health";
      return true;
    });
  }, [tab, activeHabits, archivedHabits, search, filter, today]);

  const detailHabit = habits.find((h) => h.id === detailId);

  const openEdit = (h: Habit) => {
    setDetailId(null);
    setEditingHabit(h);
    setEditOpen(true);
  };

  if (isLoading) {
    return <HabitsSkeleton />;
  }

  return (
    <div className="flex flex-col pb-2">
      <ScreenHeader
        title="Kebiasaan"
        subtitle={`${activeHabits.length} habit aktif`}
        tone="garden"
        actions={
          <button
            onClick={() => setQuickAction("habit")}
            className="press h-11 min-w-[44px] px-3 rounded-xl bg-garden text-white flex items-center gap-1.5 text-xs font-bold shadow-soft"
          >
            <Plus className="h-4 w-4" />
            Tambah
          </button>
        }
      />

      {/* ===== Taman Pertumbuhan ===== */}
      <div className="px-4 mt-4 rise-in">
        <SectionCard title="Taman Pertumbuhan" tone="garden" icon={<Sprout className="h-4 w-4 text-garden-deep" />}>
          <div className="rounded-xl overflow-hidden border border-garden/10">
            <GardenIllustration stage={STAGES.indexOf(stage)} />
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="font-script text-2xl leading-none text-garden-deep">{stage.label}</p>
              <p className="text-xs text-muted-foreground mt-1.5">
                {stage.next !== null
                  ? `${formatNumber(stage.next - totalCheckIns)} check-in lagi ke tahap berikutnya`
                  : "Tamanmu sedang berbunga penuh — pertahankan."}
              </p>
            </div>
            <Pill tone="gold" className="shrink-0">
              {formatNumber(totalCheckIns)} check-in
            </Pill>
          </div>
          <MetricBar value={stageProgress} max={1} height={6} className="mt-2.5" />
          <div className="mt-3 flex items-start">
            {STAGES.map((s, i) => {
              const Icon = STAGE_ICONS[i] ?? Sprout;
              const isActive = i === stageIdx;
              const isPast = i < stageIdx;
              return (
                <React.Fragment key={s.label}>
                  {i > 0 && (
                    <span
                      className={cn(
                        "mt-4 h-[2px] flex-1 rounded-full",
                        isPast ? "bg-garden/50" : "bg-border"
                      )}
                      aria-hidden="true"
                    />
                  )}
                  <div className="flex w-[46px] shrink-0 flex-col items-center gap-1">
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors",
                        isActive && "border-garden bg-garden text-white shadow-soft",
                        isPast && "border-border bg-secondary text-muted-foreground",
                        !isActive && !isPast && "border-dashed border-border bg-card text-muted-foreground/50"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span
                      className={cn(
                        "text-center text-[10px] font-semibold leading-tight",
                        isActive ? "text-garden-deep" : "text-muted-foreground/80"
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* ===== Runtun visual: api + milestone ===== */}
      <div className="px-4 mt-4 rise-in rise-in-1">
        <SectionCard
          title="Runtun Beruntun"
          tone="gold"
          icon={<Flame className="h-4 w-4 text-gold" />}
          action={
            <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2.5 py-1 text-xs font-bold text-gold">
              <Trophy className="h-3 w-3" /> Terbaik {formatNumber(streaks.best)} hari
            </span>
          }
        >
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "relative flex h-16 w-16 shrink-0 items-center justify-center rounded-xl",
                streaks.current > 0 ? "bg-gold-soft" : "bg-secondary"
              )}
              aria-hidden="true"
            >
              <Flame
                className={cn("h-9 w-9 transition-colors", streaks.current > 0 ? "text-gold" : "text-muted-foreground/50")}
                strokeWidth={1.8}
                fill={streaks.current > 0 ? "currentColor" : "none"}
                fillOpacity={0.25}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-bold tabular leading-none">
                {formatNumber(streaks.current)}
                <span className="ml-1 text-xs font-semibold text-muted-foreground">hari beruntun</span>
              </p>
              {nextMilestone ? (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">
                    Progres milestone {milestonesDone}/{MILESTONES.length} · berikutnya {nextMilestone} hari
                  </p>
                  <MetricBar value={streaks.current} max={nextMilestone} color="var(--gold)" height={7} className="mt-1.5" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="font-bold text-gold tabular">{nextMilestone - streaks.current} hari</span> lagi ke milestone {nextMilestone}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Semua {MILESTONES.length} milestone terlampaui — pertahankan.
                </p>
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ===== Ritme kebiasaan: ring pekan + sparkline 7 hari ===== */}
      <div className="px-4 mt-4 rise-in rise-in-2">
        <SectionCard
          title="Ritme Kebiasaan"
          tone="garden"
          icon={<CalendarCheck className="h-4 w-4 text-garden-deep" />}
          action={<span className="text-xs text-muted-foreground font-semibold">7 hari terakhir</span>}
        >
          <div className="flex items-center gap-4">
            <RingStat
              progress={scheduledThisWeek > 0 ? doneThisWeek / scheduledThisWeek : 0}
              value={`${weekPct}%`}
              caption="misi pekan ini tercapai"
              size={76}
              color={SAGE}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold tabular">
                {formatNumber(doneThisWeek)}
                <span className="text-xs font-semibold text-muted-foreground">
                  {" "}
                  / {formatNumber(scheduledThisWeek)} misi
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Ring menunjukkan proporsi misi kebiasaan yang sudah dijalankan sejak Senin.
              </p>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Penyelesaian harian
              </p>
              <span className="text-xs text-muted-foreground tabular">
                {formatNumber(last7Total)} check-in
              </span>
            </div>
            <Sparkline data={last7Done} height={44} color={SAGE} />
          </div>
        </SectionCard>
      </div>

      {/* ===== Tren per pekan ===== */}
      <div className="px-4 mt-4 rise-in rise-in-3">
        <SectionCard
          title="Tren Penyelesaian"
          tone="garden"
          icon={<TrendingUp className="h-4 w-4 text-garden-deep" />}
          action={<span className="text-xs text-muted-foreground font-semibold">7 pekan terakhir</span>}
        >
          <MiniBars
            data={weeklyData}
            height={110}
            color={SAGE}
            highlightIndex={weeklyData.length - 1}
          />
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Persentase misi kebiasaan yang diselesaikan tiap pekan (Sen–Min).
          </p>
        </SectionCard>
      </div>

      {/* ===== Kalender konsistensi 12 pekan ===== */}
      <div className="px-4 mt-4 rise-in rise-in-4">
        <SectionCard
          title="Kalender Konsistensi"
          tone="garden"
          icon={<CalendarDays className="h-4 w-4 text-garden-deep" />}
          action={<span className="text-xs text-muted-foreground font-semibold">12 pekan terakhir</span>}
        >
          {/* Label bulan per kolom pekan */}
          <div className="flex gap-1 mb-1.5 pl-[36px]">
            {calendar.weeks.map((wk, i) => (
              <div
                key={wk.start}
                className="flex-1 min-w-0 text-[10px] font-bold text-muted-foreground truncate"
                title={formatDayMonth(wk.start)}
              >
                {calendar.monthLabels[i]}
              </div>
            ))}
          </div>
          {/* Grid: baris = hari (Sen–Min), kolom = pekan */}
          <div className="space-y-1">
            {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((dayName, r) => (
              <div key={dayName} className="flex items-center gap-1">
                <span className="w-[32px] shrink-0 text-[10px] font-bold text-muted-foreground">{dayName}</span>
                <div className="flex-1 flex gap-1">
                  {calendar.weeks.map((wk, wi) => {
                    const c = wk.cells[r];
                    return (
                      <span
                        key={wi}
                        role="img"
                        aria-label={`${formatDayMonth(c.date)}, ${MATRIX_STATE_LABEL[c.state]}`}
                        title={`${c.date} · ${MATRIX_STATE_LABEL[c.state]}`}
                        className={cn(
                          "h-4 flex-1 rounded-[3px]",
                          c.state === "done" && "bg-garden",
                          c.state === "missed" && "bg-clay/25",
                          c.state === "rest" && "border border-border bg-card",
                          c.state === "none" && "bg-secondary/80",
                          c.state === "pending" && "border border-dashed border-border bg-card",
                          c.state === "future" && "bg-secondary/40"
                        )}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
            <LegendDot className="bg-garden" label="Selesai" />
            <LegendDot className="bg-clay/25" label="Meleset" />
            <LegendDot className="border border-border bg-card" label="Jeda" />
            <LegendDot className="bg-secondary/80" label="Tanpa jadwal" />
          </div>
        </SectionCard>
      </div>

      {/* ===== Perpustakaan kebiasaan ===== */}
      <div className="px-4 mt-4 rise-in">
        <SectionCard title="Perpustakaan Kebiasaan" icon={<Library className="h-4 w-4 text-foreground" />}>
          {/* Pencarian */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau kategori…"
              aria-label="Cari kebiasaan"
              className="h-11 rounded-xl pl-9"
            />
          </div>

          {/* Chips filter */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5">
            {FILTERS.map((f) => {
              const Icon = f.icon;
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  aria-pressed={active}
                  className={cn(
                    "press shrink-0 inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold border transition-colors",
                    active
                      ? "bg-garden text-white border-garden"
                      : "bg-card text-muted-foreground border-border"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Tab Aktif / Arsip */}
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
            {(
              [
                { key: "active", label: "Aktif", count: activeHabits.length },
                { key: "archived", label: "Arsip", count: archivedHabits.length },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                aria-pressed={tab === t.key}
                className={cn(
                  "press min-h-[44px] rounded-lg text-sm font-bold transition-colors",
                  tab === t.key ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"
                )}
              >
                {t.label} ({t.count})
              </button>
            ))}
          </div>

          {/* Daftar habit */}
          <div className="mt-3 max-h-[480px] overflow-y-auto overscroll-contain scroll-thin space-y-2 pr-0.5">
            {visibleHabits.length === 0 ? (
              <EmptyState
                icon={<Sprout className="h-6 w-6" />}
                title={tab === "archived" ? "Arsip masih kosong" : "Tidak ada kebiasaan yang cocok"}
                description={
                  tab === "archived"
                    ? "Kebiasaan yang diarsipkan akan tersimpan di sini."
                    : "Coba ubah kata kunci atau filter, atau tanam kebiasaan baru."
                }
                action={
                  tab === "active" ? (
                    <button
                      onClick={() => setQuickAction("habit")}
                      className="press h-11 px-4 rounded-xl bg-garden-deep text-white text-sm font-bold"
                    >
                      Tanam Kebiasaan Baru
                    </button>
                  ) : undefined
                }
              />
            ) : (
              visibleHabits.map((h) => (
                <HabitCard
                  key={h.id}
                  habit={h}
                  today={today}
                  checking={checkMutation.isPending && checkMutation.variables?.id === h.id}
                  onOpen={() => setDetailId(h.id)}
                  onCheck={() => checkMutation.mutate({ id: h.id })}
                  onStep={() => {
                    const log = logOn(h, today);
                    const next = (log?.value ?? 0) + (h.unitStep || 1);
                    checkMutation.mutate({ id: h.id, value: next });
                  }}
                />
              ))
            )}
          </div>
        </SectionCard>
      </div>

      {/* ===== Coach card ===== */}
      <div className="px-4 mt-4">
        <SectionCard
          title="Coach Kebiasaan"
          tone="garden"
          icon={<Lightbulb className="h-4 w-4 text-garden-deep" />}
        >
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ritme tamanmu seimbang. Tidak ada penyesuaian yang perlu dilakukan saat ini — lanjutkan.
            </p>
          ) : (
            <ul className="space-y-2">
              {suggestions.map((s, i) => {
                const Icon = s.icon;
                return (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 rounded-xl bg-garden-soft p-3"
                  >
                    <Icon className="h-4 w-4 text-garden-deep mt-0.5 shrink-0" />
                    <p className="text-xs font-semibold text-garden-deep leading-relaxed">{s.text}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* ===== Detail drawer ===== */}
      <HabitDetailDrawer
        habit={detailHabit}
        open={Boolean(detailHabit)}
        today={today}
        onClose={() => setDetailId(null)}
        onEdit={openEdit}
        onCheck={(id, value, toastMsg) => checkMutation.mutate({ id, value, toastMsg })}
      />

      {/* ===== Sheet edit (lokal) ===== */}
      <AddHabitSheet
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditingHabit(undefined);
        }}
        habit={editingHabit}
      />
    </div>
  );
}

// =====================================================================
// Kartu habit (perpustakaan)
// =====================================================================

function HabitCard({
  habit,
  today,
  checking,
  onOpen,
  onCheck,
  onStep,
}: {
  habit: Habit;
  today: string;
  checking: boolean;
  onOpen: () => void;
  onCheck: () => void;
  onStep: () => void;
}) {
  const color = habitColor(habit.color);
  const catMeta = HABIT_CATEGORY_META[habit.category] ?? { label: habit.category, tone: "stone" as const };
  const log = logOn(habit, today);
  const done = isDoneLog(habit, log);
  const isMeasured = habit.unitTarget !== null;
  const streak = habitCurrentStreak(habit, today);
  const wp = habitWeekProgress(habit, today);

  return (
    <div className="rounded-xl border border-border/70 bg-card p-3">
      <div className="flex items-center gap-2">
        <button
          onClick={onOpen}
          className="press flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-label={`Buka detail ${habit.name}`}
        >
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", color.soft)}>
            {React.createElement(habitIcon(habit.icon), { className: cn("h-5 w-5", color.deep) })}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold leading-tight">{habit.name}</span>
            <span className="mt-1 flex items-center gap-1.5 flex-wrap">
              <Pill tone={catMeta.tone}>{catMeta.label}</Pill>
              {isMeasured && log && (
                <span className="text-xs text-muted-foreground tabular">
                  {formatNumber(log.value ?? 0, 1)}/{formatNumber(habit.unitTarget ?? 0, 1)} {habit.unitLabel}
                </span>
              )}
            </span>
            <span className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Flame className="h-3 w-3 text-gold" />
                <span className="tabular">{streak}</span> hari
              </span>
              <span className="inline-flex items-center gap-1 tabular">
                <CalendarCheck className="h-3 w-3" />
                {wp.done}/{wp.scheduled} pekan ini
              </span>
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
        </button>

        {!habit.archived &&
          (isMeasured ? (
            <button
              onClick={onStep}
              disabled={checking}
              aria-label={`Tambah progres ${habit.name}`}
              className={cn(
                "press h-11 min-w-[44px] shrink-0 rounded-xl font-bold text-sm flex items-center justify-center disabled:opacity-60",
                done ? "bg-garden text-white" : "bg-garden-soft text-garden-deep"
              )}
            >
              {checking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : done ? (
                <Check className="h-5 w-5" strokeWidth={3} />
              ) : (
                `+${formatNumber(habit.unitStep || 1, 1)}`
              )}
            </button>
          ) : (
            <button
              onClick={onCheck}
              disabled={checking || done}
              aria-label={done ? `${habit.name} sudah selesai` : `Tandai ${habit.name} selesai`}
              className={cn(
                "press h-11 w-11 shrink-0 rounded-xl border-2 flex items-center justify-center transition-colors disabled:opacity-60",
                done ? "bg-garden border-garden text-white" : "border-input text-muted-foreground"
              )}
            >
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-5 w-5" strokeWidth={3} />}
            </button>
          ))}
      </div>

      {wp.scheduled > 0 && (
        <div className="mt-2.5">
          <MetricBar value={wp.done} max={wp.scheduled} height={3} />
        </div>
      )}
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-full", className)} />
      {label}
    </span>
  );
}

// =====================================================================
// Drawer detail habit
// =====================================================================

function HabitDetailDrawer({
  habit,
  open,
  today,
  onClose,
  onEdit,
  onCheck,
}: {
  habit: Habit | undefined;
  open: boolean;
  today: string;
  onClose: () => void;
  onEdit: (h: Habit) => void;
  onCheck: (id: string, value?: number, toastMsg?: string) => void;
}) {
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const archiveMutation = useMutation({
    mutationFn: () => rutinaApi.updateHabit(habit!.id, { archived: !habit!.archived }),
    onSuccess: () => {
      toast.success(habit?.archived ? "Kebiasaan dipulihkan" : "Kebiasaan diarsipkan");
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => rutinaApi.deleteHabit(habit!.id),
    onSuccess: () => {
      toast.success("Kebiasaan dihapus");
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!habit) return null;

  const color = habitColor(habit.color);
  const catMeta = HABIT_CATEGORY_META[habit.category] ?? { label: habit.category, tone: "stone" as const };
  const timeMeta = TIME_OF_DAY_META[habit.timeOfDay] ?? { label: habit.timeOfDay };
  const isMeasured = habit.unitTarget !== null;
  const log = logOn(habit, today);
  const doneToday = isDoneLog(habit, log);

  const scheduleText =
    habit.scheduleType === "daily"
      ? "Setiap hari"
      : habit.daysOfWeek
          .split(",")
          .map(Number)
          .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
          .map((d) => dayNameFromDow(d))
          .join(", ");

  // Riwayat 30 hari
  const historyDays = rangeDays(addDays(today, -29), today);
  // Statistik 4 pekan
  const statDays = rangeDays(addDays(today, -27), today);
  const statLogs = (habit.logs ?? []).filter((l) => l.date >= addDays(today, -27));
  const statDone = statLogs.filter((l) => isDoneLog(habit, l)).length;
  const statMissed = statLogs.filter((l) => l.status === "missed").length;
  const statRest = statLogs.filter((l) => l.status === "rest").length;
  const statScheduled = statDays.filter((ds) => isScheduled(habit, ds)).length;
  const statRate = statScheduled > 0 ? Math.min(100, Math.round((statDone / statScheduled) * 100)) : 0;
  const totalValue = statLogs.reduce((acc, l) => acc + (l.value ?? 0), 0);
  const avgValue = statDone > 0 ? totalValue / statDone : 0;

  // Sel HeatGrid riwayat 30 hari (rata kiri ke hari Senin)
  const historyMax = isMeasured ? habit.unitTarget || 1 : 1;
  const historyCells: { value: number; label?: string }[] = [];
  const lead = (dayOfWeek(historyDays[0]) + 6) % 7;
  for (let i = 0; i < lead; i++) historyCells.push({ value: 0, label: "Tanpa data" });
  for (const ds of historyDays) {
    const l = logOn(habit, ds);
    const sched = isScheduled(habit, ds);
    const done = isDoneLog(habit, l);
    const stateKey = done
      ? "done"
      : l?.status === "missed"
        ? "missed"
        : l?.status === "rest"
          ? "rest"
          : !sched
            ? "none"
            : ds < today
              ? "missed"
              : "pending";
    historyCells.push({
      value: isMeasured ? Math.max(0, l?.value ?? 0) : done ? 1 : 0,
      label: `${formatDayMonth(ds)} · ${MATRIX_STATE_LABEL[stateKey]}`,
    });
  }
  const trail = (7 - (historyCells.length % 7)) % 7;
  for (let i = 0; i < trail; i++) historyCells.push({ value: 0, label: "Tanpa data" });

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85dvh]">
        <DrawerHeader className="px-4 text-left pb-2">
          <div className="flex items-center gap-3">
            <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-xl", color.soft)}>
              {React.createElement(habitIcon(habit.icon), { className: cn("h-7 w-7", color.deep) })}
            </span>
            <div className="min-w-0 flex-1">
              <DrawerTitle className="text-lg font-bold leading-tight truncate">{habit.name}</DrawerTitle>
              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {catMeta.label} · {timeMeta.label}
                </span>
                {habit.archived && <Pill tone="stone">Diarsipkan</Pill>}
              </div>
            </div>
          </div>
          <DrawerDescription className="text-left mt-2">
            Detail, riwayat, dan statistik kebiasaan ini.
          </DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto scroll-thin px-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] space-y-4">
          {/* Info jadwal */}
          <div className="rounded-xl border border-border/70 divide-y divide-border/60">
            <InfoRow icon={<CalendarDays className="h-4 w-4" />} label="Jadwal" value={scheduleText} />
            <InfoRow
              icon={<Clock3 className="h-4 w-4" />}
              label="Waktu"
              value={`${timeMeta.label}${habit.reminderTime ? ` · Pengingat ${habit.reminderTime}` : ""}`}
            />
            {habit.stackAfter && (
              <div className="flex items-start gap-2.5 p-3 bg-gold-soft/60">
                <Link2 className="h-4 w-4 text-gold mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Habit stacking</p>
                  <p className="font-script text-lg leading-snug text-gold">
                    Setelah {habit.stackAfter}, saya akan {habit.name}.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Streak */}
          <div className="grid grid-cols-2 gap-2">
            <StatTile
              label="Runtun saat ini"
              value={`${habitCurrentStreak(habit, today)} hari`}
              icon={<Flame className="h-3.5 w-3.5" />}
              tone="gold"
            />
            <StatTile
              label="Runtun terbaik"
              value={`${habitBestStreak(habit, today)} hari`}
              icon={<Trophy className="h-3.5 w-3.5" />}
              tone="gold"
            />
          </div>

          {/* Stepper habit terukur */}
          {isMeasured && (
            <div className="rounded-xl bg-secondary p-3">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Progres hari ini
                </p>
                <span className="text-xs font-semibold text-muted-foreground tabular">
                  target {formatNumber(habit.unitTarget ?? 0, 1)} {habit.unitLabel}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => log && onCheck(habit.id, undefined, "Progres direset untuk hari ini")}
                  disabled={!log}
                  aria-label="Kurangi progres hari ini"
                  className="press h-11 w-11 rounded-xl bg-card border border-border flex items-center justify-center disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="text-center min-w-0 flex-1">
                  <p className="text-2xl font-bold tabular text-garden-deep leading-none">
                    {formatNumber(log?.value ?? 0, 1)}
                    <span className="text-sm font-semibold text-muted-foreground">
                      {" "}
                      / {formatNumber(habit.unitTarget ?? 0, 1)} {habit.unitLabel}
                    </span>
                  </p>
                  {doneToday && (
                    <p className="text-xs font-bold uppercase tracking-wide text-garden-deep mt-1">
                      Target tercapai
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onCheck(habit.id, (log?.value ?? 0) + (habit.unitStep || 1))}
                  aria-label="Tambah progres hari ini"
                  className="press h-11 w-11 rounded-xl bg-garden text-white flex items-center justify-center"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <MetricBar
                value={log?.value ?? 0}
                max={habit.unitTarget ?? 1}
                color="var(--primary)"
                overColor="var(--primary)"
                height={6}
                className="mt-3"
              />
            </div>
          )}

          {/* Riwayat 30 hari — HeatGrid */}
          <div>
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Riwayat 30 hari
              </p>
              {isMeasured && (
                <span className="text-xs text-muted-foreground tabular">
                  target {formatNumber(habit.unitTarget ?? 0, 1)} {habit.unitLabel}/hari
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mb-1.5">
              {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d, i) => (
                <span
                  key={`${d}-${i}`}
                  className="flex-1 text-center text-[10px] font-bold text-muted-foreground"
                >
                  {d}
                </span>
              ))}
            </div>
            <HeatGrid cells={historyCells} columns={7} max={historyMax} />
            <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              <LegendDot className="border border-border bg-secondary" label="Tanpa progres" />
              <LegendDot className="bg-garden" label="Target tercapai" />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Intensitas hijau menunjukkan seberapa dekat progres harianmu dengan target. Tahan sel untuk melihat detail.
            </p>
          </div>

          {/* Statistik 4 pekan */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
              Ringkasan 4 pekan
            </p>
            <div className="rounded-xl bg-secondary/50 p-3">
              <div className="flex items-baseline justify-between gap-2 mb-1.5">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Tingkat keberhasilan
                </p>
                <span className="text-sm font-bold tabular text-garden-deep">{statRate}%</span>
              </div>
              <MetricBar value={statRate} max={100} height={6} />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {statDone} selesai dari {statScheduled} hari terjadwal
              </p>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {isMeasured ? (
                <>
                  <MiniStat
                    label={`Total ${habit.unitLabel ?? "nilai"}`}
                    value={formatNumber(totalValue, 1)}
                    tone="studio"
                  />
                  <MiniStat label="Rata-rata per selesai" value={formatNumber(avgValue, 1)} tone="vault" />
                </>
              ) : (
                <>
                  <MiniStat label="Meleset" value={`${statMissed}x`} tone="clay" />
                  <MiniStat label="Jeda" value={`${statRest}x`} tone="stone" />
                </>
              )}
            </div>
          </div>

          {/* Aturan 2 menit */}
          {!doneToday && !habit.archived && (
            <div className="space-y-1.5">
              <button
                onClick={() => onCheck(habit.id, undefined, `${habit.name} tercatat (aturan 2 menit)`)}
                className="press w-full h-11 rounded-xl bg-gold text-white text-sm font-bold flex items-center justify-center gap-2"
              >
                <Timer className="h-4 w-4" />
                Tandai Selesai (aturan 2 menit)
              </button>
              <p className="text-xs text-muted-foreground">
                Belum siap penuh? Tandai versi 2 menitnya agar runtun tetap hidup.
              </p>
            </div>
          )}

          {/* Aksi */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onEdit(habit)}
              disabled={deleteMutation.isPending || archiveMutation.isPending}
              className="press h-11 rounded-xl border border-border bg-card text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <Pencil className="h-4 w-4" />
              Sunting
            </button>
            <button
              onClick={() => archiveMutation.mutate()}
              disabled={deleteMutation.isPending || archiveMutation.isPending}
              className="press h-11 rounded-xl border border-border bg-card text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {habit.archived ? (
                <>
                  <ArchiveRestore className="h-4 w-4" />
                  Pulihkan
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4" />
                  Arsip
                </>
              )}
            </button>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger asChild>
                <button
                  disabled={deleteMutation.isPending || archiveMutation.isPending}
                  className="press h-11 rounded-xl border border-destructive/40 bg-destructive/5 text-destructive text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  Hapus
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus kebiasaan ini?</AlertDialogTitle>
                  <AlertDialogDescription>
                    &ldquo;{habit.name}&rdquo; dan seluruh riwayat check-in-nya akan dihapus permanen.
                    Tindakan ini tidak bisa dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate()}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    Hapus Permanen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function dayNameFromDow(d: number): string {
  // 0 = Minggu; urut tampil mengikuti urutan csv
  const names = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  return names[d] ?? "";
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 p-3">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "garden" | "gold" | "studio" | "vault" | "stone" | "clay";
}) {
  const tones: Record<string, string> = {
    garden: "bg-garden-soft text-garden-deep",
    gold: "bg-gold-soft text-gold",
    studio: "bg-studio-soft text-studio-deep",
    vault: "bg-vault-soft text-vault-deep",
    stone: "bg-secondary text-foreground",
    clay: "bg-clay-soft text-clay-deep",
  };
  return (
    <div className={cn("rounded-xl p-3", tones[tone])}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-80 truncate">{label}</p>
      <p className="text-lg font-bold tabular mt-0.5">{value}</p>
    </div>
  );
}

// =====================================================================
// Skeleton
// =====================================================================

function HabitsSkeleton() {
  return (
    <div className="flex flex-col pb-2">
      <div className="h-14 border-b border-border/60 bg-background/90 px-4 pt-4">
        <div className="h-6 w-32 rounded-lg bg-secondary animate-pulse" />
        <div className="h-3 w-24 rounded bg-secondary animate-pulse mt-2" />
      </div>
      <div className="px-4 mt-4 space-y-4">
        <div className="rounded-xl bg-card border border-border/70 p-4">
          <div className="h-4 w-40 rounded bg-secondary animate-pulse" />
          <div className="h-40 rounded-xl bg-secondary animate-pulse mt-3" />
          <div className="h-3 w-48 rounded bg-secondary animate-pulse mt-3" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="h-20 rounded-xl bg-secondary animate-pulse" />
          <div className="h-20 rounded-xl bg-secondary animate-pulse" />
          <div className="h-20 rounded-xl bg-secondary animate-pulse" />
        </div>
        <div className="h-52 rounded-xl bg-secondary animate-pulse" />
        <div className="h-40 rounded-xl bg-secondary animate-pulse" />
        <div className="h-64 rounded-xl bg-secondary animate-pulse" />
      </div>
    </div>
  );
}
