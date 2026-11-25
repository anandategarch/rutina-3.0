// ============ Rutina 2.0 shared types ============

export interface Profile {
  id: string;
  name: string;
  identityVoice: string;
  dailyMissionTarget: number;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  status: "done" | "missed" | "rest";
  value: number | null;
  note: string | null;
}

export interface Habit {
  id: string;
  name: string;
  category: string; // health | productivity | mind | finance | social | learning
  icon: string; // lucide key
  color: string; // emerald | amber | teal | rose | orange | stone
  scheduleType: "daily" | "custom";
  daysOfWeek: string; // csv "0,1,2"
  timeOfDay: "morning" | "afternoon" | "evening" | "anytime";
  unitLabel: string | null;
  unitTarget: number | null;
  unitStep: number;
  reminderTime: string | null;
  stackAfter: string | null;
  archived: boolean;
  logs?: HabitLog[];
}

export interface Workout {
  id: string;
  type: "run" | "walk" | "runwalk" | "badminton" | "strength";
  title: string | null;
  date: string;
  startTime: string | null;
  durationMin: number;
  distanceKm: number | null;
  calories: number | null;
  paceMin: number | null;
  notes: string | null;
  strength: string | null; // JSON [{exercise, muscleGroup, weight, reps, sets}]
}

export interface StrengthItem {
  exercise: string;
  muscleGroup: string;
  weight: number;
  reps: number;
  sets: number;
}

export interface ExerciseItem {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string | null;
}

export interface FoodEntry {
  id: string;
  name: string;
  portion: string | null;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  meal: "breakfast" | "lunch" | "dinner" | "snack";
  date: string;
}

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  serving: string | null;
}

export interface CheckIn {
  id: string;
  date: string;
  mood: number | null; // 1..5
  energy: number | null;
  soreness: number | null;
  stress: number | null;
  sleepHours: number | null;
  note: string | null;
}

export interface BodyMetric {
  id: string;
  date: string;
  weightKg: number | null;
  hydrationGlasses: number | null;
}

export interface Wallet {
  id: string;
  name: string;
  type: "cash" | "bank" | "ewallet";
  initialBalance: number;
  color: string;
  icon: string;
  archived: boolean;
  createdAt?: string; // ISO — ditambahkan di skema (opsional agar objek lama tetap valid)
  balance?: number; // computed server-side
}

export interface Transaction {
  id: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  category: string;
  walletId: string;
  toWalletId: string | null;
  date: string;
  note: string | null;
  recurring: "none" | "weekly" | "monthly";
  wallet?: Wallet;
  toWallet?: Wallet | null;
}

export interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  spent?: number; // computed for current month
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  color: string;
  icon: string;
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  folder: string; // Umum | Refleksi | Ide | Sorotan
  mood: "great" | "good" | "neutral" | "tough" | "low" | null;
  pinned: boolean;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AchievementItem {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
}

export interface QuoteItem {
  id: string;
  text: string;
  author: string;
}

// ============ Computed / stats types ============

export interface StatsPayload {
  xp: number;
  level: number;
  levelProgress: number; // 0..1
  xpToNextLevel: number;
  missionsToday: { done: number; total: number };
  streak: { current: number; best: number };
  weekly: {
    missionsDone: number;
    missionsScheduled: number;
    prevWeekDone: number;
    prevWeekScheduled: number;
    completionRate: number; // 0..1 this week
  };
  habitCategoryComposition: { category: string; count: number }[];
  monthlyCalendar: { date: string; missionsDone: number; missionsTotal: number }[];
  fitness: {
    sessions30d: number;
    minutes30d: number;
    cardioKm30d: number;
    strengthSessions30d: number;
    weeklyWorkouts: { label: string; sessions: number; minutes: number }[];
    latestWeight: number | null;
    weightTrend: { date: string; weightKg: number }[];
    checkins: { date: string; mood: number | null; energy: number | null }[];
  };
  finance: {
    income30d: number;
    expense30d: number;
    netBalance: number;
    dailyExpenseHeat: { date: string; amount: number }[];
    categoryComposition: { category: string; amount: number }[];
  };
  journal: { entries30d: number; words30d: number; moodDistribution: { mood: string; count: number }[] };
  activityCalendar: {
    date: string;
    habitsDone: number;
    hasTransaction: boolean;
    hasWorkout: boolean;
    journaled: boolean;
  }[];
  mood14d: { date: string; mood: number | null; energy: number | null }[];
  achievements: AchievementItem[];
  insights: string[];
}

export interface HomePayload {
  profile: Profile;
  today: string;
  missions: { done: number; total: number };
  xp: number;
  level: number;
  levelProgress: number;
  streak: { current: number; best: number };
  agenda: {
    habit: Habit;
    log: HabitLog | null;
    scheduled: boolean;
  }[];
  highlight: { kind: string; title: string; description: string; icon: string } | null;
  weekRecap: {
    label: string;
    missionsDone: number;
    missionsTotal: number;
    workouts: number;
    spent: number;
    income: number;
    prevDone: number;
    prevTotal: number;
  };
  weekCashflow?: { date: string; income: number; expense: number }[];
  cashflowToday: { income: number; expense: number };
  quote: QuoteItem | null;
  journalDraftHint: JournalEntry | null;
}
