"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Moon,
  Languages,
  Target,
  HeartPulse,
  Download,
  FileUp,
  ShieldAlert,
  HelpCircle,
  Pencil,
  Loader2,
  Smartphone,
  Sparkles,
  Minus,
  Plus,
  Info,
  WifiOff,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { useRutinaStore } from "@/store/rutina";
import { rutinaApi } from "@/lib/rutina/api";
import { ScreenHeader, SectionCard, Pill } from "@/components/rutina/primitives";
import { MetricBar } from "@/components/rutina/charts";
import { formatNumber } from "@/lib/rutina/format";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ProfileScreen() {
  const setPage = useRutinaStore((s) => s.setPage);
  const openQuickAction = useRutinaStore((s) => s.setQuickAction);
  const qc = useQueryClient();

  const {
    data: profileData,
    isError: profileError,
    refetch: refetchProfile,
  } = useQuery({ queryKey: ["profile"], queryFn: rutinaApi.profile });
  const {
    data: statsData,
    isError: statsError,
    refetch: refetchStats,
  } = useQuery({ queryKey: ["stats"], queryFn: rutinaApi.stats });

  const profile = profileData?.profile ?? null;
  const level = statsData?.level ?? null;
  const xp = statsData?.xp ?? null;
  const levelProgress = statsData?.levelProgress ?? 0;
  const xpToNext = statsData?.xpToNextLevel ?? null;

  // ===== Dialog edit identitas =====
  const [editOpen, setEditOpen] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editVoice, setEditVoice] = React.useState("");
  const [confirmDiscard, setConfirmDiscard] = React.useState(false);

  React.useEffect(() => {
    if (editOpen && profile) {
      setEditName(profile.name);
      setEditVoice(profile.identityVoice);
      setConfirmDiscard(false);
    }
  }, [editOpen, profile]);

  // Ada perubahan nama/suara yang belum disimpan? Bandingkan dengan profil terakhir.
  const editDirty = !!profile && (editName !== profile.name || editVoice !== profile.identityVoice);

  const updateMutation = useMutation({
    mutationFn: (body: { name?: string; identityVoice?: string; dailyMissionTarget?: number }) =>
      rutinaApi.updateProfile(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveEdit = () => {
    if (!editName.trim()) {
      toast.error("Nama tidak boleh kosong");
      return;
    }
    updateMutation.mutate(
      { name: editName.trim(), identityVoice: editVoice.trim() },
      {
        onSuccess: () => {
          toast.success("Profil diperbarui");
          setEditOpen(false);
        },
      }
    );
  };

  const changeTarget = (delta: number) => {
    const current = profile?.dailyMissionTarget ?? 4;
    const next = Math.min(8, Math.max(1, current + delta));
    if (next === current) return;
    updateMutation.mutate(
      { dailyMissionTarget: next },
      { onSuccess: () => toast.success(`Target misi harian: ${next}`) }
    );
  };

  // ===== Ekspor / impor data =====
  const [busyExport, setBusyExport] = React.useState<"json" | "csv" | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = React.useState<File | null>(null);
  // audit B1-A2: frasa konfirmasi pulihkan + status berkas punya tanda cadangan Rutina
  const [importConfirmText, setImportConfirmText] = React.useState("");
  const [importBackupValid, setImportBackupValid] = React.useState(true);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [resetStep, setResetStep] = React.useState<1 | 2>(1);
  // audit B1-A1: frasa konfirmasi hapus seluruh data
  const [resetConfirmText, setResetConfirmText] = React.useState("");
  const [faqOpen, setFaqOpen] = React.useState(false);

  const downloadExport = async (format: "json" | "csv") => {
    setBusyExport(format);
    try {
      const res = await fetch(`/api/export?format=${format}`);
      if (!res.ok) throw new Error("Gagal membuat berkas ekspor");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = format === "json" ? "rutina-backup.json" : "rutina-transactions.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(
        format === "json" ? "Cadangan JSON berhasil diunduh" : "Transaksi CSV berhasil diunduh"
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengekspor data");
    } finally {
      setBusyExport(null);
    }
  };

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(text) as Record<string, unknown>;
      } catch {
        throw new Error("Berkas bukan JSON yang valid");
      }
      // audit B1-A2: server menuntut body.confirm === "PULIHKAN DATA" (kunci asing diabaikan)
      const payload = { ...parsed, confirm: importConfirmText };
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { error?: string }).error || "Gagal memulihkan data");
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Data berhasil dipulihkan dari cadangan");
      setImportConfirmText("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Konfirmasi dulu sebelum benar-benar menimpa data dengan berkas pilihan
  const confirmImport = () => {
    // audit B1-A2: hanya lanjut bila frasa konfirmasi persis sama
    if (!pendingImport || importMutation.isPending || importConfirmText !== "PULIHKAN DATA") return;
    importMutation.mutate(pendingImport, {
      onSettled: () => setPendingImport(null),
    });
  };

  const resetMutation = useMutation({
    mutationFn: async () => {
      // audit B1-A1: server menuntut body.confirm === "RESET RUTINA"
      const res = await fetch("/api/danger/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: resetConfirmText }),
      });
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(b?.error ?? "Gagal menghapus data");
      return b;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Semua data berhasil dihapus");
      setResetOpen(false);
      setResetStep(1);
      setResetConfirmText("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ===== Mode gelap =====
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const darkActive = mounted && theme === "dark";

  return (
    <div className="flex flex-col min-h-full">
      <ScreenHeader
        title="Profil"
        subtitle="Pengaturan & data pribadimu"
        onBack={() => setPage("home")}
      />

      <div className="p-4 space-y-4">
        {/* ===== Banner gagal muat (ikuti pola layar Beranda) ===== */}
        {(profileError || statsError) && (
          <div className="flex items-center gap-3 rounded-xl border border-clay/40 bg-clay-soft p-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-clay" />
            <p className="min-w-0 flex-1 text-xs font-semibold leading-snug text-clay-deep">
              Gagal memuat data profil — periksa koneksi internetmu.
            </p>
            <button
              onClick={() => {
                if (profileError) refetchProfile();
                if (statsError) refetchStats();
              }}
              className="press min-h-[44px] shrink-0 rounded-lg bg-clay px-3 text-xs font-bold text-white"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* ===== Kartu identitas ===== */}
        <SectionCard>
          {profile ? (
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-xl bg-garden text-white flex items-center justify-center text-2xl font-bold shrink-0 shadow-soft">
                {profile.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-base font-bold truncate">{profile.name}</p>
                  {level != null && <Pill tone="garden">Lv{level}</Pill>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Penghuni Rutina 3.0</p>
                <div className="mt-3 rounded-xl bg-sage-soft border border-sage/20 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-sage-deep mb-1">Suara Identitas</p>
                  <p className="font-script text-lg leading-snug text-foreground">
                    &ldquo;{profile.identityVoice}&rdquo;
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditOpen(true)}
                aria-label="Edit profil"
                className="press h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground shrink-0"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          ) : profileError ? (
            <div className="flex items-center gap-3 py-6">
              <WifiOff className="h-5 w-5 shrink-0 text-clay" />
              <p className="min-w-0 flex-1 text-xs text-muted-foreground">Gagal memuat profil.</p>
              <button
                onClick={() => refetchProfile()}
                className="press min-h-[44px] rounded-xl bg-garden-deep px-4 text-sm font-bold text-white"
              >
                Coba Lagi
              </button>
            </div>
          ) : (
            // motion.csv #15: skeleton-shimmer menggantikan pulse lama
            <div className="h-32 rounded-xl bg-secondary skeleton-shimmer" />
          )}
        </SectionCard>

        {/* ===== Level & XP ===== */}
        <SectionCard title="Level & XP" tone="garden" icon={<SettingsIcon icon={Sparkles} />}>
          {level != null ? (
            <div className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <p className="flex items-baseline gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Level</span>
                  <span className="text-2xl font-extrabold tabular leading-none text-garden-deep">{level}</span>
                </p>
                <span className="text-xs text-muted-foreground tabular">{formatNumber(xp ?? 0)} XP total</span>
              </div>
              <MetricBar value={levelProgress} max={1} height={10} />
              <p className="text-xs text-muted-foreground">
                {formatNumber(Math.max(0, xpToNext ?? 0))} XP lagi menuju Level {level + 1}
              </p>
            </div>
          ) : statsError ? (
            <div className="flex items-center gap-3 py-4">
              <WifiOff className="h-5 w-5 shrink-0 text-clay" />
              <p className="min-w-0 flex-1 text-xs text-muted-foreground">Gagal memuat level & XP.</p>
              <button
                onClick={() => refetchStats()}
                className="press min-h-[44px] rounded-xl bg-garden-deep px-4 text-sm font-bold text-white"
              >
                Coba Lagi
              </button>
            </div>
          ) : (
            // motion.csv #15: skeleton-shimmer menggantikan pulse lama
            <div className="h-16 rounded-xl bg-secondary skeleton-shimmer" />
          )}
        </SectionCard>

        {/* ===== Preferensi ===== */}
        <SectionCard title="Preferensi" icon={<SettingsIcon icon={Moon} />}>
          <div className="divide-y divide-border/60">
            <Row icon={Moon} label="Mode gelap" desc="Sesuaikan tema dengan kenyamanan mata">
              <Switch
                checked={darkActive}
                onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
                aria-label="Aktifkan mode gelap"
              />
            </Row>
            <Row icon={Languages} label="Bahasa" desc="Bahasa antarmuka aplikasi">
              <span className="text-sm font-semibold text-muted-foreground">Indonesia</span>
            </Row>
            <div className="py-3">
              <div className="flex items-center gap-3">
                <span className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
                  <Target className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold leading-tight">Target misi harian</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">Jumlah misi ideal per hari</p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => changeTarget(-1)}
                    disabled={updateMutation.isPending || (profile?.dailyMissionTarget ?? 4) <= 1}
                    aria-label="Kurangi target misi"
                    className="press h-11 w-11 rounded-full bg-secondary flex items-center justify-center disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-base font-bold tabular w-6 text-center">{profile?.dailyMissionTarget ?? "-"}</span>
                  <button
                    onClick={() => changeTarget(1)}
                    disabled={updateMutation.isPending || (profile?.dailyMissionTarget ?? 4) >= 8}
                    aria-label="Tambah target misi"
                    className="press h-11 w-11 rounded-full bg-garden text-white flex items-center justify-center disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {profile && (
                <div
                  className="mt-2.5 pl-12 flex items-center gap-1.5"
                  role="img"
                  aria-label={`Visual target misi harian: ${profile.dailyMissionTarget} dari maksimum 8`}
                >
                  {Array.from({ length: 8 }).map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-2 flex-1 max-w-[22px] rounded-full transition-colors",
                        i < profile.dailyMissionTarget ? "bg-sage" : "bg-secondary"
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* ===== Check-in ===== */}
        <SectionCard title="Check-in" icon={<SettingsIcon icon={HeartPulse} />}>
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-sage-soft text-sage-deep flex items-center justify-center shrink-0">
              <HeartPulse className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Isi Check-in Harian</p>
              <p className="text-xs text-muted-foreground">Mood, energi, tidur — 30 detik selesai.</p>
            </div>
            <button
              onClick={() => openQuickAction("checkin")}
              className="press rounded-xl bg-sage text-white text-xs font-bold px-4 min-h-[44px] shrink-0"
            >
              Isi
            </button>
          </div>
        </SectionCard>

        {/* ===== Data & penyimpanan ===== */}
        <SectionCard title="Data & Penyimpanan" icon={<SettingsIcon icon={Download} />}>
          <div className="space-y-2">
            <ActionRow
              icon={Download}
              label="Ekspor Cadangan JSON"
              desc="Seluruh data Rutina dalam satu berkas"
              busy={busyExport === "json"}
              onClick={() => downloadExport("json")}
            />
            <ActionRow
              icon={Download}
              label="Ekspor Transaksi CSV"
              desc="Riwayat arus kas untuk spreadsheet"
              busy={busyExport === "csv"}
              onClick={() => downloadExport("csv")}
            />
            <ActionRow
              icon={FileUp}
              label="Pulihkan dari JSON"
              desc="Ganti data saat ini dengan isi cadangan"
              busy={importMutation.isPending}
              onClick={() => fileRef.current?.click()}
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Pilih berkas cadangan JSON"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setPendingImport(f);
              // audit B1-A2: mulai bersih setiap berkas baru dipilih
              setImportConfirmText("");
              setImportBackupValid(true);
              // audit B1-A2: cek tanda cadangan Rutina (exportedAt) untuk peringatan inline
              void f
                .text()
                .then((t) => {
                  const parsed = JSON.parse(t) as { exportedAt?: unknown } | null;
                  setImportBackupValid(typeof parsed?.exportedAt === "string");
                })
                .catch(() => setImportBackupValid(false));
            }}
          />
        </SectionCard>

        {/* ===== PWA & bantuan ===== */}
        <SectionCard title="PWA & Bantuan" icon={<SettingsIcon icon={Smartphone} />}>
          <div className="divide-y divide-border/60">
            <Row icon={Smartphone} label="Pasang sebagai aplikasi" desc="Buka menu browser lalu pilih Tambahkan ke Layar Utama agar Rutina terasa seperti aplikasi native">
              <Info className="h-4 w-4 text-muted-foreground" />
            </Row>
            <Row icon={HelpCircle} label="Pertanyaan umum" desc="Streak, hari jeda, dan cara cadangan">
              <button
                onClick={() => setFaqOpen(true)}
                className="press rounded-full bg-secondary text-xs font-bold px-4 min-h-[44px] text-muted-foreground"
              >
                Buka
              </button>
            </Row>
          </div>
        </SectionCard>

        {/* ===== Zona kritis ===== */}
        <section className="rounded-xl border border-clay/40 bg-clay-soft p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="h-4 w-4 text-clay" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-clay-deep">Zona Kritis</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Tindakan di area ini menghapus data secara permanen dan tidak dapat dibatalkan.
          </p>
          <button
            onClick={() => {
              setResetStep(1);
              setResetConfirmText(""); // audit B1-A1: mulai kosong setiap kali dialog dibuka
              setResetOpen(true);
            }}
            className="press w-full min-h-[48px] rounded-xl border border-clay/50 text-clay-deep font-bold text-sm"
          >
            Hapus Seluruh Data
          </button>
        </section>

        <p className="text-center text-xs text-muted-foreground pb-2">Rutina 3.0 — dibuat dengan disiplin hangat</p>
      </div>

      {/* ===== Drawer edit identitas (bottom sheet — aman dari keyboard iOS) ===== */}
      <Drawer
        open={editOpen}
        onOpenChange={(o) => {
          if (!o) {
            // Jangan buang edit yang belum disimpan begitu saja — konfirmasi dulu.
            if (editDirty && !updateMutation.isPending) {
              setConfirmDiscard(true);
              return;
            }
            setEditOpen(false);
          }
        }}
      >
        <DrawerContent className="flex flex-col h-auto max-h-[85dvh] rounded-t-2xl">
          <DrawerHeader className="px-4 text-left">
            <DrawerTitle>Edit Profil</DrawerTitle>
            <DrawerDescription>Perbarui nama dan suara identitasmu.</DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-1 min-h-0 flex-col">
            <div className="flex-1 min-h-0 space-y-4 overflow-y-auto scroll-thin px-4 pb-4">
              <div className="space-y-1.5">
                <label htmlFor="edit-name" className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Nama
                </label>
                <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={60} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="edit-voice" className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Suara identitas
                </label>
                <Textarea
                  id="edit-voice"
                  value={editVoice}
                  onChange={(e) => setEditVoice(e.target.value)}
                  placeholder="Aku adalah orang yang ..."
                  className="min-h-24 resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Kalimat ini tampil sebagai pengingat siapa dirimu — baca setiap pagi.
                </p>
              </div>
            </div>
            <div className="border-t border-border/60 bg-background p-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
              <button
                onClick={saveEdit}
                disabled={updateMutation.isPending}
                className="press w-full min-h-[48px] rounded-xl bg-garden text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan Perubahan
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ===== AlertDialog buang perubahan profil ===== */}
      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Buang perubahan?</AlertDialogTitle>
            <AlertDialogDescription>Perubahan yang belum disimpan akan hilang.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setConfirmDiscard(false)} className="press min-h-[44px] flex-1 sm:flex-none">
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmDiscard(false);
                setEditOpen(false);
              }}
              className="press min-h-[44px] flex-1 sm:flex-none"
            >
              Buang
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== Dialog FAQ ===== */}
      <Dialog open={faqOpen} onOpenChange={setFaqOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto scroll-thin">
          <DialogHeader>
            <DialogTitle>Pertanyaan Umum</DialogTitle>
            <DialogDescription>Hal-hal yang sering ditanyakan tentang Rutina.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {FAQ_ITEMS.map((f) => (
              <div key={f.q} className="rounded-xl bg-secondary/60 p-4">
                <p className="text-sm font-bold">{f.q}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{f.a}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== AlertDialog hapus seluruh data (dua langkah) ===== */}
      <AlertDialog
        open={resetOpen}
        onOpenChange={(o) => {
          if (!o) {
            setResetOpen(false);
            setResetStep(1);
          }
        }}
      >
        <AlertDialogContent>
          {resetStep === 1 ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus seluruh data?</AlertDialogTitle>
                <AlertDialogDescription>
                  Seluruh kebiasaan, log, latihan, transaksi, jurnal, check-in, dan tabungan akan dihapus permanen. Kutipan
                  harian dan profil tetap dipertahankan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <Button variant="outline" onClick={() => setResetOpen(false)} className="press min-h-[44px] flex-1 sm:flex-none">
                  Batal
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setResetStep(2)}
                  className="press min-h-[44px] flex-1 sm:flex-none flex items-center gap-1.5"
                >
                  Lanjutkan
                </Button>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Konfirmasi terakhir</AlertDialogTitle>
                <AlertDialogDescription>
                  Tindakan ini tidak dapat dibatalkan. Semua catatanmu akan hilang dan statistik kembali ke nol.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {/* audit B1-A1: konfirmasi ketik manual sebelum hapus permanen */}
              <div className="space-y-1.5">
                <label htmlFor="reset-confirm" className="text-xs font-semibold text-muted-foreground">
                  Ketik RESET RUTINA untuk konfirmasi
                </label>
                <Input
                  id="reset-confirm"
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder="RESET RUTINA"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="min-h-[44px]"
                />
              </div>
              <AlertDialogFooter>
                <Button variant="outline" onClick={() => setResetOpen(false)} className="press min-h-[44px] flex-1 sm:flex-none">
                  Batal
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => resetMutation.mutate()}
                  disabled={resetMutation.isPending || resetConfirmText !== "RESET RUTINA"}
                  className="press min-h-[44px] flex-1 sm:flex-none flex items-center gap-1.5"
                >
                  {resetMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Ya, hapus semua
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== AlertDialog konfirmasi pulihkan data ===== */}
      <AlertDialog
        open={pendingImport !== null}
        onOpenChange={(o) => {
          if (!o && !importMutation.isPending) setPendingImport(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pulihkan Data?</AlertDialogTitle>
            <AlertDialogDescription>
              Berkas &ldquo;{pendingImport?.name ?? "cadangan"}&rdquo; akan menimpa SELURUH data saat ini — kebiasaan, log,
              latihan, transaksi, jurnal, check-in, dan tabungan diganti dengan isi cadangan. Tindakan ini tidak dapat
              dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* audit B1-A2: peringatan bila berkas tak punya tanda cadangan Rutina */}
          {!importBackupValid && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-clay-deep">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-clay" />
              File mungkin bukan cadangan Rutina
            </p>
          )}
          {/* audit B1-A2: konfirmasi ketik manual sebelum memulihkan */}
          <div className="space-y-1.5">
            <label htmlFor="import-confirm" className="text-xs font-semibold text-muted-foreground">
              Ketik PULIHKAN DATA untuk konfirmasi
            </label>
            <Input
              id="import-confirm"
              value={importConfirmText}
              onChange={(e) => setImportConfirmText(e.target.value)}
              placeholder="PULIHKAN DATA"
              autoCapitalize="none"
              autoCorrect="off"
              className="min-h-[44px]"
            />
          </div>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setPendingImport(null)} disabled={importMutation.isPending} className="press min-h-[44px] flex-1 sm:flex-none">
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={confirmImport}
              disabled={importMutation.isPending || importConfirmText !== "PULIHKAN DATA"}
              className="press min-h-[44px] flex-1 sm:flex-none flex items-center gap-1.5"
            >
              {importMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Ya, Pulihkan
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ====== Elemen baris pengaturan ======

function SettingsIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
      <Icon className="h-4 w-4" />
    </span>
  );
}

function Row({
  icon: Icon,
  label,
  desc,
  children,
}: {
  icon: LucideIcon;
  label: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-tight">{label}</p>
        {desc && <p className="text-xs text-muted-foreground leading-snug mt-0.5">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function ActionRow({
  icon: Icon,
  label,
  desc,
  busy,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  desc: string;
  busy?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={cn(
        "press w-full flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 text-left min-h-[64px] disabled:opacity-60"
      )}
    >
      <span className="h-9 w-9 rounded-xl bg-vault-soft flex items-center justify-center text-vault-deep shrink-0">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold leading-tight">{label}</span>
        <span className="block text-xs text-muted-foreground leading-snug mt-0.5">{desc}</span>
      </span>
    </button>
  );
}

const FAQ_ITEMS = [
  {
    q: "Apa itu Rutina?",
    a: "Rutina adalah ruang kerja pribadi untuk mengelola kebiasaan (Kebiasaan), kebugaran (Bugar), keuangan (Keuangan), dan jurnal (Jurnal) dalam satu aplikasi yang hangat dan tenang.",
  },
  {
    q: "Apa itu streak?",
    a: "Streak adalah jumlah hari berturut-turut kamu menyelesaikan setidaknya satu misi kebiasaan. Angka terbaikmu juga direkam di Observatorium sebagai rekor pribadi.",
  },
  {
    q: "Bagaimana jika aku jeda sehari?",
    a: "Jika tidak ada satu pun misi selesai pada hari itu, runtun streak akan terputus dan kembali menghitung dari nol keesokan harinya. XP dan statistik lain tetap aman.",
  },
  {
    q: "Bagaimana cara mencadangkan data?",
    a: "Buka Profil, lalu Data & Penyimpanan. Gunakan Ekspor Cadangan JSON untuk mengunduh seluruh data, dan Pulihkan dari JSON untuk memuatnya kembali kapan pun.",
  },
];
