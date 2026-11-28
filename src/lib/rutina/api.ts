"use client";

// ============ Typed API client for Rutina ============

/**
 * Timeout per kategori request:
 * - GET 30 dtk: route API di dev (Turbopack) dikompilasi on-demand — hit pertama
 *   setelah restart server bisa menunggu kompilasi berat (log: 8.5s untuk "/").
 *   Timeout 15 dtk memicu AbortSignal → query gagal → layar "Ada kendala memuat
 *   data" padahal server hidup. 30 dtk menutup kasus cold-compile + jaringan lambat.
 * - Mutasi 20 dtk: umumnya tulis cepat, tapi tetap longgar untuk jaringan mobile.
 */
const GET_TIMEOUT_MS = 30_000;
const MUTATION_TIMEOUT_MS = 20_000;

function describeFetchError(err: unknown): Error {
  if (err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError")) {
    return new Error("Waktu tunggu habis — server sedang sibuk atau koneksi lambat. Coba lagi.");
  }
  if (err instanceof TypeError) {
    // fetch() gagal total: server mati / restart / jaringan putus
    return new Error("Tidak bisa terhubung ke server. Periksa koneksi lalu coba lagi.");
  }
  return err instanceof Error ? err : new Error("Terjadi kesalahan tak terduga.");
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  // Signal eksplisit dari caller (mis. React Query) DIKOMBINASI dengan batas
  // waktu sendiri — audit 1-b: `init.signal ?? timeout` dulu membuat caller
  // signal MENONAKTIFKAN timeout total (tak ada guard 30 dtk).
  const isMutation = init?.method !== undefined && init.method !== "GET";
  const limitSignal = AbortSignal.timeout(isMutation ? MUTATION_TIMEOUT_MS : GET_TIMEOUT_MS);
  const signal =
    init?.signal && typeof AbortSignal.any === "function"
      ? AbortSignal.any([init.signal, limitSignal])
      : (init?.signal ?? limitSignal);
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      signal,
      headers: {
        // audit 1-b P2: GET/DELETE tanpa body tidak perlu Content-Type.
        ...(isMutation ? { "Content-Type": "application/json" } : {}),
        // audit E-B7: tanda tangan klien aplikasi — gerbang destruktif
        // (/api/danger/*, /api/import) di proxy.ts menolak mutasi tanpa header
        // ini; form/iframe lintas origin tidak bisa memasang header kustom.
        "x-rutina-client": "1",
        ...(init?.headers || {}),
      },
    });
  } catch (err) {
    throw describeFetchError(err);
  }
  if (!res.ok) {
    // Body error bisa berupa HTML gateway (502/504) — jangan biarkan
    // res.json() melempar SyntaxError mentah ke pengguna.
    const body = await res.json().catch(() => ({}));
    const e = new Error(
      (body as { error?: string }).error || `Request gagal (${res.status})`
    ) as Error & { status?: number };
    e.status = res.status; // status dipertahankan agar UI bisa membedakan 4xx vs 5xx
    throw e;
  }
  // audit 1-b P1: respons 200 dari gateway antara bisa berupa HTML kosong
  // (interstitial) — parse gagal diterjemahkan jadi pesan yang jelas, bukan
  // "Unexpected token '<'".
  try {
    return (await res.json()) as T;
  } catch {
    throw new Error(
      "Respons server tidak dapat dibaca. Coba lagi sebentar."
    );
  }
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
  FinanceCategory,
  FoodEntry,
  FoodItem,
  Habit,
  HomePayload,
  JournalEntry,
  Profile,
  QuoteItem,
  SavingsGoal,
  SearchResults,
  StatsPayload,
  Transaction,
  VaultMisses,
  Wallet,
  Workout,
} from "@/types/rutina";

