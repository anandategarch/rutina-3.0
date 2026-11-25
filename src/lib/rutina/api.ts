"use client";

// ============ Typed API client for Rutina ============

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Request gagal (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "POST", body: JSON.stringify(body ?? {}) }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
};

// ============ Module endpoints ============

import type {
  BodyMetric,
  Budget,
  CheckIn,
  ExerciseItem,
  FoodEntry,
  FoodItem,
  Habit,
  HomePayload,
  JournalEntry,
  Profile,
  QuoteItem,
  SavingsGoal,
  StatsPayload,
  Transaction,
  Wallet,
  Workout,
} from "@/types/rutina";

export const rutinaApi = {
  home: () => api.get<HomePayload>("/api/home"),
  profile: () => api.get<{ profile: Profile }>("/api/profile"),
  updateProfile: (body: Partial<Pick<Profile, "name" | "identityVoice" | "dailyMissionTarget">>) =>
    api.patch<{ profile: Profile }>("/api/profile", body),

  habits: () => api.get<{ habits: Habit[] }>("/api/habits"),
  createHabit: (body: Record<string, unknown>) => api.post<{ habit: Habit }>("/api/habits", body),
  updateHabit: (id: string, body: Record<string, unknown>) =>
    api.patch<{ habit: Habit }>(`/api/habits/${id}`, body),
  deleteHabit: (id: string) => api.delete<{ ok: boolean }>(`/api/habits/${id}`),
  checkHabit: (id: string, date: string, value?: number) =>
    api.post<{ log: import("@/types/rutina").HabitLog | null }>(`/api/habits/${id}/check`, { date, value }),

  workouts: () => api.get<{ workouts: Workout[] }>("/api/workouts"),
  createWorkout: (body: Record<string, unknown>) => api.post<{ workout: Workout }>("/api/workouts", body),
  deleteWorkout: (id: string) => api.delete<{ ok: boolean }>(`/api/workouts/${id}`),

  foods: () => api.get<{ entries: FoodEntry[] }>("/api/foods"),
  createFood: (body: Record<string, unknown>) => api.post<{ entry: FoodEntry }>("/api/foods", body),
  deleteFood: (id: string) => api.delete<{ ok: boolean }>(`/api/foods/${id}`),
  foodItems: (q?: string) => api.get<{ items: FoodItem[] }>(`/api/food-items${q ? `?q=${encodeURIComponent(q)}` : ""}`),

  checkins: () => api.get<{ checkins: CheckIn[] }>("/api/checkins"),
  upsertCheckin: (body: Record<string, unknown>) => api.post<{ checkin: CheckIn }>("/api/checkins", body),
  bodyMetrics: () => api.get<{ metrics: BodyMetric[] }>("/api/body-metrics"),
  upsertBodyMetric: (body: Record<string, unknown>) => api.post<{ metric: BodyMetric }>("/api/body-metrics", body),
  exercises: () => api.get<{ exercises: ExerciseItem[] }>("/api/exercises"),

  wallets: () => api.get<{ wallets: Wallet[] }>("/api/wallets"),
  createWallet: (body: Record<string, unknown>) => api.post<{ wallet: Wallet }>("/api/wallets", body),
  deleteWallet: (id: string) => api.delete<{ ok: boolean }>(`/api/wallets/${id}`),
  transactions: () => api.get<{ transactions: Transaction[] }>("/api/transactions"),
  createTransaction: (body: Record<string, unknown>) =>
    api.post<{ transaction: Transaction }>("/api/transactions", body),
  deleteTransaction: (id: string) => api.delete<{ ok: boolean }>(`/api/transactions/${id}`),
  budgets: () => api.get<{ budgets: Budget[] }>("/api/budgets"),
  createBudget: (body: Record<string, unknown>) => api.post<{ budget: Budget }>("/api/budgets", body),
  goals: () => api.get<{ goals: SavingsGoal[] }>("/api/goals"),
  createGoal: (body: Record<string, unknown>) => api.post<{ goal: SavingsGoal }>("/api/goals", body),
  updateGoal: (id: string, body: Record<string, unknown>) =>
    api.patch<{ goal: SavingsGoal }>(`/api/goals/${id}`, body),

  journal: () => api.get<{ entries: JournalEntry[] }>("/api/journal"),
  createJournal: (body: Record<string, unknown>) => api.post<{ entry: JournalEntry }>("/api/journal", body),
  updateJournal: (id: string, body: Record<string, unknown>) =>
    api.patch<{ entry: JournalEntry }>(`/api/journal/${id}`, body),
  deleteJournal: (id: string) => api.delete<{ ok: boolean }>(`/api/journal/${id}`),

  stats: () => api.get<StatsPayload>("/api/stats"),
  quote: () => api.get<{ quote: QuoteItem | null }>("/api/quote"),
};
