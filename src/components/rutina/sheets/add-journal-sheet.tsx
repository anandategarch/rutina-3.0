"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pin, Laugh, Smile, Meh, Frown, CloudRain } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
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
import { rutinaApi } from "@/lib/rutina/api";
import { invalidateAfterMutation } from "@/lib/rutina/queries";
import { cn } from "@/lib/utils";
import ConfirmDiscard from "@/components/rutina/sheets/confirm-discard";

const FOLDERS = ["Umum", "Refleksi", "Ide", "Sorotan"];

export const JOURNAL_MOODS = [
  { key: "great", label: "Luar biasa", icon: Laugh },
  { key: "good", label: "Baik", icon: Smile },
  { key: "neutral", label: "Biasa", icon: Meh },
  { key: "tough", label: "Berat", icon: Frown },
  { key: "low", label: "Kurang", icon: CloudRain },
] as const;

export interface JournalPrefill {
  title?: string;
  content?: string;
  folder?: string;
}

export default function AddJournalSheet({
  open,
  onClose,
  prefill,
}: {
  open: boolean;
  onClose: () => void;
  prefill?: JournalPrefill;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [folder, setFolder] = React.useState<string>("Umum");
  const [mood, setMood] = React.useState<string | null>(null);
  const [pinned, setPinned] = React.useState(false);

  // Inisialisasi form setiap kali sheet dibuka (dukung prefill kutipan)
  React.useEffect(() => {
    if (open) {
      setTitle(prefill?.title ?? "");
      setContent(prefill?.content ?? "");
      setFolder(prefill?.folder && FOLDERS.includes(prefill.folder) ? prefill.folder : "Umum");
      setMood(null);
      setPinned(false);
    }
  }, [open, prefill]);

  const createMutation = useMutation({
    mutationFn: () =>
      rutinaApi.createJournal({
        title: title.trim(),
        content: content.trim(),
        folder,
        mood,
        pinned,
      }),
    onSuccess: () => {
      // audit 1-b P2: helper tunggal — ikut mengosongkan day-detail (Stats).
      invalidateAfterMutation(qc, ["journal"]);
      toast.success("Catatan tersimpan");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ===== Dirty-guard: bandingkan dengan nilai awal (prefill kutipan atau kosong) =====
  const initialFolder = prefill?.folder && FOLDERS.includes(prefill.folder) ? prefill.folder : "Umum";
  const dirty =
    title !== (prefill?.title ?? "") ||
    content !== (prefill?.content ?? "") ||
    folder !== initialFolder ||
    mood !== null ||
    pinned;
  const [confirmDiscard, setConfirmDiscard] = React.useState(false);
  const handleOpenChange = (o: boolean) => {
    if (!o) {
      if (dirty && !createMutation.isPending) {
        setConfirmDiscard(true);
        return;
      }
      onClose();
    }
  };

  const canSubmit = content.trim().length > 0 && !createMutation.isPending;

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!content.trim()) {
      toast.error("Isi catatan belum ditulis");
      return;
    }
    createMutation.mutate();
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[92dvh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-writer-deep">Tulis Catatan</DrawerTitle>
          <DrawerDescription className="text-xs text-muted-foreground">
            Catat apa pun yang layak diingat — refleksi, ide, atau sorotan hari ini.
          </DrawerDescription>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          <div className="px-4 pb-4 overflow-y-auto scroll-thin space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="journal-title" className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Judul
              </label>
              <Input
                id="journal-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tanpa judul juga boleh"
                maxLength={200}
                enterKeyHint="next"
                onKeyDown={(e) => {
                  // Enter → lanjut ke isi catatan (caret di akhir, bukan submit)
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  const el = document.getElementById("journal-content");
                  if (el instanceof HTMLTextAreaElement) {
                    el.focus();
                    el.setSelectionRange(el.value.length, el.value.length);
                  }
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="journal-content" className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Isi catatan <span className="text-writer-deep">*</span>
              </label>
              <Textarea
                id="journal-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Hari ini aku ..."
                className="min-h-40 resize-none"
                maxLength={5000}
              />
              {content.length > 0 && (
                <p className="text-right text-[11px] text-muted-foreground">{content.length}/5000</p>
              )}
              <p className="text-xs text-muted-foreground tabular text-right">
                {content.trim() ? content.trim().split(/\s+/).length : 0} kata
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Folder</p>
              <Select value={folder} onValueChange={setFolder}>
                <SelectTrigger className="w-full min-h-[44px]" aria-label="Pilih folder catatan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOLDERS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Mood</p>
              <div className="grid grid-cols-5 gap-2">
                {JOURNAL_MOODS.map((m) => {
                  const Icon = m.icon;
                  const active = mood === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setMood(active ? null : m.key)}
                      aria-pressed={active}
                      aria-label={`Mood ${m.label}`}
                      className={cn(
                        "press flex flex-col items-center justify-center gap-1 rounded-xl border py-3 min-h-[64px]",
                        active
                          ? "bg-writer-soft border-writer/40 text-writer-deep"
                          : "bg-secondary border-border/60 text-muted-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-semibold leading-none">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Pin className="h-4 w-4 text-writer-deep" />
                Sematkan di atas
              </div>
              <Switch checked={pinned} onCheckedChange={setPinned} aria-label="Sematkan catatan" />
            </div>
          </div>

          {/* ===== Submit (footer sticky di luar area scroll) ===== */}
          <div className="border-t border-border/60 bg-background p-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
            <button
              type="submit"
              disabled={!canSubmit}
              className="press w-full min-h-[48px] rounded-xl bg-writer-deep text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan Catatan
            </button>
          </div>
        </form>

        {/* Konfirmasi buang perubahan yang belum disimpan */}
        <ConfirmDiscard open={confirmDiscard} onOpenChange={setConfirmDiscard} onConfirm={onClose} />
      </DrawerContent>
    </Drawer>
  );
}
