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
  Plus,
  Search,
  Loader2,
  Clock3,
  Gauge,
  X,
} from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { rutinaApi } from "@/lib/rutina/api";
import { todayStr, formatPace } from "@/lib/rutina/format";
import type { Workout, StrengthItem, ExerciseItem } from "@/types/rutina";

type WorkoutType = Workout["type"];

const TYPE_META: Record<WorkoutType, { label: string; icon: React.ElementType; cardio: boolean }> = {
  run: { label: "Lari", icon: Footprints, cardio: true },
  walk: { label: "Jalan", icon: PersonStanding, cardio: true },
  runwalk: { label: "Lari + Jalan", icon: Route, cardio: true },
  badminton: { label: "Badminton", icon: CircleDot, cardio: false },
  strength: { label: "Beban", icon: Dumbbell, cardio: false },
};

const MUSCLE_GROUPS: { key: string; label: string }[] = [
  { key: "chest", label: "Dada" },
  { key: "back", label: "Punggung" },
  { key: "shoulders", label: "Bahu" },
  { key: "arms", label: "Lengan" },
  { key: "legs", label: "Kaki" },
  { key: "core", label: "Inti" },
  { key: "fullbody", label: "Seluruh" },
];

const MUSCLE_LABEL: Record<string, string> = Object.fromEntries(
  MUSCLE_GROUPS.map((g) => [g.key, g.label])
);

interface DraftStrengthItem {
  exercise: string;
  muscleGroup: string;
  weight: string;
  reps: string;
  sets: string;
}

const emptyDraft = (): DraftStrengthItem[] => [];

