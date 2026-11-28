"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
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
import { HABIT_CATEGORY_META, TIME_OF_DAY_META } from "@/components/rutina/primitives";
import { HABIT_ICONS, habitIcon } from "@/components/rutina/habit-icons";
import { rutinaApi } from "@/lib/rutina/api";
import { invalidateAfterMutation } from "@/lib/rutina/queries";
import { cn } from "@/lib/utils";
import ConfirmDiscard from "@/components/rutina/sheets/confirm-discard";
import type { Habit } from "@/types/rutina";

// ============ Konstanta form ============

const DAY_CHIPS: { d: number; label: string }[] = [
  { d: 1, label: "Sen" },
  { d: 2, label: "Sel" },
  { d: 3, label: "Rab" },
  { d: 4, label: "Kam" },
  { d: 5, label: "Jum" },
  { d: 6, label: "Sab" },
  { d: 0, label: "Min" },
];

const COLOR_SWATCHES: { key: string; label: string; bg: string }[] = [
  { key: "emerald", label: "Sage", bg: "bg-garden" },
  { key: "amber", label: "Kuning", bg: "bg-gold" },
  { key: "teal", label: "Lumut tua", bg: "bg-vault" },
  { key: "rose", label: "Bata", bg: "bg-clay" },
  { key: "orange", label: "Lumut", bg: "bg-studio" },
  { key: "stone", label: "Abu", bg: "bg-secondary" },
];

interface HabitFormState {
  name: string;
  category: string;
  icon: string;
  color: string;
  scheduleType: "daily" | "custom";
  days: number[];
  timeOfDay: string;
  measured: boolean;
  unitLabel: string;
  unitTarget: string;
  unitStep: string;
  reminderTime: string;
  stackAfter: string;
}

const DEFAULT_FORM: HabitFormState = {
  name: "",
  category: "health",
  icon: "sprout",
  color: "emerald",
  scheduleType: "daily",
  days: [1, 2, 3, 4, 5],
  timeOfDay: "anytime",
  measured: false,
  unitLabel: "",
  unitTarget: "1",
  unitStep: "1",
  reminderTime: "",
  stackAfter: "",
};

// ============ Sheet ============