export const rutinaApi = {
  // audit B2-H2: ?date= opsional — beranda dapat dimuat untuk tanggal terpilih
  home: (date?: string) =>
    api.get<HomePayload>(`/api/home${date ? `?date=${encodeURI(date)}` : ""}`),
  profile: () => api.get<{ profile: Profile }>("/api/profile"),
  updateProfile: (body: Partial<Pick<Profile, "name" | "identityVoice" | "dailyMissionTarget">>) =>
    api.patch<{ profile: Profile }>("/api/profile", body),

  habits: () =>
    api.get<{
      habits: Habit[];
      /** Runtun keseluruhan dari server (riwayat penuh, habit aktif saja) — audit D-M2 */
      overallStreak?: { current: number; best: number };
      /** Jumlah check-in seumur hidup (semua habit) untuk tahap Taman — audit D-M2 */
      lifetimeCheckIns?: number;
    }>("/api/habits"),
  createHabit: (body: Record<string, unknown>) => api.post<{ habit: Habit }>("/api/habits", body),
  updateHabit: (id: string, body: Record<string, unknown>) =>
    api.patch<{ habit: Habit }>(`/api/habits/${id}`, body),
  deleteHabit: (id: string) => api.delete<{ ok: boolean }>(`/api/habits/${id}`),
  checkHabit: (id: string, date: string, value?: number) =>
    api.post<{ log: import("@/types/rutina").HabitLog | null }>(`/api/habits/${id}/check`, { date, value }),

  // Rumah Kaca — pelindung runtun dari satu hari bolong karena lupa
  shieldHabit: (id: string, date: string) =>
    api.post<{ shield: { id: string; habitId: string; date: string } }>(`/api/habits/${id}/shield`, { date }),
  unshieldHabit: (id: string, date: string) =>
    api.delete<{ ok: boolean }>(`/api/habits/${id}/shield?date=${date}`),

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

  // Kategori keuangan buatan pengguna (selain kategori bawaan aplikasi)
  finCategories: () => api.get<{ categories: FinanceCategory[] }>("/api/fin-categories"),
  createFinCategory: (body: { name: string; type: "expense" | "income" }) =>
    api.post<{ category: FinanceCategory }>("/api/fin-categories", body),

  // Jaga Catatan — deteksi hari bolong & rekonsiliasi kas
  vaultMisses: () => api.get<VaultMisses>("/api/vault/misses"),
  reconcileWallet: (id: string, actualBalance: number) =>
    api.post<{ reconciled: boolean; delta: number; transaction: Transaction | null }>(
      `/api/wallets/${id}/reconcile`,
      { actualBalance }
    ),

  goals: () => api.get<{ goals: SavingsGoal[] }>("/api/goals"),
  createGoal: (body: Record<string, unknown>) => api.post<{ goal: SavingsGoal }>("/api/goals", body),
  // Kontribusi dana: kirim DELTA (increment atomik di server) — aman dari race
  // dua kontribusi cepat, bukan read-modify-write dari cache klien.
  contributeToGoal: (id: string, contribution: number) =>
    api.patch<{ goal: SavingsGoal }>(`/api/goals/${id}`, { contribution }),
  updateGoal: (id: string, body: Record<string, unknown>) =>
    api.patch<{ goal: SavingsGoal }>(`/api/goals/${id}`, body),

  journal: () => api.get<{ entries: JournalEntry[] }>("/api/journal"),
  createJournal: (body: Record<string, unknown>) => api.post<{ entry: JournalEntry }>("/api/journal", body),
  updateJournal: (id: string, body: Record<string, unknown>) =>
    api.patch<{ entry: JournalEntry }>(`/api/journal/${id}`, body),
  deleteJournal: (id: string) => api.delete<{ ok: boolean }>(`/api/journal/${id}`),

  stats: () => api.get<StatsPayload>("/api/stats"),
  quote: () => api.get<{ quote: QuoteItem | null }>("/api/quote"),

  // Pencarian cepat lintas modul — q wajib 2..60 karakter (server menolak di luar rentang)
  search: (q: string) => api.get<{ results: SearchResults }>(`/api/search?q=${encodeURIComponent(q)}`),
};
