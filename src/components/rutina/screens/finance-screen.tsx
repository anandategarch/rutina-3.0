"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
  Repeat,
  Lightbulb,
  UtensilsCrossed,
  CarFront,
  Receipt,
  ShoppingBag,
  Clapperboard,
  HeartPulse,
  GraduationCap,
  BadgeDollarSign,
  Laptop,
  Gift,
  CircleDollarSign,
  TrendingUp,
  TrendingDown,
  Scale,
  Wallet,
  PiggyBank,
  Palmtree,
  ShieldCheck,
  Target,
  CalendarDays,
  AlertTriangle,
  Loader2,
  Search,
  List,
  PieChart as PieChartIcon,
  Home,
  Plane,
} from "lucide-react";
import { toast } from "sonner";
import { rutinaApi, api } from "@/lib/rutina/api";
import {
  todayStr,
  addDays,
  dayName,
  formatDayMonth,
  monthName,
  formatRupiah,
  formatNumber,
  startOfMonth,
  rangeDays,
  dayOfWeek,
} from "@/lib/rutina/format";
import { ScreenHeader, SectionCard, StatTile, EmptyState, Pill } from "@/components/rutina/primitives";
import {
  CLAY,
  DeltaBadge,
  Donut,
  HBarList,
  MetricBar,
  MiniBars,
  RingStat,
  SAGE,
  SAGE_DEEP,
  Sparkline,
  StackBar,
  rampColor,
} from "@/components/rutina/charts";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import type { Budget, SavingsGoal, Transaction } from "@/types/rutina";
import { cn } from "@/lib/utils";

// ============ Konstanta modul Vault ============

const CATEGORY_ICON: Record<string, React.ElementType> = {
  makan: UtensilsCrossed,
  transport: CarFront,
  tagihan: Receipt,
  belanja: ShoppingBag,
  hiburan: Clapperboard,
  kesehatan: HeartPulse,
  edukasi: GraduationCap,
  gaji: BadgeDollarSign,
  freelance: Laptop,
  hadiah: Gift,
  lainnya: CircleDollarSign,
};

const CATEGORY_TONE: Record<string, "stone" | "garden" | "studio" | "vault" | "clay" | "gold"> = {
  makan: "studio",
  transport: "studio",
  tagihan: "gold",
  belanja: "clay",
  hiburan: "gold",
  kesehatan: "garden",
  edukasi: "vault",
  gaji: "garden",
  freelance: "garden",
  hadiah: "gold",
  lainnya: "stone",
};

const GOAL_ICON: Record<string, React.ElementType> = {
  "piggy-bank": PiggyBank,
  laptop: Laptop,
  palmtree: Palmtree,
  "shield-check": ShieldCheck,
  plane: Plane,
  car: CarFront,
  home: Home,
  gift: Gift,
  target: Target,
  wallet: Wallet,
};

const GOAL_COLOR_VAR: Record<string, string> = {
  vault: "var(--vault)",
  gold: "var(--gold)",
  studio: "var(--studio)",
  garden: "var(--garden)",
};

const DAY_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function catLabel(c: string) {
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function digitsOnly(s: string) {
  return s.replace(/[^\d]/g, "");
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function patchBudget(id: string, monthlyLimit: number) {
  return api.patch<{ budget: Budget }>(`/api/budgets/${id}`, { monthlyLimit });
}

// ============ Skeleton ============

function FinanceSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-3 pb-6">
      <Skeleton className="h-44 rounded-xl" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-56 rounded-xl" />
    </div>
  );
}

// ============ Field & aksi dialog ============

function NumberField({
  id,
  label,
  value,
  onChange,
  placeholder,
  prefix,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix?: boolean;
}) {
  // Saat fokus: tampilkan digit mentah agar karet teks tidak melompat ke akhir;
  // saat blur: tampilkan nilai berformat.
  const [focused, setFocused] = React.useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">Rp</span>
        )}
        <Input
          id={id}
          inputMode="numeric"
          value={focused ? value : value ? formatNumber(Number(value)) : ""}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onChange(digitsOnly(e.target.value))}
          placeholder={placeholder}
          className={cn("min-h-[44px] tabular", prefix && "pl-10")}
        />
      </div>
    </div>
  );
}

function DialogActions({
  onCancel,
  onConfirm,
  confirmLabel,
  pending,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  pending?: boolean;
}) {
  return (
    <DialogFooter className="gap-2">
      <Button type="button" variant="outline" onClick={onCancel} className="min-h-[44px] flex-1 rounded-xl">
        Batal
      </Button>
      <Button
        type="button"
        onClick={onConfirm}
        disabled={pending}
        className="min-h-[44px] flex-1 rounded-xl bg-vault text-white hover:bg-vault-deep"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {confirmLabel}
      </Button>
    </DialogFooter>
  );
}

// ============ FinanceScreen ============

