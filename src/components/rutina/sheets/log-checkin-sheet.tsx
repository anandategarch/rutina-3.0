"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Smile, Zap, Activity, Brain, Moon, Loader2, HeartPulse, Angry, Frown, Meh, Laugh } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { rutinaApi } from "@/lib/rutina/api";
import { todayStr } from "@/lib/rutina/format";
import type { CheckIn } from "@/types/rutina";

const SCALES: {
  key: "mood" | "energy" | "soreness" | "stress";
  label: string;
  icon: React.ElementType;
  /** true = nilai tinggi itu baik (mood/energi); false = nilai rendah itu baik (nyeri/stres) */
  highIsGood: boolean;
  labels: string[];
}[] = [
  {
    key: "mood",
    label: "Suasana Hati",
    icon: Smile,
    highIsGood: true,
    labels: ["Berat", "Kurang", "Biasa", "Baik", "Hebat"],
  },
  {
    key: "energy",
    label: "Energi",
    icon: Zap,
    highIsGood: true,
    labels: ["Kosong", "Lemah", "Cukup", "Bugar", "Penuh"],
  },
  {
    key: "soreness",
    label: "Nyeri Otot",
    icon: Activity,
    highIsGood: false,
    labels: ["Netral", "Sedikit", "Sedang", "Parah", "Ekstrem"],
  },
  {
    key: "stress",
    label: "Stres",
    icon: Brain,
    highIsGood: false,
    labels: ["Tenang", "Santai", "Normal", "Tinggi", "Puncak"],
  },
];

/** Warna nilai check-in mengikuti semantik: baik = sage, netral = abu, buruk = clay. */
function checkinValueTone(highIsGood: boolean, value: number): string {
  const score = highIsGood ? value : 6 - value; // normalisasi: makin tinggi makin baik
  if (score >= 4) return "bg-sage-soft text-sage-deep";
  if (score === 3) return "bg-secondary text-muted-foreground";
  return "bg-clay-soft text-clay";
}

/** Skala mood visual: 5 wajah dari berat ke hebat (rekomendasi ui-ux-pro-max: sentiment visual). */
const MOOD_FACES: { icon: React.ElementType; activeClass: string }[] = [
  { icon: Angry, activeClass: "bg-clay-soft text-clay border-clay/50" },
  { icon: Frown, activeClass: "bg-clay-soft/70 text-clay-deep border-clay/30" },
  { icon: Meh, activeClass: "bg-secondary text-muted-foreground border-border" },
  { icon: Smile, activeClass: "bg-sage-soft text-sage-deep border-sage/40" },
  { icon: Laugh, activeClass: "bg-sage text-white border-sage shadow-soft" },
];

const SLEEP_PRESETS = [5, 6, 7, 8, 9, 10];

type ScaleKey = (typeof SCALES)[number]["key"];

type ScaleState = Record<ScaleKey, number | null>;

