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

interface RutinaState {
  page: RutinaPage;
  hubOpen: boolean;
  quickAction: QuickAction;
  setPage: (p: RutinaPage) => void;
  setHubOpen: (open: boolean) => void;
  setQuickAction: (a: QuickAction) => void;
  openQuickAction: (a: Exclude<QuickAction, null>) => void;
}

export const useRutinaStore = create<RutinaState>((set) => ({
  page: "home",
  hubOpen: false,
  quickAction: null,
  setPage: (p) => set({ page: p, hubOpen: false }),
  setHubOpen: (open) => set({ hubOpen: open }),
  setQuickAction: (a) => set({ quickAction: a, hubOpen: false }),
  openQuickAction: (a) => set({ quickAction: a, hubOpen: false }),
}));