export default function FinanceScreen() {
  const qc = useQueryClient();

  const invalidateFinance = React.useCallback(() => {
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["wallets"] });
    qc.invalidateQueries({ queryKey: ["budgets"] });
    qc.invalidateQueries({ queryKey: ["goals"] });
    qc.invalidateQueries({ queryKey: ["home"] });
  }, [qc]);

  const qTx = useQuery({ queryKey: ["transactions"], queryFn: rutinaApi.transactions });
  const qWallets = useQuery({ queryKey: ["wallets"], queryFn: rutinaApi.wallets });
  const qBudgets = useQuery({ queryKey: ["budgets"], queryFn: rutinaApi.budgets });
  const qGoals = useQuery({ queryKey: ["goals"], queryFn: rutinaApi.goals });

  const transactions = qTx.data?.transactions ?? [];
  const wallets = qWallets.data?.wallets ?? [];
  const budgets = qBudgets.data?.budgets ?? [];
  const goals = qGoals.data?.goals ?? [];
  const loading = qTx.isLoading || qWallets.isLoading || qBudgets.isLoading || qGoals.isLoading;

  // ---- Dialog & form states ----
  const [walletOpen, setWalletOpen] = React.useState(false);
  const [wName, setWName] = React.useState("");
  const [wType, setWType] = React.useState("cash");
  const [wInit, setWInit] = React.useState("");

  const [editBudget, setEditBudget] = React.useState<Budget | null>(null);
  const [bLimit, setBLimit] = React.useState("");

  const [contribGoal, setContribGoal] = React.useState<SavingsGoal | null>(null);
  const [gAmount, setGAmount] = React.useState("");

  const [newGoalOpen, setNewGoalOpen] = React.useState(false);
  const [gName, setGName] = React.useState("");
  const [gTarget, setGTarget] = React.useState("");
  const [gDeadline, setGDeadline] = React.useState("");

  // ---- Mutasi states ----
  const now = new Date();
  const [viewYear, setViewYear] = React.useState(now.getFullYear());
  const [viewMonthIdx, setViewMonthIdx] = React.useState(now.getMonth()); // 0-based
  const [typeFilter, setTypeFilter] = React.useState<"all" | "income" | "expense" | "transfer">("all");
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonthIdx + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonthIdx(d.getMonth());
  };

  // ---- Mutations ----
  const createWallet = useMutation({
    mutationFn: (body: Record<string, unknown>) => rutinaApi.createWallet(body),
    onSuccess: () => {
      toast.success("Dompet ditambahkan");
      invalidateFinance();
      setWalletOpen(false);
      setWName("");
      setWType("cash");
      setWInit("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteTx = useMutation({
    mutationFn: (id: string) => rutinaApi.deleteTransaction(id),
    onSuccess: () => {
      toast.success("Transaksi dihapus");
      invalidateFinance();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateBudget = useMutation({
    mutationFn: ({ id, monthlyLimit }: { id: string; monthlyLimit: number }) => patchBudget(id, monthlyLimit),
    onSuccess: () => {
      toast.success("Limit anggaran diperbarui");
      invalidateFinance();
      setEditBudget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const contributeGoal = useMutation({
    mutationFn: ({ id, currentAmount }: { id: string; currentAmount: number }) =>
      rutinaApi.updateGoal(id, { currentAmount }),
    onSuccess: () => {
      toast.success("Dana ditambahkan ke tujuan");
      invalidateFinance();
      setContribGoal(null);
      setGAmount("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createGoal = useMutation({
    mutationFn: (body: Record<string, unknown>) => rutinaApi.createGoal(body),
    onSuccess: () => {
      toast.success("Tujuan tabungan dibuat");
      invalidateFinance();
      setNewGoalOpen(false);
      setGName("");
      setGTarget("");
      setGDeadline("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteBudget = useMutation({
    mutationFn: (id: string) => api.delete<{ ok: boolean }>(`/api/budgets/${id}`),
    onSuccess: () => {
      toast.success("Anggaran dihapus");
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ============ Agregasi (useMemo) ============

  const totalBalance = React.useMemo(
    () => wallets.reduce((a, w) => a + (w.balance ?? w.initialBalance), 0),
    [wallets]
  );

  // Baris dompet: saldo + proporsi + warna ramp sage (untuk StackBar proporsi & dot chip)
  const walletRows = React.useMemo(() => {
    const positiveSum = wallets.reduce((a, w) => a + Math.max(0, w.balance ?? w.initialBalance), 0) || 1;
    return wallets.map((w, i) => {
      const balance = w.balance ?? w.initialBalance;
      return {
        id: w.id,
        name: w.name,
        balance,
        share: balance > 0 ? balance / positiveSum : 0,
        color: rampColor(i, Math.max(1, wallets.length)),
      };
    });
  }, [wallets]);

  const monthTotals = React.useMemo(() => {
    const prefix = startOfMonth(todayStr()).slice(0, 7);
    let income = 0;
    let expense = 0;
    let count = 0;
    for (const t of transactions) {
      if (!t.date.startsWith(prefix)) continue;
      if (t.type === "income") income += t.amount;
      else if (t.type === "expense") expense += t.amount;
      if (t.type !== "transfer") count += 1;
    }
    return { income, expense, net: income - expense, count };
  }, [transactions]);

  const cashflow = React.useMemo(() => {
    const today = todayStr();
    const days = rangeDays(addDays(today, -29), today);
    const map = new Map(days.map((d) => [d, { income: 0, expense: 0 }]));
    for (const t of transactions) {
      const slot = map.get(t.date);
      if (!slot) continue;
      if (t.type === "income") slot.income += t.amount;
      else if (t.type === "expense") slot.expense += t.amount;
    }
    return days.map((d) => ({
      date: d,
      label: formatDayMonth(d),
      income: map.get(d)?.income ?? 0,
      expense: map.get(d)?.expense ?? 0,
    }));
  }, [transactions]);

  // Tren saldo bersih 30 hari: estimasi saldo harian, berakhir tepat di total saldo hari ini
  const balanceTrend = React.useMemo(() => {
    const netByDate = new Map<string, number>();
    for (const t of transactions) {
      if (t.type === "transfer") continue;
      netByDate.set(t.date, (netByDate.get(t.date) ?? 0) + (t.type === "income" ? t.amount : -t.amount));
    }
    const days = rangeDays(addDays(todayStr(), -29), todayStr());
    let futureNet = 0;
    const series: number[] = [];
    for (let i = days.length - 1; i >= 0; i--) {
      futureNet += netByDate.get(days[i]) ?? 0;
      series.unshift(totalBalance - futureNet);
    }
    const prev = series[0] ?? 0;
    const deltaPct = prev !== 0 ? ((totalBalance - prev) / Math.abs(prev)) * 100 : null;
    return { series, deltaPct };
  }, [transactions, totalBalance]);

  // Arus kas bersih 30 hari vs periode 30 hari sebelumnya
  const net30 = React.useMemo(() => cashflow.reduce((a, c) => a + c.income - c.expense, 0), [cashflow]);

  // Mini bar 7 hari terakhir untuk tile bulan berjalan (visual di bawah angka)
  const last7Cashflow = cashflow.slice(-7);
  const last7IncomeBars = last7Cashflow.map((c) => ({ label: c.date.slice(8, 10), value: c.income }));
  const last7ExpenseBars = last7Cashflow.map((c) => ({ label: c.date.slice(8, 10), value: c.expense }));
  const last7NetBars = last7Cashflow.map((c) => ({ label: c.date.slice(8, 10), value: Math.max(0, c.income - c.expense) }));

  const net30Prev = React.useMemo(() => {
    const from = addDays(todayStr(), -59);
    const to = addDays(todayStr(), -30);
    let net = 0;
    for (const t of transactions) {
      if (t.type === "transfer") continue;
      if (t.date >= from && t.date <= to) net += t.type === "income" ? t.amount : -t.amount;
    }
    return net;
  }, [transactions]);

  const net30DeltaPct = net30Prev !== 0 ? ((net30 - net30Prev) / Math.abs(net30Prev)) * 100 : null;

  const composition = React.useMemo(() => {
    const prefix = startOfMonth(todayStr()).slice(0, 7);
    const byCat = new Map<string, number>();
    let total = 0;
    for (const t of transactions) {
      if (t.type !== "expense" || !t.date.startsWith(prefix)) continue;
      byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
      total += t.amount;
    }
    const data = Array.from(byCat.entries())
      .map(([category, value]) => ({ name: catLabel(category), value }))
      .sort((a, b) => b.value - a.value);
    return { data, total };
  }, [transactions]);

  // Irisan donut: 6 kategori teratas, sisanya digabung menjadi "Lainnya"
  const compositionSlices = React.useMemo(() => {
    const slices = composition.data.slice(0, 6).map((c) => ({ label: c.name, value: c.value }));
    const rest = composition.data.slice(6).reduce((a, c) => a + c.value, 0);
    if (rest > 0) slices.push({ label: "Lainnya", value: rest });
    return slices;
  }, [composition]);

  const heat = React.useMemo(() => {
    const today = todayStr();
    const curSun = addDays(today, -dayOfWeek(today));
    const byDate = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== "expense") continue;
      byDate.set(t.date, (byDate.get(t.date) ?? 0) + t.amount);
    }
    const weeks = Array.from({ length: 12 }, (_, i) => {
      const ws = addDays(curSun, -7 * (11 - i));
      return Array.from({ length: 7 }, (_, r) => addDays(ws, r));
    });
    const max = Math.max(0, ...Array.from(byDate.values()));
    return { weeks, byDate, max };
  }, [transactions]);

  const budgetRows = React.useMemo(
    () =>
      budgets
        .map((b) => ({ ...b, pct: b.monthlyLimit > 0 ? (b.spent ?? 0) / b.monthlyLimit : 0 }))
        .sort((a, b) => b.pct - a.pct),
    [budgets]
  );

  const goalRows = React.useMemo(
    () =>
      goals.map((g) => ({
        ...g,
        pct: g.targetAmount > 0 ? Math.min(1, g.currentAmount / g.targetAmount) : 0,
      })),
    [goals]
  );

  const subscriptions = React.useMemo(
    () =>
      transactions
        .filter((t) => (t.recurring === "monthly" || t.recurring === "weekly") && t.type === "expense")
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [transactions]
  );

  // Biaya langganan dinormalisasi ke bulanan (mingguan × 52/12) untuk HBarList
  const subscriptionBars = React.useMemo(
    () =>
      subscriptions
        .map((s) => ({
          label: s.note ?? catLabel(s.category),
          monthly: s.recurring === "weekly" ? (s.amount * 52) / 12 : s.amount,
        }))
        .sort((a, b) => b.monthly - a.monthly)
        .slice(0, 6)
        .map((s) => ({
          label: s.label,
          value: Math.round(s.monthly),
          caption: `${formatRupiah(s.monthly, { compact: true })}/bln`,
        })),
    [subscriptions]
  );

  const subscriptionMonthlyTotal = React.useMemo(
    () => subscriptions.reduce((a, s) => a + (s.recurring === "weekly" ? (s.amount * 52) / 12 : s.amount), 0),
    [subscriptions]
  );

  // Mutasi: filter bulan + tipe + pencarian (debounce), dikelompokkan per hari
  const groups = React.useMemo(() => {
    const prefix = `${viewYear}-${pad2(viewMonthIdx + 1)}`;
    const filtered = transactions.filter((t) => {
      if (!t.date.startsWith(prefix)) return false;
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (search) {
        const hay = `${t.note ?? ""} ${t.category}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
    const map = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const arr = map.get(t.date) ?? [];
      arr.push(t);
      map.set(t.date, arr);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, items]) => ({
        date,
        items,
        expense: items.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0),
      }));
  }, [transactions, viewYear, viewMonthIdx, typeFilter, search]);

  // Temuan otomatis
  const insights = React.useMemo(() => {
    type Insight = { icon: React.ElementType; tone: "sage" | "clay"; text: string };
    const out: Insight[] = [];
    const today = todayStr();
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth();
    const prevDate = new Date(y, m - 1, 1);
    const curPrefix = `${y}-${pad2(m + 1)}`;
    const prevPrefix = `${prevDate.getFullYear()}-${pad2(prevDate.getMonth() + 1)}`;
    const prevLabel = monthName(prevDate.getMonth(), true);

    const curByCat = new Map<string, number>();
    const prevByCat = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== "expense") continue;
      if (t.date.startsWith(curPrefix))
        curByCat.set(t.category, (curByCat.get(t.category) ?? 0) + t.amount);
      else if (t.date.startsWith(prevPrefix))
        prevByCat.set(t.category, (prevByCat.get(t.category) ?? 0) + t.amount);
    }

    const top = Array.from(curByCat.entries()).sort((a, b) => b[1] - a[1])[0];
    if (top) {
      const [cat, amount] = top;
      const prevAmt = prevByCat.get(cat) ?? 0;
      if (prevAmt > 0) {
        const delta = Math.round(((amount - prevAmt) / prevAmt) * 100);
        out.push({
          icon: delta >= 0 ? TrendingUp : TrendingDown,
          tone: delta >= 0 ? "clay" : "sage",
          text: `${catLabel(cat)} jadi pengeluaran terbesar bulan ini (${formatRupiah(amount, { compact: true })}) — ${delta >= 0 ? "naik" : "turun"} ${Math.abs(delta)}% dibanding ${prevLabel}.`,
        });
      } else {
        out.push({
          icon: TrendingUp,
          tone: "clay",
          text: `${catLabel(cat)} jadi pengeluaran terbesar bulan ini (${formatRupiah(amount, { compact: true })}) — ${prevLabel} tidak ada catatan untuk kategori ini.`,
        });
      }
    }

    const over = budgetRows.find((b) => b.pct > 1);
    const near = budgetRows.find((b) => b.pct >= 0.75 && b.pct <= 1);
    if (over) {
      out.push({
        icon: AlertTriangle,
        tone: "clay",
        text: `Anggaran ${catLabel(over.category)} melebihi batas: terpakai ${formatRupiah(over.spent ?? 0, { compact: true })} dari ${formatRupiah(over.monthlyLimit, { compact: true })}.`,
      });
    } else if (near) {
      out.push({
        icon: Wallet,
        tone: "clay",
        text: `Anggaran ${catLabel(near.category)} hampir habis — ${Math.round(near.pct * 100)}% terpakai bulan ini.`,
      });
    }

    const sumExpenses = (fromOffset: number, toOffset: number) => {
      const fromD = addDays(today, fromOffset);
      const toD = addDays(today, toOffset);
      let s = 0;
      for (const t of transactions) {
        if (t.type !== "expense") continue;
        if (t.date >= fromD && t.date <= toD) s += t.amount;
      }
      return s;
    };
    const thisWeek = sumExpenses(-6, 0);
    const lastWeek = sumExpenses(-13, -7);
    if (thisWeek > 0 || lastWeek > 0) {
      const avgT = thisWeek / 7;
      const avgL = lastWeek / 7;
      if (avgL > 0) {
        const delta = Math.round(((avgT - avgL) / avgL) * 100);
        out.push({
          icon: delta >= 0 ? TrendingUp : TrendingDown,
          tone: delta >= 0 ? "clay" : "sage",
          text: `Rata-rata pengeluaran harian ${formatRupiah(avgT, { compact: true })} pekan ini, ${delta >= 0 ? "naik" : "turun"} ${Math.abs(delta)}% dari pekan lalu.`,
        });
      } else {
        out.push({
          icon: TrendingDown,
          tone: "sage",
          text: `Rata-rata pengeluaran harian ${formatRupiah(avgT, { compact: true })} pekan ini; pekan lalu belum ada catatan.`,
        });
      }
    }

    return out.slice(0, 3);
  }, [transactions, budgetRows]);

  // ============ Handlers dialog ============

  const submitWallet = () => {
    if (!wName.trim()) return toast.error("Nama dompet wajib diisi");
    createWallet.mutate({ name: wName.trim(), type: wType, initialBalance: Number(wInit || 0) });
  };

  const submitBudget = () => {
    if (!editBudget) return;
    const val = Number(bLimit);
    if (!Number.isFinite(val) || val <= 0) return toast.error("Limit harus lebih dari 0");
    updateBudget.mutate({ id: editBudget.id, monthlyLimit: val });
  };

  const submitContribution = () => {
    if (!contribGoal) return;
    const val = Number(gAmount);
    if (!Number.isFinite(val) || val <= 0) return toast.error("Nominal harus lebih dari 0");
    contributeGoal.mutate({ id: contribGoal.id, currentAmount: contribGoal.currentAmount + val });
  };

  const submitNewGoal = () => {
    if (!gName.trim()) return toast.error("Nama tujuan wajib diisi");
    const target = Number(gTarget);
    if (!Number.isFinite(target) || target <= 0) return toast.error("Target dana harus lebih dari 0");
    createGoal.mutate({
      name: gName.trim(),
      targetAmount: target,
      deadline: gDeadline || null,
      color: "vault",
      icon: "piggy-bank",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-full">
        <ScreenHeader title="Keuangan" subtitle="Saldo, anggaran & tujuan tabunganmu" tone="vault" />
        <FinanceSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <ScreenHeader title="Keuangan" subtitle="Saldo, anggaran & tujuan tabunganmu" tone="vault" />

      <div className="flex flex-col gap-4 px-4 pt-3 pb-6">
        {/* ============ Hero Total Saldo ============ */}
        <section className="rise-in relative overflow-hidden rounded-xl bg-vault p-5 text-white shadow-soft">
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/95">Total Saldo</p>
              <p className="mt-1 min-w-0 truncate text-2xl font-bold tabular leading-tight sm:text-3xl">
                {formatRupiah(totalBalance)}
              </p>
              <p className="mt-1 text-xs text-white/95">{wallets.length} dompet aktif</p>
            </div>
            <button
              onClick={() => setWalletOpen(true)}
              className="press flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-4 text-xs font-bold text-white"
              aria-label="Tambah dompet"
            >
              <Plus className="h-4 w-4" />
              Dompet
            </button>
          </div>
          {/* Tren saldo bersih 30 hari + perubahan vs periode lalu */}
          <div className="relative mt-3">
            <Sparkline data={balanceTrend.series} height={40} color="var(--primary-foreground)" />
            <div className="mt-1.5 flex items-center gap-2">
              {balanceTrend.deltaPct !== null && (
                <DeltaBadge delta={balanceTrend.deltaPct} suffix="%" className="bg-white/15 text-white" />
              )}
              <span className="text-xs text-white/95">Tren saldo bersih 30 hari</span>
            </div>
          </div>
          {/* Proporsi saldo per dompet */}
          {walletRows.length > 1 && (
            <div className="relative mt-4 rounded-full bg-white/90 p-1">
              <StackBar
                segments={walletRows.map((r) => ({ label: r.name, value: r.balance, color: r.color }))}
                height={10}
              />
            </div>
          )}
          {walletRows.length > 0 && (
            <div className="relative mt-3 flex flex-wrap gap-2">
              {walletRows.map((w) => (
                <span
                  key={w.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white/95"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: w.color }} aria-hidden />
                  {w.name}
                  {walletRows.length > 1 && w.share > 0 && (
                    <span className="font-bold tabular text-white/95">{Math.round(w.share * 100)}%</span>
                  )}
                  <span className="tabular font-bold">{formatRupiah(w.balance, { compact: true })}</span>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* ============ StatTile bulan berjalan + mini bar 7 hari ============ */}
        <div className="grid grid-cols-3 gap-3 rise-in rise-in-1">
          <StatTile
            label="Pemasukan"
            value={formatRupiah(monthTotals.income, { compact: true })}
            sub="Bulan ini"
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            tone="vault"
            valueClassName="text-lg"
            chart={<MiniBars data={last7IncomeBars} height={26} showLabels={false} color={SAGE} highlightIndex={6} />}
          />
          <StatTile
            label="Pengeluaran"
            value={formatRupiah(monthTotals.expense, { compact: true })}
            sub="Bulan ini"
            icon={<TrendingDown className="h-3.5 w-3.5" />}
            tone="vault"
            valueClassName="text-lg"
            chart={<MiniBars data={last7ExpenseBars} height={26} showLabels={false} color={CLAY} highlightIndex={6} />}
          />
          <StatTile
            label="Selisih"
            value={formatRupiah(monthTotals.net, { compact: true })}
            sub="Masuk − Keluar"
            icon={<Scale className="h-3.5 w-3.5" />}
            tone="vault"
            valueClassName="text-lg"
            chart={<MiniBars data={last7NetBars} height={26} showLabels={false} color={SAGE_DEEP} highlightIndex={6} />}
          />
        </div>
        <p className="-mt-2 px-1 text-xs text-muted-foreground rise-in rise-in-1">
          Batang mini: 7 hari terakhir · <span className="text-vault-deep">masuk</span> /{" "}
          <span className="text-clay">keluar</span> /{" "}
          <span className="text-foreground">selisih</span>
        </p>

        {/* ============ Arus kas 30 hari ============ */}
        <SectionCard
          title="Arus Kas 30 Hari"
          icon={<TrendingUp className="h-4 w-4 text-vault-deep" />}
          tone="vault"
          className="rise-in rise-in-2"
        >
          <MiniBars
            data={cashflow.map((c) => ({
              label: String(Number(c.date.slice(8, 10))),
              value: c.income,
              alt: c.expense,
            }))}
            height={92}
            color={SAGE}
            altColor={CLAY}
            showAlt
            labelEvery={6}
            highlightIndex={cashflow.length - 1}
          />
          <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-full" style={{ background: SAGE }} /> Masuk
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-full" style={{ background: CLAY }} /> Keluar
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span>Arus kas bersih 30 hari</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="font-bold tabular text-foreground">{formatRupiah(net30)}</span>
              {net30DeltaPct !== null && <DeltaBadge delta={net30DeltaPct} suffix="%" />}
            </span>
          </div>
        </SectionCard>

        {/* ============ Komposisi pengeluaran ============ */}
        <SectionCard
          title="Komposisi Pengeluaran"
          icon={<PieChartIcon className="h-4 w-4 text-vault-deep" />}
          tone="vault"
          className="rise-in rise-in-3"
        >
          {composition.data.length === 0 ? (
            <EmptyState
              icon={<PieChartIcon className="h-6 w-6" />}
              title="Belum ada pengeluaran bulan ini"
              description="Catat transaksi keluar untuk melihat komposisi per kategori."
            />
          ) : (
            <>
              <div className="flex justify-center">
                <Donut
                  slices={compositionSlices.map((s, i) => ({
                    ...s,
                    color: rampColor(i, compositionSlices.length),
                  }))}
                  size={132}
                  thickness={16}
                  center={
                    <>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Total keluar
                      </span>
                      <span className="text-sm font-bold tabular leading-tight">
                        {formatRupiah(composition.total, { compact: true })}
                      </span>
                    </>
                  }
                />
              </div>
              <div className="mt-3 space-y-1.5">
                {compositionSlices.map((s, i) => {
                  const pct = composition.total > 0 ? (s.value / composition.total) * 100 : 0;
                  return (
                    <div key={s.label} className="flex items-center gap-2 text-xs">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: rampColor(i, compositionSlices.length) }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate font-semibold">{s.label}</span>
                      <span className="tabular text-muted-foreground">{formatRupiah(s.value, { compact: true })}</span>
                      <span className="w-10 text-right tabular font-bold text-vault-deep">{Math.round(pct)}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </SectionCard>

        {/* ============ Peta panas pengeluaran 12 pekan ============ */}
        <SectionCard
          title="Peta Panas Pengeluaran"
          icon={<CalendarDays className="h-4 w-4 text-vault-deep" />}
          tone="vault"
          className="rise-in rise-in-4"
        >
          <div className="grid gap-1" style={{ gridTemplateColumns: "auto repeat(12, minmax(0, 1fr))" }}>
            {DAY_SHORT.map((label, row) => (
              <React.Fragment key={label}>
                <div className="flex items-center pr-1 text-xs font-semibold text-muted-foreground">{label}</div>
                {heat.weeks.map((week, wi) => {
                  const date = week[row];
                  const amount = heat.byDate.get(date) ?? 0;
                  const ratio = heat.max > 0 && amount > 0 ? amount / heat.max : 0;
                  const level = amount === 0 ? 0 : ratio < 0.25 ? 1 : ratio < 0.5 ? 2 : ratio < 0.75 ? 3 : 4;
                  const opacity = [0, 0.25, 0.45, 0.7, 1][level];
                  return (
                    <div
                      key={wi}
                      title={`${dayName(date, true)}, ${formatDayMonth(date)} — ${amount > 0 ? formatRupiah(amount) : "tidak ada pengeluaran"}`}
                      className={cn("h-3.5 w-full rounded-[4px]", level === 0 && "bg-secondary")}
                      style={level > 0 ? { backgroundColor: "var(--primary)", opacity } : undefined}
                      role="img"
                      aria-label={
                        amount > 0
                          ? `${formatDayMonth(date)}, ${formatRupiah(amount)}`
                          : `${formatDayMonth(date)}, tidak ada pengeluaran`
                      }
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
            <span>12 pekan terakhir</span>
            <span className="inline-flex items-center gap-1">
              Sedikit
              {[0, 0.25, 0.45, 0.7, 1].map((op, i) => (
                <span
                  key={i}
                  className="h-2.5 w-2.5 rounded-[3px] bg-secondary"
                  style={i > 0 ? { backgroundColor: "var(--primary)", opacity: op } : undefined}
                />
              ))}
              Banyak
            </span>
          </div>
        </SectionCard>

        {/* ============ Anggaran bulanan ============ */}
        <SectionCard
          title="Anggaran Bulanan"
          icon={<Wallet className="h-4 w-4 text-vault-deep" />}
          tone="vault"
          className="rise-in"
        >
          {budgetRows.length === 0 ? (
            <EmptyState
              icon={<Wallet className="h-6 w-6" />}
              title="Belum ada anggaran"
              description="Buat anggaran per kategori untuk menjaga pengeluaran."
            />
          ) : (
            <div className="max-h-[420px] space-y-4 overflow-y-auto overscroll-contain scroll-thin">
              {budgetRows.map((b) => {
                const Icon = CATEGORY_ICON[b.category] ?? CircleDollarSign;
                const sisa = b.monthlyLimit - (b.spent ?? 0);
                return (
                  <div key={b.id} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-vault-soft text-vault-deep">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-bold">{catLabel(b.category)}</span>
                      {b.pct > 1 && <Pill tone="clay">Melebihi batas</Pill>}
                      {b.pct >= 0.75 && b.pct <= 1 && <Pill tone="gold">Hampir habis</Pill>}
                      <button
                        onClick={() => {
                          setEditBudget(b);
                          setBLimit(String(Math.round(b.monthlyLimit)));
                        }}
                        className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
                        aria-label={`Ubah limit anggaran ${b.category}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-clay-soft hover:text-clay"
                            aria-label={`Hapus anggaran ${b.category}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus anggaran ini?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Anggaran {catLabel(b.category)} dengan limit {formatRupiah(b.monthlyLimit)} akan dihapus
                              permanen.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="min-h-[44px] rounded-xl">Batal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteBudget.mutate(b.id)}
                              className="min-h-[44px] rounded-xl bg-destructive text-white hover:bg-destructive/90"
                            >
                              Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="pl-9">
                      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs tabular text-muted-foreground">
                        <span>
                          {formatRupiah(b.spent ?? 0)} <span className="opacity-60">/ {formatRupiah(b.monthlyLimit)}</span>
                        </span>
                        <span className={cn("font-bold", sisa < 0 ? "text-clay" : "text-primary")}>
                          Sisa {formatRupiah(sisa, { compact: true })}
                        </span>
                      </div>
                      <MetricBar value={b.spent ?? 0} max={b.monthlyLimit} height={8} color={SAGE} overColor={CLAY} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* ============ Tujuan tabungan ============ */}
        <SectionCard
          title="Tujuan Tabungan"
          icon={<PiggyBank className="h-4 w-4 text-vault-deep" />}
          tone="vault"
          action={
            <button
              onClick={() => setNewGoalOpen(true)}
              className="press flex min-h-[44px] items-center gap-1 rounded-xl bg-vault-soft px-3 text-xs font-bold text-vault-deep"
            >
              <Plus className="h-3.5 w-3.5" />
              Tujuan Baru
            </button>
          }
          className="rise-in"
        >
          {goalRows.length === 0 ? (
            <EmptyState
              icon={<PiggyBank className="h-6 w-6" />}
              title="Belum ada tujuan tabungan"
              description="Buat tujuan seperti dana darurat atau liburan untuk mulai menabung."
              action={
                <Button
                  onClick={() => setNewGoalOpen(true)}
                  className="min-h-[44px] rounded-xl bg-vault text-white hover:bg-vault-deep"
                >
                  Tujuan Baru
                </Button>
              }
            />
          ) : (
            <div className="max-h-[480px] space-y-3 overflow-y-auto overscroll-contain scroll-thin">
              {goalRows.map((g) => {
                const Icon = GOAL_ICON[g.icon] ?? CircleDollarSign;
                const colorVar = GOAL_COLOR_VAR[g.color] ?? "var(--vault)";
                return (
                  <div
                    key={g.id}
                    className="flex items-center gap-3 rounded-xl border border-border/70 bg-secondary/40 p-3"
                  >
                    <RingStat
                      progress={g.pct}
                      size={60}
                      stroke={7}
                      color={colorVar}
                      value={
                        <span className="text-xs font-bold tabular text-vault-deep">{Math.round(g.pct * 100)}%</span>
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-vault-deep" />
                        <span className="truncate text-sm font-bold">{g.name}</span>
                      </div>
                      <div className="mt-0.5 text-xs tabular text-muted-foreground">
                        {formatRupiah(g.currentAmount)} <span className="opacity-60">/ {formatRupiah(g.targetAmount)}</span>
                      </div>
                      {g.deadline && (
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarDays className="h-3 w-3" />
                          Target {formatDayMonth(g.deadline)}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setContribGoal(g);
                        setGAmount("");
                      }}
                      className="press flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl bg-vault-soft px-3 text-xs font-bold text-vault-deep"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Tambah Dana
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* ============ Langganan ============ */}
        <SectionCard
          title="Langganan"
          icon={<Repeat className="h-4 w-4 text-vault-deep" />}
          tone="vault"
          className="rise-in"
        >
          {subscriptions.length === 0 ? (
            <EmptyState
              icon={<Repeat className="h-6 w-6" />}
              title="Belum ada langganan"
              description="Transaksi berulang mingguan atau bulanan akan tampil di sini."
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-muted-foreground">Total biaya bulanan</span>
                <span className="font-bold tabular text-clay">{formatRupiah(subscriptionMonthlyTotal)}</span>
              </div>
              <HBarList items={subscriptionBars} color={CLAY} height={8} />
              <div className="max-h-[280px] space-y-2 overflow-y-auto overscroll-contain scroll-thin">
                {subscriptions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-xl border border-border/70 bg-secondary/40 px-3 py-2.5"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-vault-soft text-vault-deep">
                      <Repeat className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">{s.note ?? catLabel(s.category)}</div>
                      <div className="text-xs tabular text-muted-foreground">{formatDayMonth(s.date)}</div>
                    </div>
                    <Pill tone={s.recurring === "monthly" ? "vault" : "gold"}>
                      {s.recurring === "monthly" ? "Bulanan" : "Mingguan"}
                    </Pill>
                    <span className="shrink-0 text-sm font-bold tabular text-clay">
                      −{formatRupiah(s.amount, { compact: true })}
                    </span>
                    <span className="sr-only">pengeluaran berulang</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        {/* ============ Mutasi transaksi ============ */}
        <SectionCard
          title="Mutasi Transaksi"
          icon={<List className="h-4 w-4 text-vault-deep" />}
          tone="vault"
          className="rise-in"
        >
          {/* Navigasi bulan */}
          <div className="mb-3 flex items-center gap-2">
            <button
              onClick={() => shiftMonth(-1)}
              className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1 text-center text-sm font-bold">
              {monthName(viewMonthIdx)} {viewYear}
            </div>
            <button
              onClick={() => shiftMonth(1)}
              className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary"
              aria-label="Bulan berikutnya"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Filter tipe */}
          <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
            {(
              [
                { key: "all", label: "Semua" },
                { key: "income", label: "Masuk" },
                { key: "expense", label: "Keluar" },
                { key: "transfer", label: "Transfer" },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                onClick={() => setTypeFilter(f.key)}
                className={cn(
                  "press min-h-[44px] shrink-0 rounded-full px-4 text-xs font-bold",
                  typeFilter === f.key ? "bg-vault text-white" : "bg-secondary text-muted-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Pencarian */}
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari catatan atau kategori..."
              className="min-h-[44px] rounded-xl pl-10"
              aria-label="Cari transaksi"
            />
          </div>

          {/* Daftar per hari */}
          {groups.length === 0 ? (
            <EmptyState
              icon={<List className="h-6 w-6" />}
              title="Tidak ada transaksi"
              description="Coba ubah bulan, filter, atau kata kunci pencarian."
            />
          ) : (
            <div className="max-h-[520px] overflow-y-auto overscroll-contain scroll-thin rounded-xl">
              {groups.map((g) => (
                <div key={g.date}>
                  <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-card/95 px-1 py-2 backdrop-blur-sm">
                    <span className="text-xs font-bold">
                      {dayName(g.date)}, {formatDayMonth(g.date)}
                    </span>
                    {g.expense > 0 && (
                      <span className="text-xs font-bold tabular text-clay">
                        −{formatRupiah(g.expense, { compact: true })}
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-border/50">
                    {g.items.map((t) => {
                      const Icon = CATEGORY_ICON[t.category] ?? CircleDollarSign;
                      const isIncome = t.type === "income";
                      const isTransfer = t.type === "transfer";
                      const catTone = CATEGORY_TONE[t.category] ?? "stone";
                      return (
                        <div key={t.id} className="flex items-center gap-3 py-2.5">
                          <span
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                              isIncome
                                ? "bg-garden-soft text-garden-deep"
                                : isTransfer
                                  ? "bg-vault-soft text-vault-deep"
                                  : "bg-secondary text-foreground"
                            )}
                          >
                            {isTransfer ? <ArrowLeftRight className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-semibold">{t.note ?? catLabel(t.category)}</span>
                              {t.recurring !== "none" && <Repeat className="h-3 w-3 shrink-0 text-muted-foreground" />}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                              {!isTransfer && (
                                <Pill tone={catTone} className="px-1.5 py-0.5">
                                  {catLabel(t.category)}
                                </Pill>
                              )}
                              <span className="min-w-0 truncate">
                                {isTransfer
                                  ? `${t.wallet?.name ?? "?"} → ${t.toWallet?.name ?? "?"}`
                                  : t.wallet?.name}
                              </span>
                            </div>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 whitespace-nowrap text-sm font-bold tabular",
                              isIncome ? "text-garden" : isTransfer ? "text-vault" : "text-clay"
                            )}
                          >
                            {isIncome ? "+" : isTransfer ? "" : "−"}
                            {formatRupiah(t.amount, { compact: true })}
                          </span>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-clay-soft hover:text-clay"
                                aria-label={`Hapus transaksi ${t.note ?? t.category}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus transaksi ini?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Transaksi &quot;{t.note ?? catLabel(t.category)}&quot; ({formatRupiah(t.amount)}) akan
                                  dihapus permanen dan saldo dompet akan disesuaikan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="min-h-[44px] rounded-xl">Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteTx.mutate(t.id)}
                                  className="min-h-[44px] rounded-xl bg-destructive text-white hover:bg-destructive/90"
                                >
                                  Hapus
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ============ Temuan ============ */}
        <SectionCard
          title="Temuan"
          icon={<Lightbulb className="h-4 w-4 text-gold" />}
          tone="gold"
          className="rise-in"
        >
          {insights.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Belum ada temuan — catat transaksi untuk melihat analisis otomatis.
            </p>
          ) : (
            <div className="space-y-2.5">
              {insights.map((ins, i) => {
                const Icon = ins.icon;
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-start gap-2.5 rounded-xl p-3",
                      ins.tone === "sage" ? "bg-sage-soft" : "bg-clay-soft"
                    )}
                  >
                    <Icon
                      className={cn("mt-0.5 h-4 w-4 shrink-0", ins.tone === "sage" ? "text-sage-deep" : "text-clay")}
                    />
                    <p className="text-sm leading-relaxed text-foreground/90">{ins.text}</p>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ============ Dialog: Dompet Baru ============ */}
      <Dialog open={walletOpen} onOpenChange={setWalletOpen}>
        <DialogContent className="max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Dompet Baru</DialogTitle>
            <DialogDescription>Tambahkan sumber dana untuk mencatat transaksi.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="wallet-name">Nama dompet</Label>
              <Input
                id="wallet-name"
                value={wName}
                onChange={(e) => setWName(e.target.value)}
                placeholder="cth. Mandiri, OVO, Dompet Kantor"
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wallet-type">Tipe</Label>
              <Select value={wType} onValueChange={setWType}>
                <SelectTrigger id="wallet-type" className="w-full min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Tunai</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="ewallet">E-Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <NumberField
              id="wallet-init"
              label="Saldo awal"
              value={wInit}
              onChange={setWInit}
              placeholder="0"
              prefix
            />
          </div>
          <DialogActions
            onCancel={() => setWalletOpen(false)}
            onConfirm={submitWallet}
            confirmLabel="Tambah"
            pending={createWallet.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* ============ Dialog: Edit Limit Anggaran ============ */}
      <Dialog open={!!editBudget} onOpenChange={(o) => !o && setEditBudget(null)}>
        <DialogContent className="max-w-[340px]">
          <DialogHeader>
            <DialogTitle>Limit {editBudget ? catLabel(editBudget.category) : ""}</DialogTitle>
            <DialogDescription>Atur batas pengeluaran bulanan untuk kategori ini.</DialogDescription>
          </DialogHeader>
          <NumberField id="budget-limit" label="Limit bulanan" value={bLimit} onChange={setBLimit} prefix placeholder="0" />
          <DialogActions
            onCancel={() => setEditBudget(null)}
            onConfirm={submitBudget}
            confirmLabel="Simpan"
            pending={updateBudget.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* ============ Dialog: Tambah Dana Tujuan ============ */}
      <Dialog open={!!contribGoal} onOpenChange={(o) => !o && setContribGoal(null)}>
        <DialogContent className="max-w-[340px]">
          <DialogHeader>
            <DialogTitle>Tambah Dana</DialogTitle>
            <DialogDescription>
              {contribGoal
                ? `${contribGoal.name} — saat ini ${formatRupiah(contribGoal.currentAmount)} dari ${formatRupiah(contribGoal.targetAmount)}.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <NumberField id="goal-amount" label="Nominal dana" value={gAmount} onChange={setGAmount} prefix placeholder="0" />
          <DialogActions
            onCancel={() => setContribGoal(null)}
            onConfirm={submitContribution}
            confirmLabel="Tambah"
            pending={contributeGoal.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* ============ Dialog: Tujuan Baru ============ */}
      <Dialog open={newGoalOpen} onOpenChange={setNewGoalOpen}>
        <DialogContent className="max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Tujuan Baru</DialogTitle>
            <DialogDescription>Rencanakan tabungan dengan target yang jelas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="goal-name">Nama tujuan</Label>
              <Input
                id="goal-name"
                value={gName}
                onChange={(e) => setGName(e.target.value)}
                placeholder="cth. DP Rumah, Kamera"
                className="min-h-[44px]"
              />
            </div>
            <NumberField id="goal-target" label="Target dana" value={gTarget} onChange={setGTarget} prefix placeholder="0" />
            <div className="space-y-1.5">
              <Label htmlFor="goal-deadline">Deadline (opsional)</Label>
              <Input
                id="goal-deadline"
                type="date"
                value={gDeadline}
                onChange={(e) => setGDeadline(e.target.value)}
                className="min-h-[44px] tabular"
              />
            </div>
          </div>
          <DialogActions
            onCancel={() => setNewGoalOpen(false)}
            onConfirm={submitNewGoal}
            confirmLabel="Buat"
            pending={createGoal.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
