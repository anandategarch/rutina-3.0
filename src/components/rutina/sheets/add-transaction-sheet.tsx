"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Banknote, Landmark, Smartphone, ArrowLeftRight, WifiOff, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { rutinaApi } from "@/lib/rutina/api";
import { todayStr, formatNumber } from "@/lib/rutina/format";
import type { FinanceCategory } from "@/types/rutina";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Wallet } from "@/types/rutina";
import { cn } from "@/lib/utils";
import ConfirmDiscard from "@/components/rutina/sheets/confirm-discard";

type TxType = "income" | "expense" | "transfer";

// Kategori bawaan aplikasi — kategori buatan pengguna (hasil migrasi
// Rutina 2.0 + yang dibuat lewat lembar ini) menyatu lewat
// /api/fin-categories (lihat customCats di bawah).
const CATEGORY_OPTIONS: Record<"income" | "expense", string[]> = {
  income: ["gaji", "freelance", "hadiah", "lainnya"],
  expense: ["makan", "transport", "tagihan", "belanja", "hiburan", "kesehatan", "edukasi", "lainnya"],
};

// Kategori default per arus — dipakai saat jenis transaksi berganti agar
// transaksi pemasukan tidak pernah terkirim dengan kategori pengeluaran.
const DEFAULT_CAT: Record<"income" | "expense", string> = { income: "gaji", expense: "makan" };

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

/** Ambil digit saja untuk nominal. Tangani desimal id-ID: koma = desimal, titik = ribuan
 *  (tampilan masked input memakai formatNumber id-ID). Tempel "12500,5" atau "12.500,5"
 *  dibulatkan jadi "12501" — JANGAN digabung digitnya jadi "125005" (error 1000x). */