export default function AddHabitSheet({
  open,
  onClose,
  habit,
}: {
  open: boolean;
  onClose: () => void;
  habit?: Habit;
}) {
  const qc = useQueryClient();
  const isEdit = Boolean(habit);

  const [form, setForm] = React.useState<HabitFormState>(DEFAULT_FORM);

  // Prefill saat drawer dibuka (kunci pada id agar refetch tidak mengreset form)
  // Snapshot form awal (default atau hasil prefill edit) sebagai acuan dirty-guard.
  const habitId = habit?.id;
  const [initialForm, setInitialForm] = React.useState<HabitFormState>(DEFAULT_FORM);
  React.useEffect(() => {
    if (!open) return;
    if (habit) {
      const next: HabitFormState = {
        name: habit.name,
        category: habit.category,
        icon: habit.icon,
        color: habit.color,
        scheduleType: habit.scheduleType,
        days: habit.daysOfWeek.split(",").filter(Boolean).map(Number).filter((d) => d >= 0 && d <= 6),
        timeOfDay: habit.timeOfDay,
        measured: habit.unitTarget !== null,
        unitLabel: habit.unitLabel ?? "",
        unitTarget: habit.unitTarget !== null ? String(habit.unitTarget) : "1",
        unitStep: String(habit.unitStep),
        reminderTime: habit.reminderTime ?? "",
        stackAfter: habit.stackAfter ?? "",
      };
      setForm(next);
      setInitialForm(next);
    } else {
      setForm(DEFAULT_FORM);
      setInitialForm(DEFAULT_FORM);
    }
    // Deps sengaja hanya [open, habitId]: refetch latar bisa mengganti referensi objek
    // `habit` dan menimpa editan yang sedang berjalan (lihat komentar prefill di atas).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, habitId]);

  const set = <K extends keyof HabitFormState>(key: K, value: HabitFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  /** Enter pada input teks → fokus ke input berikutnya (rantai ketik mobile, tanpa submit). */
  const enterFocusNext = (nextId: string) => (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.key !== "Enter") return;
    ev.preventDefault();
    document.getElementById(nextId)?.focus();
  };

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      isEdit && habit ? rutinaApi.updateHabit(habit.id, payload) : rutinaApi.createHabit(payload),
    onSuccess: () => {
      toast.success("Kebiasaan tersimpan");
      invalidateAfterMutation(qc, ["habits"]);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ===== Dirty-guard: jangan buang input yang sudah diketik diam-diam =====
  const dirty =
    form.name !== initialForm.name ||
    form.category !== initialForm.category ||
    form.icon !== initialForm.icon ||
    form.color !== initialForm.color ||
    form.scheduleType !== initialForm.scheduleType ||
    form.timeOfDay !== initialForm.timeOfDay ||
    form.measured !== initialForm.measured ||
    form.unitLabel !== initialForm.unitLabel ||
    form.unitTarget !== initialForm.unitTarget ||
    form.unitStep !== initialForm.unitStep ||
    form.reminderTime !== initialForm.reminderTime ||
    form.stackAfter !== initialForm.stackAfter ||
    [...form.days].sort().join(",") !== [...initialForm.days].sort().join(",");
  const [confirmDiscard, setConfirmDiscard] = React.useState(false);
  const handleOpenChange = (o: boolean) => {
    if (!o) {
      if (dirty && !mutation.isPending) {
        setConfirmDiscard(true);
        return;
      }
      onClose();
    }
  };

  const toggleDay = (d: number) => {
    setForm((f) => ({
      ...f,
      days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d],
    }));
  };

  // audit G2: ev dilebarkan + opsional — iframe Preview Panel disandbox TANPA
  // `allow-forms`, sehingga submisi form native (klik tombol submit maupun
  // Enter) DIBLOKIR browser sebelum event submit terbentuk → tombol Simpan
  // mati diam-diam. Tombol submit kini juga memanggil handler via onClick;
  // preventDefault mencegah dobel di konteks biasa.
  const handleSubmit = (ev?: { preventDefault: () => void }) => {
    ev?.preventDefault();
    // audit 3-b#7: guard dobel-submit (onClick + Enter/submit bersamaan)
    if (mutation.isPending) return;
    if (!form.name.trim()) {
      toast.error("Nama kebiasaan wajib diisi");
      return;
    }
    if (form.scheduleType === "custom" && form.days.length === 0) {
      toast.error("Pilih minimal satu hari");
      return;
    }

    const measuredOn = form.measured;
    mutation.mutate({
      name: form.name.trim(),
      category: form.category,
      icon: form.icon,
      color: form.color,
      scheduleType: form.scheduleType,
      daysOfWeek: form.scheduleType === "daily" ? [0, 1, 2, 3, 4, 5, 6] : [...form.days].sort((a, b) => a - b),
      timeOfDay: form.timeOfDay,
      unitLabel: measuredOn ? form.unitLabel.trim() || "satuan" : null,
      unitTarget: measuredOn ? Number(form.unitTarget) > 0 ? Number(form.unitTarget) : 1 : null,
      unitStep: measuredOn ? Number(form.unitStep) > 0 ? Number(form.unitStep) : 1 : 1,
      reminderTime: form.reminderTime || null,
      stackAfter: form.stackAfter.trim() || null,
    });
  };

  const iconPreview = React.createElement(habitIcon(form.icon), { className: "h-4 w-4 text-white" });

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[85dvh]">
        <DrawerHeader className="px-4 text-left">
          <DrawerTitle className="text-base font-bold">
            {isEdit ? "Sunting Kebiasaan" : "Tanam Kebiasaan Baru"}
          </DrawerTitle>
          <DrawerDescription>
            {isEdit
              ? "Perbarui detail kebiasaan agar tetap sesuai ritmemu."
              : "Rancang kebiasaan kecil yang bisa dipanen setiap hari."}
          </DrawerDescription>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          <div className="overflow-y-auto scroll-thin px-4 pb-4 space-y-5">
            {/* ===== Nama ===== */}
            <div>
              <label htmlFor="habit-name" className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                Nama kebiasaan
              </label>
              <Input
                id="habit-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Contoh: Minum 8 gelas air"
                className="h-11 rounded-xl"
                enterKeyHint="next"
                onKeyDown={enterFocusNext(form.measured ? "habit-unit" : "habit-reminder")}
              />
            </div>

            {/* ===== Kategori ===== */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Kategori</label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger className="h-11 rounded-xl w-full" aria-label="Kategori">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(HABIT_CATEGORY_META).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ===== Ikon ===== */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                Ikon — pilih simbol kebiasaan
              </label>
              <div className="grid grid-cols-5 gap-2">
                {Object.keys(HABIT_ICONS).map((key) => {
                  const Ic = HABIT_ICONS[key];
                  const active = form.icon === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => set("icon", key)}
                      aria-label={`Ikon ${key}`}
                      aria-pressed={active}
                      className={cn(
                        "press h-11 rounded-xl flex items-center justify-center border transition-colors",
                        active
                          ? "bg-garden-soft border-garden text-garden-deep ring-1 ring-garden"
                          : "bg-secondary border-transparent text-muted-foreground"
                      )}
                    >
                      <Ic className="h-5 w-5" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ===== Warna ===== */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Warna kartu</label>
              <div className="flex items-center gap-3 flex-wrap">
                {COLOR_SWATCHES.map((c) => {
                  const active = form.color === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => set("color", c.key)}
                      aria-label={`Warna ${c.label}`}
                      aria-pressed={active}
                      className={cn(
                        "press h-11 w-11 rounded-full flex items-center justify-center ring-offset-2 ring-offset-background transition-shadow",
                        c.bg,
                        active ? "ring-2 ring-foreground/50" : "ring-0"
                      )}
                    >
                      {/* audit 1-c P2: swatch terang (secondary) membuat Check putih tak terlihat */}
                      {active && <Check className="h-4 w-4 text-foreground" strokeWidth={3} />}
                    </button>
                  );
                })}
                <span className="ml-auto flex items-center gap-2 rounded-xl bg-secondary px-3 py-2">
                  <span className={cn("h-8 w-8 rounded-lg flex items-center justify-center", COLOR_SWATCHES.find((c) => c.key === form.color)?.bg)}>
                    {iconPreview}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">Pratinjau</span>
                </span>
              </div>
            </div>

            {/* ===== Jadwal ===== */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Jadwal</label>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
                {(
                  [
                    { key: "daily", label: "Setiap hari" },
                    { key: "custom", label: "Hari tertentu" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => set("scheduleType", opt.key)}
                    aria-pressed={form.scheduleType === opt.key}
                    className={cn(
                      "press min-h-[44px] rounded-lg text-sm font-bold transition-colors",
                      form.scheduleType === opt.key
                        ? "bg-card shadow-soft text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {form.scheduleType === "custom" && (
                <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                  {DAY_CHIPS.map((d) => {
                    const active = form.days.includes(d.d);
                    return (
                      <button
                        key={d.d}
                        type="button"
                        onClick={() => toggleDay(d.d)}
                        aria-pressed={active}
                        className={cn(
                          "press min-h-[44px] min-w-[44px] flex-1 rounded-xl text-xs font-bold border transition-colors",
                          active
                            ? "bg-garden text-white border-garden"
                            : "bg-card border-border text-muted-foreground"
                        )}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ===== Waktu ===== */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Waktu pelaksanaan</label>
              <Select value={form.timeOfDay} onValueChange={(v) => set("timeOfDay", v)}>
                <SelectTrigger className="h-11 rounded-xl w-full" aria-label="Waktu pelaksanaan">
                  <SelectValue placeholder="Pilih waktu" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIME_OF_DAY_META).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ===== Habit terukur ===== */}
            <div className="rounded-xl border border-border/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold">Habit terukur</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Catat progres dengan angka, misal jumlah gelas atau halaman.
                  </p>
                </div>
                <Switch
                  checked={form.measured}
                  onCheckedChange={(v) => set("measured", v)}
                  aria-label="Aktifkan habit terukur"
                />
              </div>
              {form.measured && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="col-span-3 sm:col-span-1">
                    <label htmlFor="habit-unit" className="text-xs font-semibold text-muted-foreground mb-1 block">
                      Satuan
                    </label>
                    <Input
                      id="habit-unit"
                      value={form.unitLabel}
                      onChange={(e) => set("unitLabel", e.target.value)}
                      placeholder="gelas"
                      className="h-10 rounded-lg"
                      enterKeyHint="next"
                      onKeyDown={enterFocusNext("habit-target")}
                    />
                  </div>
                  <div>
                    <label htmlFor="habit-target" className="text-xs font-semibold text-muted-foreground mb-1 block">
                      Target/hari
                    </label>
                    <Input
                      id="habit-target"
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      value={form.unitTarget}
                      onChange={(e) => set("unitTarget", e.target.value)}
                      className="h-10 rounded-lg tabular"
                      enterKeyHint="next"
                      onKeyDown={enterFocusNext("habit-step")}
                    />
                  </div>
                  <div>
                    <label htmlFor="habit-step" className="text-xs font-semibold text-muted-foreground mb-1 block">
                      Langkah
                    </label>
                    <Input
                      id="habit-step"
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      value={form.unitStep}
                      onChange={(e) => set("unitStep", e.target.value)}
                      className="h-10 rounded-lg tabular"
                      enterKeyHint="done"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ===== Pengingat ===== */}
            <div>
              <label htmlFor="habit-reminder" className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                Pengingat (opsional)
              </label>
              <Input
                id="habit-reminder"
                type="time"
                value={form.reminderTime}
                onChange={(e) => set("reminderTime", e.target.value)}
                className="h-11 rounded-xl tabular"
              />
            </div>

            {/* ===== Habit stacking ===== */}
            <div>
              <label htmlFor="habit-stack" className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                Menumpuk kebiasaan (opsional)
              </label>
              <Textarea
                id="habit-stack"
                value={form.stackAfter}
                onChange={(e) => set("stackAfter", e.target.value)}
                placeholder="Setelah menyiram wajah…"
                rows={2}
                className="rounded-xl resize-none"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tuliskan pemicu: kebiasaan yang sudah ada sebelum kebiasaan ini.
              </p>
            </div>
          </div>

          {/* ===== Submit (footer sticky di luar area scroll) ===== */}
          <div className="border-t border-border/60 bg-background p-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
            <button
              type="submit"
              onClick={() => handleSubmit()}
              disabled={mutation.isPending}
              className="press w-full h-11 rounded-xl bg-garden-deep text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Simpan Perubahan" : "Simpan Kebiasaan"}
            </button>
          </div>
        </form>

        {/* Konfirmasi buang perubahan yang belum disimpan */}
        <ConfirmDiscard open={confirmDiscard} onOpenChange={setConfirmDiscard} onConfirm={onClose} />
      </DrawerContent>
    </Drawer>
  );
}