export default function AddWorkoutSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();

  const [type, setType] = React.useState<WorkoutType | null>(null);
  const [date, setDate] = React.useState(todayStr());
  const [duration, setDuration] = React.useState("");
  const [distance, setDistance] = React.useState("");
  const [calories, setCalories] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [items, setItems] = React.useState<DraftStrengthItem[]>(emptyDraft);

  // Exercise picker state
  const [exSearch, setExSearch] = React.useState("");
  const [muscleFilter, setMuscleFilter] = React.useState<string | null>(null);

  // Reset form setiap kali sheet dibuka
  React.useEffect(() => {
    if (open) {
      setType(null);
      setDate(todayStr());
      setDuration("");
      setDistance("");
      setCalories("");
      setTitle("");
      setNotes("");
      setItems([]);
      setExSearch("");
      setMuscleFilter(null);
    }
  }, [open]);

  const exercisesQuery = useQuery({
    queryKey: ["exercises"],
    queryFn: rutinaApi.exercises,
    enabled: open && type === "strength",
  });

  const filteredExercises: ExerciseItem[] = React.useMemo(() => {
    const all = exercisesQuery.data?.exercises ?? [];
    const q = exSearch.trim().toLowerCase();
    return all.filter((e) => {
      const okGroup = muscleFilter ? e.muscleGroup === muscleFilter : true;
      const okSearch = q.length > 0 ? e.name.toLowerCase().includes(q) : true;
      return okGroup && okSearch;
    });
  }, [exercisesQuery.data, exSearch, muscleFilter]);

  const addExercise = (e: ExerciseItem) => {
    if (items.some((it) => it.exercise === e.name)) {
      toast.info(`${e.name} sudah ada di daftar`);
      return;
    }
    setItems((prev) => [
      ...prev,
      { exercise: e.name, muscleGroup: e.muscleGroup, weight: "", reps: "", sets: "3" },
    ]);
  };

  const updateItem = (idx: number, patch: Partial<DraftStrengthItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const mutation = useMutation({
    mutationFn: rutinaApi.createWorkout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["home"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Latihan tersimpan");
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Gagal menyimpan latihan");
    },
  });

  const isCardio = type !== null && TYPE_META[type].cardio;
  const durNum = Number(duration);
  const distNum = Number(distance);
  const pace = isCardio && durNum > 0 && distNum > 0 ? durNum / distNum : null;

  /** Enter pada input → fokus ke input berikutnya (rantai ketik mobile, tanpa submit). */
  const enterFocusNext = (nextId: string) => (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.key !== "Enter") return;
    ev.preventDefault();
    document.getElementById(nextId)?.focus();
  };

  const itemsValid =
    type !== "strength" ||
    (items.length > 0 &&
      items.every((it) => Number(it.weight) >= 0 && Number(it.reps) >= 1 && Number(it.sets) >= 1 && it.weight !== ""));

  const canSubmit =
    type !== null &&
    durNum > 0 &&
    date.length === 10 &&
    itemsValid &&
    !mutation.isPending;

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!canSubmit || type === null) return;

    const strengthPayload: StrengthItem[] | undefined =
      type === "strength"
        ? items.map((it) => ({
            exercise: it.exercise,
            muscleGroup: it.muscleGroup,
            weight: Number(it.weight) || 0,
            reps: Number(it.reps) || 1,
            sets: Number(it.sets) || 1,
          }))
        : undefined;

    mutation.mutate({
      type,
      date,
      durationMin: durNum,
      ...(isCardio && distNum > 0 ? { distanceKm: distNum } : {}),
      ...(calories !== "" && Number(calories) > 0 ? { calories: Number(calories) } : {}),
      ...(title.trim() ? { title: title.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(strengthPayload ? { strength: strengthPayload } : {}),
    });
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[94dvh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-studio-deep">Catat Latihan</DrawerTitle>
          <DrawerDescription>Pilih jenis sesi, isi durasi, dan simpan progresmu.</DrawerDescription>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          <div className="overflow-y-auto scroll-thin px-4 pb-4 space-y-4">
            {/* Jenis latihan */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Jenis Latihan</p>
              <div className="grid grid-cols-5 gap-1.5">
                {(Object.keys(TYPE_META) as WorkoutType[]).map((t) => {
                  const meta = TYPE_META[t];
                  const Icon = meta.icon;
                  const active = type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      aria-pressed={active}
                      className={cn(
                        "press flex flex-col items-center justify-center gap-1 rounded-xl border min-h-[64px] py-2 px-1",
                        active
                          ? "bg-studio-soft border-studio/60 text-studio-deep shadow-soft"
                          : "bg-card border-border/70 text-muted-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-semibold leading-tight text-center">{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tanggal & durasi */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="wo-date" className="text-xs font-semibold text-muted-foreground">
                  Tanggal
                </label>
                <Input id="wo-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="wo-duration" className="text-xs font-semibold text-muted-foreground">
                  Durasi (menit) *
                </label>
                <Input
                  id="wo-duration"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  placeholder="45"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="h-11 tabular"
                  enterKeyHint="next"
                  onKeyDown={enterFocusNext(isCardio ? "wo-distance" : "wo-calories")}
                />
              </div>
            </div>

            {/* Jarak kardio + pace otomatis */}
            {isCardio && (
              <div className="space-y-1.5">
                <label htmlFor="wo-distance" className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5" /> Jarak (km)
                </label>
                <Input
                  id="wo-distance"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  placeholder="5.0"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  className="h-11 tabular"
                  enterKeyHint="next"
                  onKeyDown={enterFocusNext("wo-calories")}
                />
                {pace !== null && pace > 0 && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    Pace otomatis: <span className="font-semibold text-studio-deep tabular">{formatPace(pace)}</span>
                  </p>
                )}
              </div>
            )}

            {/* Kalori opsional */}
            <div className="space-y-1.5">
              <label htmlFor="wo-calories" className="text-xs font-semibold text-muted-foreground">
                Kalori (opsional)
              </label>
              <Input
                id="wo-calories"
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="320"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="h-11 tabular"
                enterKeyHint="next"
                onKeyDown={enterFocusNext("wo-title")}
              />
            </div>

            {/* Strength builder */}
            {type === "strength" && (
              <div className="rounded-xl border border-border/70 bg-studio-soft/50 p-3 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide text-studio-deep">Gerakan Beban</p>

                {/* Pencarian library */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Cari gerakan (mis. Bench Press)"
                    value={exSearch}
                    onChange={(e) => setExSearch(e.target.value)}
                    className="h-10 pl-9 bg-card"
                  />
                </div>

                {/* Chips kelompok otot */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMuscleFilter(null)}
                    className={cn(
                      "press rounded-full px-3 py-1.5 text-xs font-semibold min-h-[44px]",
                      muscleFilter === null ? "bg-studio text-white" : "bg-card text-muted-foreground border border-border/70"
                    )}
                  >
                    Semua
                  </button>
                  {MUSCLE_GROUPS.map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => setMuscleFilter(g.key)}
                      className={cn(
                        "press rounded-full px-3 py-1.5 text-xs font-semibold min-h-[44px]",
                        muscleFilter === g.key ? "bg-studio text-white" : "bg-card text-muted-foreground border border-border/70"
                      )}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>

                {/* Hasil library */}
                <div className="max-h-36 overflow-y-auto scroll-thin rounded-xl bg-card border border-border/60 divide-y divide-border/60">
                  {exercisesQuery.isLoading ? (
                    <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Memuat gerakan...
                    </div>
                  ) : filteredExercises.length === 0 ? (
                    <div className="py-4 text-center text-xs text-muted-foreground">Tidak ada gerakan cocok.</div>
                  ) : (
                    filteredExercises.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => addExercise(e)}
                        className="press w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left min-h-[44px] hover:bg-studio-soft/60"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold truncate">{e.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {MUSCLE_LABEL[e.muscleGroup] ?? e.muscleGroup}
                            {e.equipment ? ` · ${e.equipment}` : ""}
                          </span>
                        </span>
                        <Plus className="h-4 w-4 text-studio-deep shrink-0" />
                      </button>
                    ))
                  )}
                </div>

                {/* Daftar gerakan terpilih */}
                {items.length > 0 && (
                  <div className="space-y-2">
                    {items.map((it, idx) => (
                      <div key={it.exercise} className="rounded-xl border border-border/70 bg-card p-2.5">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold truncate">{it.exercise}</p>
                            <p className="text-xs text-muted-foreground">
                              {MUSCLE_LABEL[it.muscleGroup] ?? it.muscleGroup}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            aria-label={`Hapus ${it.exercise}`}
                            className="press h-11 w-11 rounded-full bg-clay-soft text-clay flex items-center justify-center shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-xs font-semibold text-muted-foreground block mb-1">kg</label>
                            <Input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step="0.5"
                              placeholder="60"
                              value={it.weight}
                              onChange={(e) => updateItem(idx, { weight: e.target.value })}
                              className="h-10 tabular"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-muted-foreground block mb-1">reps</label>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              placeholder="8"
                              value={it.reps}
                              onChange={(e) => updateItem(idx, { reps: e.target.value })}
                              className="h-10 tabular"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-muted-foreground block mb-1">sets</label>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              placeholder="3"
                              value={it.sets}
                              onChange={(e) => updateItem(idx, { sets: e.target.value })}
                              className="h-10 tabular"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {items.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Tambahkan minimal satu gerakan dari library di atas.
                  </p>
                )}
              </div>
            )}

            {/* Judul & catatan */}
            <div className="space-y-1.5">
              <label htmlFor="wo-title" className="text-xs font-semibold text-muted-foreground">
                Judul (opsional)
              </label>
              <Input
                id="wo-title"
                placeholder={type === "strength" ? "Full Body Senin" : "Lari Pagi"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11"
                enterKeyHint="next"
                onKeyDown={enterFocusNext("wo-notes")}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="wo-notes" className="text-xs font-semibold text-muted-foreground">
                Catatan (opsional)
              </label>
              <Textarea
                id="wo-notes"
                placeholder="Kesan sesi, cuaca, atau catatan teknik..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          {/* Aksi */}
          <div className="border-t border-border/60 bg-background p-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
            <Button
              type="submit"
              disabled={!canSubmit}
              className="press w-full h-12 rounded-xl text-sm font-bold bg-studio text-white hover:bg-studio-deep min-h-[44px]"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...
                </>
              ) : (
                "Simpan Latihan"
              )}
            </Button>
            {type === "strength" && items.length > 0 && !itemsValid && (
              <p className="text-xs text-clay mt-2 text-center">
                Lengkapi bobot, reps, dan sets setiap gerakan.
              </p>
            )}
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
