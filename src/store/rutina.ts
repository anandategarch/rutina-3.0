"use client";

import { create } from "zustand";

export type MainTab = "home" | "fitness" | "finance" | "habits";
export type RutinaPage = MainTab | "journal" | "stats" | "profile";
export type QuickAction =
  | "habit"
  | "journal"
  | "transaction"
  | "workout"
  | "food"
  | "checkin"
  | null;

/** Prefill opsional untuk sheet jurnal (mis. prompt refleksi harian). */
export interface JournalPrefillPayload {
  title?: string;
  content?: string;
  folder?: string;
}

interface RutinaState {
  page: RutinaPage;
  hubOpen: boolean;
  quickAction: QuickAction;
  /** Pencarian cepat lintas modul (sheet terpisah dari hub agar input tetap hidup). */
  searchOpen: boolean;
  /** Prefill jurnal aktif; dibersihkan oleh app-shell saat sheet jurnal ditutup (closeJournal). */
  journalPrefill: JournalPrefillPayload | null;
  setPage: (p: RutinaPage) => void;
  setHubOpen: (open: boolean) => void;
  setQuickAction: (a: QuickAction) => void;
  setSearchOpen: (open: boolean) => void;
  /**
   * Buka sheet jurnal; tanpa argumen = form bersih (prefill lama dibuang),
   * dengan prefill = isi form otomatis (dipakai prompt refleksi).
   */
  openJournalSheet: (prefill?: JournalPrefillPayload) => void;
}

export const useRutinaStore = create<RutinaState>((set) => ({
  page: "home",
  hubOpen: false,
  quickAction: null,
  searchOpen: false,
  journalPrefill: null,
  setPage: (p) => set({ page: p, hubOpen: false }),
  setHubOpen: (open) => set({ hubOpen: open }),
  setQuickAction: (a) => set({ quickAction: a, hubOpen: false }),
  setSearchOpen: (open) => set({ searchOpen: open, hubOpen: false }),
  openJournalSheet: (prefill) =>
    set({ journalPrefill: prefill ?? null, quickAction: "journal", hubOpen: false }),
}));
