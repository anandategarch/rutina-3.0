"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Banknote, Landmark, Smartphone, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { rutinaApi } from "@/lib/rutina/api";
import { todayStr, formatNumber } from "@/lib/rutina/format";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Wallet } from "@/types/rutina";
import { cn } from "@/lib/utils";

type TxType = "income" | "expense" | "transfer";

const CATEGORY_OPTIONS: Record<"income" | "expense", string[]> = {
  income: ["gaji", "freelance", "hadiah", "lainnya"],
  expense: ["makan", "transport", "tagihan", "belanja", "hiburan", "kesehatan", "edukasi", "lainnya"],
};

const RECURRING_OPTIONS: { value: "none" | "weekly" | "monthly"; label: string }[] = [
  { value: "none", label: "Tidak berulang" },
  { value: "weekly", label: "Mingguan" },
  { value: "monthly", label: "Bulanan" },
];

const WALLET_TYPE_ICON: Record<string, React.ElementType> = {
  cash: Banknote,
  bank: Landmark,
  ewallet: Smartphone,
};

function catLabel(c: string) {
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function digitsOnly(s: string) {
  return s.replace(/[^\d]/g, "");
}

const SEGMENT: { key: TxType; label: string }[] = [
  { key: "income", label: "Masuk" },
  { key: "expense", label: "Keluar" },
  { key: "transfer", label: "Transfer" },
];

const SEGMENT_STYLE: Record<TxType, string> = {
  income: "bg-garden text-white",
  expense: "bg-clay text-white",
  transfer: "bg-vault text-white",
};

export default function AddTransactionSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const qWallets = useQuery({
    queryKey: ["wallets"],
    queryFn: rutinaApi.wallets,
    enabled: open,
  });
  // useMemo: array stabil antar render agar useEffect default-dompet tidak jalan berulang
  const wallets: Wallet[] = React.useMemo(() => qWallets.data?.wallets ?? [], [qWallets.data]);

  const [type, setType] = React.useState<TxType>("expense");
  const [amountRaw, setAmountRaw] = React.useState("");
  const [amountFocused, setAmountFocused] = React.useState(false);
  const [category, setCategory] = React.useState("makan");
  const [walletId, setWalletId] = React.useState("");
  const [toWalletId, setToWalletId] = React.useState("");
  const [date, setDate] = React.useState(todayStr());
  const [note, setNote] = React.useState("");
  const [recurring, setRecurring] = React.useState("none");

  // Reset form setiap kali sheet dibuka
  React.useEffect(() => {
    if (!open) return;
    setType("expense");
    setAmountRaw("");
    setAmountFocused(false);
    setCategory("makan");
    setWalletId("");
    setToWalletId("");
    setDate(todayStr());
    setNote("");
    setRecurring("none");
  }, [open]);

  // Default dompet saat data wallets tersedia
  React.useEffect(() => {
    if (!open || wallets.length === 0) return;
    setWalletId((cur) => (cur && wallets.some((w) => w.id === cur) ? cur : wallets[0].id));
    setToWalletId((cur) => (cur && cur !== wallets[0]?.id && wallets.some((w) => w.id === cur) ? cur : wallets.find((w) => w.id !== wallets[0]?.id)?.id ?? ""));
  }, [open, wallets]);

  const pickSourceWallet = (v: string) => {
    setWalletId(v);
    if (v === toWalletId) {
      setToWalletId(wallets.find((w) => w.id !== v)?.id ?? "");
    }
  };

  const invalidateFinance = React.useCallback(() => {
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["wallets"] });
    qc.invalidateQueries({ queryKey: ["budgets"] });
    qc.invalidateQueries({ queryKey: ["home"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
  }, [qc]);

  const createTx = useMutation({
    mutationFn: (body: Record<string, unknown>) => rutinaApi.createTransaction(body),
    onSuccess: () => {
      toast.success("Transaksi tersimpan");
      invalidateFinance();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const amount = Number(amountRaw || 0);
  const targetWallets = wallets.filter((w) => w.id !== walletId);

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!wallets.length) {
      toast.error("Tambahkan dompet terlebih dahulu");
      return;
    }
    if (amount <= 0) {
      toast.error("Nominal harus lebih dari 0");
      return;
    }
    if (!walletId) {
      toast.error("Dompet sumber wajib dipilih");
      return;
    }
    if (type === "transfer") {
      if (!toWalletId) {
        toast.error("Dompet tujuan wajib dipilih");
        return;
      }
      if (toWalletId === walletId) {
        toast.error("Dompet tujuan harus berbeda");
        return;
      }
    }
    if (!date) {
      toast.error("Tanggal wajib diisi");
      return;
    }
    createTx.mutate({
      type,
      amount,
      category: type === "transfer" ? "lainnya" : category,
      walletId,
      toWalletId: type === "transfer" ? toWalletId : undefined,
      date,
      note: note.trim() || undefined,
      recurring,
    });
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[92dvh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle>Catat Transaksi</DrawerTitle>
          <DrawerDescription>Pencatatan masuk, keluar, atau transfer antar dompet.</DrawerDescription>
        </DrawerHeader>
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          <div className="space-y-4 overflow-y-auto scroll-thin px-4 pb-4">
            {/* Segmented toggle */}
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
              {SEGMENT.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setType(s.key)}
                  aria-pressed={type === s.key}
                  className={cn(
                    "press min-h-[44px] rounded-lg text-sm font-bold transition-colors",
                    type === s.key ? SEGMENT_STYLE[s.key] : "text-muted-foreground"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Nominal */}
            <div>
              <Label htmlFor="tx-amount" className="sr-only">
                Nominal
              </Label>
              <div className="flex h-14 items-center gap-2 rounded-xl border border-input bg-card px-4 focus-within:ring-2 focus-within:ring-ring/40">
                <span className="text-lg font-bold text-muted-foreground">Rp</span>
                <input
                  id="tx-amount"
                  inputMode="numeric"
                  value={amountFocused ? amountRaw : amountRaw ? formatNumber(Number(amountRaw)) : ""}
                  onChange={(e) => setAmountRaw(digitsOnly(e.target.value))}
                  onFocus={() => setAmountFocused(true)}
                  onBlur={() => setAmountFocused(false)}
                  placeholder="0"
                  aria-label="Nominal transaksi"
                  enterKeyHint="next"
                  onKeyDown={(e) => {
                    // Enter → lompat ke field berikutnya (bukan submit form)
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    document.getElementById(type === "transfer" ? "tx-wallet" : "tx-category")?.focus();
                  }}
                  className="w-full bg-transparent text-2xl font-bold tabular outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Kategori (bukan transfer) */}
            {type !== "transfer" && (
              <div className="space-y-1.5">
                <Label htmlFor="tx-category">Kategori</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="tx-category" className="w-full min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS[type].map((c) => (
                      <SelectItem key={c} value={c}>
                        {catLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Dompet sumber */}
            <div className="space-y-1.5">
              <Label htmlFor="tx-wallet">{type === "transfer" ? "Dompet Sumber" : "Dompet"}</Label>
              <Select value={walletId} onValueChange={pickSourceWallet}>
                <SelectTrigger id="tx-wallet" className="w-full min-h-[44px]">
                  <SelectValue placeholder="Pilih dompet" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map((w) => {
                    const Icon = WALLET_TYPE_ICON[w.type] ?? Banknote;
                    return (
                      <SelectItem key={w.id} value={w.id}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          {w.name}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Dompet tujuan (transfer) */}
            {type === "transfer" && (
              <div className="space-y-1.5">
                <Label htmlFor="tx-wallet-target" className="flex items-center gap-1.5">
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  Dompet Tujuan
                </Label>
                <Select value={toWalletId} onValueChange={setToWalletId}>
                  <SelectTrigger id="tx-wallet-target" className="w-full min-h-[44px]">
                    <SelectValue placeholder="Pilih dompet tujuan" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetWallets.map((w) => {
                      const Icon = WALLET_TYPE_ICON[w.type] ?? Banknote;
                      return (
                        <SelectItem key={w.id} value={w.id}>
                          <span className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            {w.name}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tanggal */}
            <div className="space-y-1.5">
              <Label htmlFor="tx-date">Tanggal</Label>
              <Input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="min-h-[44px] tabular"
              />
            </div>

            {/* Catatan */}
            <div className="space-y-1.5">
              <Label htmlFor="tx-note">Catatan</Label>
              <Input
                id="tx-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="cth. Makan siang, bensin, Netflix"
                className="min-h-[44px]"
                enterKeyHint="done"
              />
            </div>

            {/* Berulang */}
            <div className="space-y-1.5">
              <Label htmlFor="tx-recurring">Berulang</Label>
              <Select value={recurring} onValueChange={setRecurring}>
                <SelectTrigger id="tx-recurring" className="w-full min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRING_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ===== Submit (footer sticky di luar area scroll) ===== */}
          <div className="border-t border-border/60 bg-background p-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
            <button
              type="submit"
              disabled={createTx.isPending || qWallets.isLoading || !wallets.length}
              className="press flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-vault text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createTx.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {createTx.isPending ? "Menyimpan..." : "Simpan Transaksi"}
            </button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