function digitsOnly(s: string) {
  // Deteksi bagian desimal: koma/titik diikuti 1-2 digit di akhir string
  if (/[,\.]\d{1,2}$/.test(s)) {
    // Buang pemisah ribuan (titik), ubah koma jadi titik, lalu bulatkan ke integer
    const num = Number(s.replace(/\./g, "").replace(/,/g, "."));
    if (Number.isFinite(num)) return String(Math.round(num));
  }
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

export default function AddTransactionSheet({
  open,
  onClose,
  prefill,
}: {
  open: boolean;
  onClose: () => void;
  /** Prefill dari kartu Hari Bolong (Catat Mundur): tanggal hari bolong + catatan. */
  prefill?: { date?: string; note?: string };
}) {
  const qc = useQueryClient();
  const qWallets = useQuery({
    queryKey: ["wallets"],
    queryFn: rutinaApi.wallets,
    enabled: open,
  });
  // useMemo: array stabil antar render agar useEffect default-dompet tidak jalan berulang
  const wallets: Wallet[] = React.useMemo(() => qWallets.data?.wallets ?? [], [qWallets.data]);

  // Kategori buatan pengguna — hasil migrasi Rutina 2.0 + yang dibuat lewat
  // lembar ini. staleTime 5 menit: daftar jarang berubah, hemat request.
  const qCats = useQuery({
    queryKey: ["fin-categories"],
    queryFn: rutinaApi.finCategories,
    enabled: open,
    staleTime: 5 * 60_000,
  });
  const customCats: FinanceCategory[] = React.useMemo(
    () => (qCats.data?.categories ?? []).filter((c) => !c.archived),
    [qCats.data]
  );

  const [type, setType] = React.useState<TxType>("expense");
  const [amountRaw, setAmountRaw] = React.useState("");
  const [amountFocused, setAmountFocused] = React.useState(false);
  const [category, setCategory] = React.useState(DEFAULT_CAT.expense);
  const [walletId, setWalletId] = React.useState("");
  const [toWalletId, setToWalletId] = React.useState("");
  const [date, setDate] = React.useState(todayStr());
  const [note, setNote] = React.useState("");
  const [recurring, setRecurring] = React.useState("none");

  // Kategori pilihan: bawaan + buatan pengguna (tanpa yang diarsipkan)
  const categoryOptions = React.useMemo(() => {
    if (type === "transfer") return [];
    const custom = customCats
      .filter((c) => c.type === type)
      .map((c) => c.name);
    return [...CATEGORY_OPTIONS[type], ...custom];
  }, [type, customCats]);

  // ===== Tambah kategori baru (inline) =====
  const [newCatOpen, setNewCatOpen] = React.useState(false);
  const [newCatName, setNewCatName] = React.useState("");
  const createCat = useMutation({
    mutationFn: (body: { name: string; type: "expense" | "income" }) =>
      rutinaApi.createFinCategory(body),
    onSuccess: (res) => {
      toast.success("Kategori baru tersimpan");
      qc.invalidateQueries({ queryKey: ["fin-categories"] });
      setCategory(res.category.name);
      setNewCatOpen(false);
      setNewCatName("");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const submitNewCat = (ev: React.FormEvent) => {
    ev.preventDefault();
    const name = newCatName.trim().slice(0, 60);
    if (!name) {
      toast.error("Nama kategori wajib diisi");
      return;
    }
    createCat.mutate({ name, type: type === "income" ? "income" : "expense" });
  };

  // Reset form setiap kali sheet dibuka; prefill Catat Mundur (tanggal hari
  // bolong) dihormati bila valid & tidak di masa depan — validasi ganda di
  // klien sejalan dengan tolak-tanggal-masa-depan di server.
  React.useEffect(() => {
    if (!open) return;
    setType("expense");
    setAmountRaw("");
    setAmountFocused(false);
    setCategory(DEFAULT_CAT.expense);
    setWalletId("");
    setToWalletId("");
    setDate(
      prefill?.date && prefill.date <= todayStr() ? prefill.date : todayStr()
    );
    setNote(prefill?.note ? prefill.note : "");
    setRecurring("none");
    setNewCatOpen(false);
    setNewCatName("");
  }, [open, prefill?.date, prefill?.note]);

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

  // Ganti jenis transaksi → kategori ikut default jenis baru, supaya
  // pemasukan tidak pernah terkirim dengan kategori pengeluaran (bug lama).
  const pickType = (t: TxType) => {
    setType(t);
    if (t !== "transfer") setCategory(DEFAULT_CAT[t]);
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

  // ===== Dirty-guard: jangan buang input yang sudah diketik diam-diam =====
  // Dompet sumber/tujuan diisi otomatis oleh efek default, jadi dibandingkan dengan
  // nilai default tersebut — bukan string kosong — agar sheet yang belum disentuh
  // tidak pernah dianggap kotor.
  const defaultWalletId = wallets[0]?.id ?? "";
  const defaultToWalletId = wallets.find((w) => w.id !== defaultWalletId)?.id ?? "";
  const defaultCategory = type === "transfer" ? "lainnya" : DEFAULT_CAT[type];
  const dirty =
    type !== "expense" ||
    amountRaw !== "" ||
    category !== defaultCategory ||
    note !== "" ||
    recurring !== "none" ||
    date !== todayStr() ||
    (wallets.length > 0 && (walletId !== defaultWalletId || toWalletId !== defaultToWalletId));
  const [confirmDiscard, setConfirmDiscard] = React.useState(false);
  const handleOpenChange = (o: boolean) => {
    if (!o) {
      if (dirty && !createTx.isPending) {
        setConfirmDiscard(true);
        return;
      }
      onClose();
    }
  };

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
    <Drawer open={open} onOpenChange={handleOpenChange}>
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
                  onClick={() => pickType(s.key)}
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
                  <SelectContent className="max-h-72">
                    {categoryOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        {catLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {newCatOpen ? (
                  // Div + tombol — JANGAN <form> bersarang di dalam form utama
                  // (HTML melarang form dalam form; klik submit bisa salah sasaran).
                  <div className="flex items-center gap-2">
                    <Input
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          submitNewCat(e);
                        }
                      }}
                      placeholder={`Nama kategori ${type === "income" ? "pemasukan" : "pengeluaran"}`}
                      maxLength={60}
                      className="min-h-[44px]"
                      aria-label="Nama kategori baru"
                    />
                    <button
                      type="button"
                      onClick={submitNewCat}
                      disabled={createCat.isPending}
                      className="press flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl bg-garden px-3 text-sm font-bold text-white disabled:opacity-60"
                    >
                      {createCat.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewCatOpen(false);
                        setNewCatName("");
                      }}
                      aria-label="Batal tambah kategori"
                      className="press flex min-h-[44px] shrink-0 items-center rounded-xl border border-border/70 px-3 text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setNewCatOpen(true)}
                    className="press flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/70 py-2 text-xs font-semibold text-muted-foreground hover:text-garden-deep"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Tambah kategori baru
                  </button>
                )}
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
            {qWallets.isError && (
              <div className="mb-3 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3">
                <WifiOff className="h-4 w-4 shrink-0 text-destructive" />
                <p className="min-w-0 flex-1 text-sm font-semibold text-destructive">Gagal memuat dompet</p>
                <button
                  type="button"
                  onClick={() => qWallets.refetch()}
                  className="press flex min-h-[44px] shrink-0 items-center rounded-xl border border-destructive/40 px-3 text-sm font-bold text-destructive"
                >
                  Coba Lagi
                </button>
              </div>
            )}
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

        {/* Konfirmasi buang perubahan yang belum disimpan */}
        <ConfirmDiscard open={confirmDiscard} onOpenChange={setConfirmDiscard} onConfirm={onClose} />
      </DrawerContent>
    </Drawer>
  );
}