export default function LogCheckInSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();

  const [scales, setScales] = React.useState<ScaleState>({ mood: null, energy: null, soreness: null, stress: null });
  const [sleepHours, setSleepHours] = React.useState("");
  const [note, setNote] = React.useState("");
  const prefilledRef = React.useRef(false);

  // Prefill dari check-in hari ini (jika ada)
  const checkinsQuery = useQuery({
    queryKey: ["checkins"],
    queryFn: rutinaApi.checkins,
    enabled: open,
  });

  React.useEffect(() => {
    if (open) {
      prefilledRef.current = false;
      setScales({ mood: null, energy: null, soreness: null, stress: null });
      setSleepHours("");
      setNote("");
    }
  }, [open]);

  React.useEffect(() => {
    if (!open || prefilledRef.current) return;
    const data = checkinsQuery.data?.checkins;
    if (!data) return;
    const today = data.find((c: CheckIn) => c.date === todayStr());
    if (today) {
      setScales({
        mood: today.mood ?? null,
        energy: today.energy ?? null,
        soreness: today.soreness ?? null,
        stress: today.stress ?? null,
      });
      setSleepHours(today.sleepHours !== null ? String(today.sleepHours) : "");
      setNote(today.note ?? "");
    }
    prefilledRef.current = true;
  }, [open, checkinsQuery.data]);

  const mutation = useMutation({
    mutationFn: rutinaApi.upsertCheckin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkins"] });
      queryClient.invalidateQueries({ queryKey: ["home"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Check-in tersimpan");
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Gagal menyimpan check-in");
    },
  });

  const sleepNum = Number(sleepHours);
  const canSubmit =
    !mutation.isPending &&
    Object.values(scales).some((v) => v !== null) &&
    (sleepHours === "" || (Number.isFinite(sleepNum) && sleepNum >= 0));

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!canSubmit) return;
    mutation.mutate({
      date: todayStr(),
      ...(scales.mood !== null ? { mood: scales.mood } : {}),
      ...(scales.energy !== null ? { energy: scales.energy } : {}),
      ...(scales.soreness !== null ? { soreness: scales.soreness } : {}),
      ...(scales.stress !== null ? { stress: scales.stress } : {}),
      ...(sleepHours !== "" ? { sleepHours: sleepNum } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[94dvh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-studio-deep">Check-in Harian</DrawerTitle>
          <DrawerDescription>Ceritakan kondisimu hari ini untuk saran latihan yang lebih akurat.</DrawerDescription>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          <div className="overflow-y-auto scroll-thin px-4 pb-4 space-y-4">
            {checkinsQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
              </div>
            ) : (
              SCALES.map((scale) => {
                const Icon = scale.icon;
                const value = scales[scale.key];
                return (
                  <div key={scale.key} className="rounded-xl border border-border/70 bg-card p-3">
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0 bg-sage-soft text-sage-deep">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold leading-tight">{scale.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {value !== null ? scale.labels[value - 1] : "Ketuk salah satu tingkat"}
                        </p>
                      </div>
                      {value !== null && (
                        <span className={cn("text-sm font-bold tabular px-2 py-0.5 rounded-full", checkinValueTone(scale.highIsGood, value))}>
                          {value}/5
                        </span>
                      )}
                    </div>
                    {scale.key === "mood" ? (
                      /* Wajah mood — lebih ekspresif daripada angka polos */
                      <div className="grid grid-cols-5 gap-1.5" role="group" aria-label={scale.label}>
                        {MOOD_FACES.map((face, i) => {
                          const n = i + 1;
                          const FaceIcon = face.icon;
                          const active = value === n;
                          return (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setScales((prev) => ({ ...prev, mood: n }))}
                              aria-pressed={active}
                              aria-label={`Mood: ${scale.labels[i]} (${n})`}
                              className={cn(
                                "press flex flex-col items-center justify-center gap-1 rounded-xl border py-2 min-h-[56px]",
                                active ? face.activeClass : "bg-background border-border/70 text-muted-foreground/60"
                              )}
                            >
                              <FaceIcon className="h-6 w-6" strokeWidth={active ? 2.2 : 1.8} />
                              <span className="text-[10px] font-bold leading-none">{scale.labels[i]}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : scale.key === "energy" ? (
                      /* Baterai energi — 5 segmen petir */
                      <div className="flex items-end gap-1.5" role="group" aria-label={scale.label}>
                        {[1, 2, 3, 4, 5].map((n) => {
                          const filled = value !== null && value >= n;
                          const active = value === n;
                          return (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setScales((prev) => ({ ...prev, energy: n }))}
                              aria-pressed={active}
                              aria-label={`Energi: ${scale.labels[n - 1]} (${n})`}
                              className={cn(
                                "press flex-1 rounded-lg border flex items-center justify-center transition-all",
                                active ? "border-gold bg-gold text-white shadow-soft" : filled ? "border-gold/50 bg-gold-soft text-gold" : "border-border/70 bg-background text-muted-foreground"
                              )}
                              style={{ height: 26 + n * 5 }}
                            >
                              <Zap className="h-4 w-4" fill={filled || active ? "currentColor" : "none"} strokeWidth={active ? 2.2 : 1.8} />
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      /* Angka 1–5 dengan warna semantik */
                      <div className="grid grid-cols-5 gap-1.5" role="group" aria-label={scale.label}>
                        {[1, 2, 3, 4, 5].map((n) => {
                          const active = value === n;
                          return (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setScales((prev) => ({ ...prev, [scale.key]: n }))}
                              aria-pressed={active}
                              aria-label={`${scale.label}: ${scale.labels[n - 1]} (${n})`}
                              className={cn(
                                "press rounded-xl border text-sm font-bold tabular transition-colors min-h-[44px] flex items-center justify-center",
                                active
                                  ? cn(checkinValueTone(scale.highIsGood, n), "border-current shadow-soft")
                                  : "bg-background text-muted-foreground border-border/70"
                              )}
                            >
                              {n}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            <div className="space-y-1.5">
              <label htmlFor="ci-sleep" className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Moon className="h-3.5 w-3.5" /> Durasi Tidur (jam)
              </label>
              <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Preset durasi tidur">
                {SLEEP_PRESETS.map((n) => {
                  const active = sleepNum === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSleepHours(String(n))}
                      aria-pressed={active}
                      aria-label={`Set tidur ${n} jam`}
                      className={cn(
                        "press flex min-h-[44px] flex-1 min-w-[44px] items-center justify-center gap-1 rounded-xl border text-xs font-bold tabular",
                        n === 8 && !active && "border-dashed border-sage/50 text-sage-deep bg-sage-soft/40",
                        active
                          ? "bg-studio text-white border-studio shadow-soft"
                          : n === 8
                            ? ""
                            : "bg-background text-muted-foreground border-border/70"
                      )}
                    >
                      {n === 8 && <Moon className="h-3 w-3" />}
                      {n}j
                    </button>
                  );
                })}
              </div>
              <Input
                id="ci-sleep"
                type="number"
                inputMode="decimal"
                step="0.5"
                min={0}
                max={24}
                placeholder="Lainnya, mis. 7.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
                className="h-11 tabular"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="ci-note" className="text-xs font-semibold text-muted-foreground">
                Catatan (opsional)
              </label>
              <Textarea
                id="ci-note"
                placeholder="Sesuatu yang ingin kamu ingat tentang hari ini..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

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
                <>
                  <HeartPulse className="h-4 w-4" /> Simpan Check-in
                </>
              )}
            </Button>
            {!Object.values(scales).some((v) => v !== null) && (
              <p className="text-xs text-muted-foreground mt-2 text-center">Isi minimal satu skala.</p>
            )}
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
