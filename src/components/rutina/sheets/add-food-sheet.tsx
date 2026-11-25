"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Loader2, Flame, ArrowLeft, UtensilsCrossed } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { rutinaApi } from "@/lib/rutina/api";
import { todayStr, formatNumber } from "@/lib/rutina/format";
import type { FoodItem } from "@/types/rutina";

const MEAL_OPTIONS: { value: string; label: string }[] = [
  { value: "breakfast", label: "Pagi" },
  { value: "lunch", label: "Siang" },
  { value: "dinner", label: "Malam" },
  { value: "snack", label: "Snack" },
];

const MEAL_LABEL: Record<string, string> = Object.fromEntries(
  MEAL_OPTIONS.map((m) => [m.value, m.label])
);

function useDebounced(value: string, delay = 300): string {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function AddFoodSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();

  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebounced(query, 300);

  const [selected, setSelected] = React.useState<FoodItem | null>(null);
  const [meal, setMeal] = React.useState("lunch");
  const [portion, setPortion] = React.useState("");
  const [calories, setCalories] = React.useState("");
  const [protein, setProtein] = React.useState("");
  const [carbs, setCarbs] = React.useState("");
  const [fat, setFat] = React.useState("");
  const [date, setDate] = React.useState(todayStr());

  // Reset tiap kali sheet dibuka
  React.useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(null);
      setMeal(guessMeal());
      setPortion("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      setDate(todayStr());
    }
  }, [open]);

  const itemsQuery = useQuery({
    queryKey: ["food-items", debouncedQuery],
    queryFn: () => rutinaApi.foodItems(debouncedQuery.trim() || undefined),
    enabled: open,
  });

  const pickItem = (item: FoodItem) => {
    setSelected(item);
    setCalories(String(Math.round(item.calories)));
    setProtein(item.protein !== null ? String(item.protein) : "");
    setCarbs(item.carbs !== null ? String(item.carbs) : "");
    setFat(item.fat !== null ? String(item.fat) : "");
    setPortion(item.serving ?? "");
  };

  const backToSearch = () => {
    setSelected(null);
  };

  const mutation = useMutation({
    mutationFn: rutinaApi.createFood,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foods"] });
      queryClient.invalidateQueries({ queryKey: ["home"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Asupan tersimpan");
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Gagal menyimpan asupan");
    },
  });

  const calNum = Number(calories);
  const canSubmit = selected !== null && calories !== "" && Number.isFinite(calNum) && calNum >= 0 && !mutation.isPending;

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!canSubmit || !selected) return;
    mutation.mutate({
      name: selected.name,
      meal,
      date,
      portion: portion.trim() || undefined,
      calories: calNum,
      ...(protein !== "" && Number(protein) > 0 ? { protein: Number(protein) } : {}),
      ...(carbs !== "" && Number(carbs) > 0 ? { carbs: Number(carbs) } : {}),
      ...(fat !== "" && Number(fat) > 0 ? { fat: Number(fat) } : {}),
    });
  };

  const items = itemsQuery.data?.items ?? [];

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[94dvh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-studio-deep">Catat Asupan</DrawerTitle>
          <DrawerDescription>
            {selected ? `${selected.name} — atur porsi dan waktu makan.` : "Cari makanan dari daftar pilihan."}
          </DrawerDescription>
        </DrawerHeader>

        {selected === null ? (
          /* ===== Step 1: Pencarian ===== */
          <div className="px-4 space-y-3 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari makanan (mis. Nasi Ayam)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-11 pl-9"
                aria-label="Cari makanan"
              />
            </div>

            <div className="max-h-[46dvh] overflow-y-auto scroll-thin rounded-2xl border border-border/60 divide-y divide-border/60">
              {itemsQuery.isLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Memuat daftar makanan...
                </div>
              ) : items.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Tidak ada makanan cocok dengan &ldquo;{debouncedQuery}&rdquo;.
                </div>
              ) : (
                items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => pickItem(item)}
                    className="press w-full flex items-center justify-between gap-3 px-3 py-3 text-left min-h-[56px] hover:bg-studio-soft/60"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold truncate">{item.name}</span>
                      {item.serving && (
                        <span className="block text-[11px] text-muted-foreground truncate">{item.serving}</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-bold text-studio-deep tabular shrink-0">
                      <Flame className="h-3.5 w-3.5" />
                      {formatNumber(item.calories)}
                    </span>
                  </button>
                ))
              )}
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              {query !== debouncedQuery ? "Mencari..." : "Ketuk makanan untuk mengisi form."}
            </p>
          </div>
        ) : (
          /* ===== Step 2: Form detail ===== */
          <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
            <div className="overflow-y-auto scroll-thin px-4 pb-4 space-y-4">
              <div className="flex items-center gap-2 rounded-2xl bg-studio-soft p-3">
                <button
                  type="button"
                  onClick={backToSearch}
                  aria-label="Kembali ke pencarian"
                  className="press h-9 w-9 rounded-full bg-card flex items-center justify-center text-studio-deep shrink-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{selected.name}</p>
                  {selected.serving && (
                    <p className="text-[11px] text-muted-foreground truncate">Standar: {selected.serving}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="food-meal" className="text-xs font-semibold text-muted-foreground">
                    Waktu Makan
                  </label>
                  <Select value={meal} onValueChange={setMeal}>
                    <SelectTrigger id="food-meal" className="h-11 w-full">
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEAL_OPTIONS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="food-date" className="text-xs font-semibold text-muted-foreground">
                    Tanggal
                  </label>
                  <Input id="food-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="food-portion" className="text-xs font-semibold text-muted-foreground">
                  Porsi
                </label>
                <Input
                  id="food-portion"
                  placeholder="1 piring / 200 gram"
                  value={portion}
                  onChange={(e) => setPortion(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="food-calories" className="text-xs font-semibold text-muted-foreground">
                  Kalori (kkal) *
                </label>
                <Input
                  id="food-calories"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  className="h-11 tabular"
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Makro (gram, opsional)</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-studio-deep block mb-1">Protein</label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      placeholder="30"
                      value={protein}
                      onChange={(e) => setProtein(e.target.value)}
                      className="h-10 tabular"
                      aria-label="Protein gram"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-garden-deep block mb-1">Karbo</label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      placeholder="50"
                      value={carbs}
                      onChange={(e) => setCarbs(e.target.value)}
                      className="h-10 tabular"
                      aria-label="Karbohidrat gram"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-vault-deep block mb-1">Lemak</label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      placeholder="15"
                      value={fat}
                      onChange={(e) => setFat(e.target.value)}
                      className="h-10 tabular"
                      aria-label="Lemak gram"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border/60 bg-background p-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
              <Button
                type="submit"
                disabled={!canSubmit}
                className="press w-full h-12 rounded-2xl text-sm font-bold bg-studio text-white hover:bg-studio-deep min-h-[44px]"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <UtensilsCrossed className="h-4 w-4" /> Simpan {MEAL_LABEL[meal] ?? "Asupan"}
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DrawerContent>
    </Drawer>
  );
}

/** Tebak waktu makan berdasarkan jam saat ini. */
function guessMeal(): string {
  const h = new Date().getHours();
  if (h >= 4 && h < 11) return "breakfast";
  if (h >= 11 && h < 15) return "lunch";
  if (h >= 15 && h < 21) return "dinner";
  return "snack";
}
