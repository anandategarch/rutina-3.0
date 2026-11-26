/**
 * Seed data sampling Rutina 3.0 — 30 hari terakhir.
 *
 * Jalankan: DATABASE_URL="file:/path/ke/rutina/db/custom.db" bun scripts/seed.ts
 *
 * Idempoten: setiap koleksi hanya diisi bila masih kosong (atau di-upsert pada
 * field unik). Menjalankan ulang tidak menduplikasi data.
 *
 * Semua warna entity memakai KEY tone palet "Focus Teal" (lihat
 * docs/DESIGN.md § Palet Warna): emerald|amber|teal|rose|orange|stone —
 * bukan hex, agar UI tetap 100% konsisten dengan design token.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

/* ---------------- util ---------------- */

/** RNG deterministik (mulberry32) agar hasil seed reproducible. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20261126);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) => min + rand() * (max - min);
const intBetween = (min: number, max: number) => Math.floor(between(min, max + 1));

const JAKARTA_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dateStr = (d: Date) => JAKARTA_FMT.format(d);
/** D = hari ini (Jakarta), D(n) = n hari lalu. */
const D = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};
const DAY = (n: number) => dateStr(D(n));

const rupiah = (n: number) => Math.round(n / 500) * 500; // bulatkan ke 500

/* ---------------- definisi ---------------- */

const HABIT_DEFS = [
  {
    name: "Minum 8 gelas air",
    category: "health",
    icon: "glass-water",
    color: "emerald",
    scheduleType: "daily",
    daysOfWeek: "0,1,2,3,4,5,6",
    timeOfDay: "anytime",
    unitLabel: "gelas",
    unitTarget: 8,
    unitStep: 1,
    reminderTime: "08:00",
    adherence: 0.92,
  },
  {
    name: "Olahraga 30 menit",
    category: "health",
    icon: "dumbbell",
    color: "orange",
    scheduleType: "custom",
    daysOfWeek: "1,3,5",
    timeOfDay: "morning",
    unitLabel: null,
    unitTarget: null,
    unitStep: 1,
    reminderTime: "06:00",
    adherence: 0.78,
  },
  {
    name: "Baca 20 halaman",
    category: "mind",
    icon: "book-open",
    color: "teal",
    scheduleType: "daily",
    daysOfWeek: "0,1,2,3,4,5,6",
    timeOfDay: "evening",
    unitLabel: "halaman",
    unitTarget: 20,
    unitStep: 1,
    reminderTime: "21:00",
    stackAfter: "Setelah menyiram gigi",
    adherence: 0.85,
  },
  {
    name: "Meditasi 10 menit",
    category: "mind",
    icon: "sparkles",
    color: "amber",
    scheduleType: "daily",
    daysOfWeek: "0,1,2,3,4,5,6",
    timeOfDay: "morning",
    unitLabel: "menit",
    unitTarget: 10,
    unitStep: 1,
    reminderTime: "05:45",
    adherence: 0.8,
  },
  {
    name: "Catat pengeluaran harian",
    category: "finance",
    icon: "wallet-cards",
    color: "stone",
    scheduleType: "daily",
    daysOfWeek: "0,1,2,3,4,5,6",
    timeOfDay: "evening",
    unitLabel: null,
    unitTarget: null,
    unitStep: 1,
    reminderTime: "20:30",
    stackAfter: "Setelah makan malam",
    adherence: 0.88,
  },
  {
    name: "Belajar bahasa Inggris",
    category: "learning",
    icon: "languages",
    color: "rose",
    scheduleType: "custom",
    daysOfWeek: "1,2,3,4,5",
    timeOfDay: "afternoon",
    unitLabel: "menit",
    unitTarget: 15,
    unitStep: 1,
    reminderTime: "16:00",
    adherence: 0.75,
  },
];

const FOODS: Array<[string, number, number, number, number, string, string]> = [
  // nama, kalori, protein, karbo, lemak, porsi, meal
  ["Nasi goreng spesial", 520, 18, 68, 19, "1 piring", "lunch"],
  ["Ayam geprek + nasi", 650, 32, 72, 25, "1 porsi", "lunch"],
  ["Bubur ayam", 300, 14, 42, 8, "1 mangkuk", "breakfast"],
  ["Telur dadar", 180, 12, 2, 14, "1 butir", "breakfast"],
  ["Tahu tempe goreng", 150, 9, 10, 8, "3 potong", "lunch"],
  ["Teh manis", 60, 0, 15, 0, "1 gelas", "snack"],
  ["Kopi susu gula aren", 120, 2, 18, 4, "1 cup", "breakfast"],
  ["Pisang goreng", 195, 2, 30, 8, "2 buah", "snack"],
  ["Roti bakar keju", 280, 10, 32, 12, "2 lembar", "breakfast"],
  ["Mie ayam", 480, 20, 66, 15, "1 porsi", "lunch"],
  ["Sate ayam", 450, 34, 20, 26, "10 tusuk", "dinner"],
  ["Es teh manis", 55, 0, 14, 0, "1 gelas", "lunch"],
  ["Nasi putih", 205, 4, 45, 0.5, "1 mangkuk", "lunch"],
  ["Ayam bakar madu", 380, 36, 14, 20, "1 porsi", "dinner"],
  ["Sayur asem", 120, 3, 18, 4, "1 mangkuk", "dinner"],
  ["Tempe goreng", 130, 8, 8, 7, "2 potong", "lunch"],
  ["Oatmeal + susu", 220, 9, 32, 5, "1 mangkuk", "breakfast"],
  ["Sup ayam", 260, 22, 18, 10, "1 mangkuk", "dinner"],
  ["Gado-gado", 340, 12, 30, 19, "1 porsi", "dinner"],
  ["Bakso sapi", 420, 22, 48, 15, "1 porsi", "lunch"],
  ["Yoghurt stroberi", 110, 5, 15, 3, "1 cup", "snack"],
  ["Salad sayur + tuna", 180, 18, 12, 7, "1 mangkuk", "dinner"],
  ["Susu full cream", 150, 8, 12, 8, "1 gelas", "breakfast"],
  ["Pisang", 105, 1, 27, 0.4, "1 buah", "snack"],
  ["Nasi uduk", 480, 10, 62, 21, "1 porsi", "breakfast"],
  ["Perkedel kentang", 170, 3, 20, 9, "3 buah", "lunch"],
  ["Ikan kembung bakar", 240, 30, 0, 12, "1 ekor", "dinner"],
  ["Lalapan + sambal", 60, 2, 8, 2, "1 piring kecil", "dinner"],
];

const STRENGTH_SESSIONS: Array<{ title: string; items: Array<{ exercise: string; muscleGroup: string; weight: number; reps: number; sets: number }> }> = [
  {
    title: "Push Day",
    items: [
      { exercise: "Bench Press", muscleGroup: "chest", weight: 40, reps: 10, sets: 3 },
      { exercise: "Shoulder Press", muscleGroup: "shoulders", weight: 25, reps: 10, sets: 3 },
      { exercise: "Tricep Dip", muscleGroup: "arms", weight: 0, reps: 12, sets: 3 },
    ],
  },
  {
    title: "Pull Day",
    items: [
      { exercise: "Lat Pulldown", muscleGroup: "back", weight: 45, reps: 10, sets: 3 },
      { exercise: "Barbell Row", muscleGroup: "back", weight: 35, reps: 10, sets: 3 },
      { exercise: "Bicep Curl", muscleGroup: "arms", weight: 12, reps: 12, sets: 3 },
    ],
  },
  {
    title: "Leg Day",
    items: [
      { exercise: "Squat", muscleGroup: "legs", weight: 50, reps: 10, sets: 4 },
      { exercise: "Lunge", muscleGroup: "legs", weight: 16, reps: 12, sets: 3 },
      { exercise: "Calf Raise", muscleGroup: "legs", weight: 30, reps: 15, sets: 3 },
    ],
  },
];

const QUOTES = [
  { text: "Disiplin adalah jembatan antara tujuan dan pencapaian.", author: "Jim Rohn" },
  { text: "Kita adalah apa yang kita lakukan berulang-ulang. Keunggulan, maka, bukanlah tindakan melainkan kebiasaan.", author: "Aristoteles" },
  { text: "Jangan menyerah sebelum mencoba. Bertahanlah sedikit lebih lama dari rasa malasmu.", author: "Mario Teguh" },
  { text: "Pemuda yang berani dan keras kepala itulah yang kelak mengangkat derajat bangsanya.", author: "Soekarno" },
  { text: "Berhentilah mengeluh, mulailah bergerak. Hari terbaik adalah hari ketika kamu mulai.", author: "Buya Hamka" },
  { text: "Satu langkah kecil setiap hari lebih berharga daripada rencana besar yang tidak pernah dijalankan.", author: "Sahabat Rutina" },
  { text: "Waktu yang kamu investasikan pada dirimu sendiri tidak pernah sia-sia.", author: "Robin Sharma" },
  { text: "Pikiran yang tenang membawa kekuatan yang besar.", author: "Lao Tzu" },
  { text: "Kesehatan adalah mahkota atas segala pencapaian.", author: "Ungkapan Melayu" },
  { text: "Tumbuh itu tidak selalu terasa nyaman, dan rasa nyaman jarang membuatmu tumbuh.", author: "Anonim" },
];

const ACHIEVEMENT_DEFS = [
  { key: "first-habit", title: "Langkah Pertama", description: "Ciptakan kebiasaan pertamamu di Taman.", icon: "sprout", unlockedAt: DAY(28) },
  { key: "streak-7", title: "Api Menyala — 7 Hari", description: "Jaga satu kebiasaan tanpa putus selama 7 hari.", icon: "flame", unlockedAt: DAY(6) },
  { key: "workout-10", title: "10 Sesi Latihan", description: "Selesaikan 10 sesi olahraga tercatat.", icon: "dumbbell", unlockedAt: DAY(2) },
  { key: "xp-500", title: "500 XP Terkumpul", description: "Kumpulkan 500 XP dari seluruh aktivitas.", icon: "medal", unlockedAt: DAY(1) },
  { key: "journal-5", title: "Sang Penulis — 5 Entri", description: "Tulis 5 entri jurnal di Ruang Tulis.", icon: "pen-line", unlockedAt: DAY(4) },
  { key: "saver-1jt", title: "Menabung Rp1 Juta", description: "Total setoran tabungan mencapai Rp1 juta.", icon: "piggy-bank", unlockedAt: DAY(10) },
  { key: "streak-30", title: "Streak 30 Hari", description: "Pertahankan kebiasaan selama satu bulan penuh.", icon: "trophy", unlockedAt: null },
  { key: "habit-master", title: "Master Kebiasaan", description: "Selesaikan 100 hari total untuk semua kebiasaan.", icon: "crown", unlockedAt: null },
  { key: "checkin-30", title: "30 Hari Rajin Check-in", description: "Isi check-in harian selama 30 hari berturut-turut.", icon: "heart-pulse", unlockedAt: null },
];

const JOURNAL_SEED = [
  {
    title: "Minggu yang produktif",
    folder: "Sorotan",
    mood: "great",
    pinned: true,
    daysAgo: 2,
    content:
      "Minggu ini aku berhasil menjaga seluruh kebiasaan inti tanpa ada hari bolong. Kuncinya ternyata sederhana: siapkan semuanya malam sebelumnya — botol air di meja, buku di bantal, dan sepatu lari di depan pintu.\n\nCheck-in pagi juga mulai terasa seperti ritual yang kubutuhkan, bukan kewajiban. Tiga pertanyaan kecil tentang mood, energi, dan stress membuatku sadar pola: hari yang buruk hampir selalu dimulai dari tidur di bawah enam jam.",
  },
  {
    title: "Tentang jatuh dan bangkit lagi",
    folder: "Refleksi",
    mood: "good",
    pinned: false,
    daysAgo: 5,
    content:
      "Kemarin aku melewatkan sesi olahraga karena lelah, dan untuk pertama kalinya aku tidak memarahi diri sendiri. Konsistensi bukan soal sempurna, tapi soal kembali.\n\nAku memakai aturan 'never miss twice' yang sering dibahas di komunitas: satu hari bolong boleh, dua hari berturut-turut tidak. Hari ini aku kembali berlari lima kilometer dan rasanya justru lebih nikmat karena aku pernah hampir kehilangannya.",
  },
  {
    title: "Ide aplikasi kebiasaan versi 4",
    folder: "Ide",
    mood: "neutral",
    pinned: true,
    daysAgo: 9,
    content:
      "Beberapa ide untuk Rutina 4.0 kalau suatu saat dijangkau: (1) mode 'hijau' untuk hari libur agar streak tidak patah tapi tetap jujur, (2) ringkasan mingguan yang dikirim sebagai gambar, enak buat story, (3) habit stacking yang benar-benar terhubung — kalau kebiasaan A selesai, kebiasaan B otomatis muncul di atas agenda.\n\nYang paling menarik: integrasi laporan keuangan ringkas ke check-in pagi, sekali pandang sebelum hari dimulai.",
  },
  {
    title: "Keuangan mulai terasa tertib",
    folder: "Umum",
    mood: "good",
    pinned: false,
    daysAgo: 12,
    content:
      "Sudah dua minggu penuh aku mencatat setiap pengeluaran. Yang mengejutkan: kategori makan memakan porsi terbesar, terutama jajan sore. Budget yang tadinya terasa membengkak sekarang terlihat masuk akal setelah dipangkas 15%.\n\nTarget berikutnya: transfer rutin ke Dana Darurat setiap gaji masuk, bukan sisa bulanan. Pay yourself first — kata semua buku keuangan, dan akhirnya aku paham kenapa.",
  },
  {
    title: "Hari dengan energi rendah",
    folder: "Refleksi",
    mood: "low",
    pinned: false,
    daysAgo: 16,
    content:
      "Tidur lima jam setengah, rapat panjang, dan badan terasa berat. Hari ini aku hanya mengejar target minimum: delapan gelas air dan sepuluh menit meditasi.\n\nAku belajar bahwa sistem harus punya 'mode hemat'. Kalau hari buruk datang, kebiasaan tetap dijaga dalam ukuran terkecil yang masih berarti. Konsisten kecil lebih baik daripada besar yang bolong.",
  },
  {
    title: "Bacaan minggu ini: Atomic Habits (bab 4)",
    folder: "Umum",
    mood: "good",
    pinned: false,
    daysAgo: 20,
    content:
      "Bab empat membahas make it obvious. James Clear menyarankan habit stacking yang persis seperti fitur Taman di aplikasi ini: setelah [kebiasaan lama], aku akan [kebiasaan baru].\n\nAku mencobanya dengan 'setelah menyiram gigi, aku membaca 20 halaman'. Efeknya nyata — tidak ada lagi malam tanpa bacaan. Lingkungan memang mengubah perilaku lebih efektif daripada kemauan besi.",
  },
  {
    title: "Rencana bulan depan",
    folder: "Ide",
    mood: "great",
    pinned: false,
    daysAgo: 25,
    content:
      "Tiga fokus bulan depan: (1) kecepatan lari 5K turun ke bawah 30 menit, (2) dana darurat tembus 10 juta, (3) menyelesaikan buku kedua bulan ini.\n\nSemua target kutulis di statistik dan akan kureview tiap Minggu malam. Kalau semuanya tercapai, aku beri diri sendiri satu malam menonton tanpa rasa bersalah.",
  },
  {
    title: "Catatan pertama di Rutina",
    folder: "Umum",
    mood: "neutral",
    pinned: false,
    daysAgo: 29,
    content:
      "Hari pertama memakai Rutina. Aku membuat satu kebiasaan sederhana saja: minum delapan gelas air. Tidak ada target besar, tidak ada drama.\n\nSudah terlalu banyak kali aku memulai dengan semangat tinggi lalu padam dalam seminggu. Kali ini strateginya berbeda: mulai dari yang paling mudah, lalu naik pelan-pelan. Selamat datang, Rutina.",
  },
];

/* ---------------- seed ---------------- */

async function seedHabits() {
  const ids: Record<string, string> = {};
  for (const def of HABIT_DEFS) {
    const existing = await db.habit.findFirst({ where: { name: def.name } });
    if (existing) {
      ids[def.name] = existing.id;
      continue;
    }
    const { adherence, ...data } = def;
    void adherence;
    const created = await db.habit.create({ data });
    ids[def.name] = created.id;
  }
  return ids;
}

async function seedHabitLogs(habitIds: Record<string, string>) {
  let created = 0;
  for (const def of HABIT_DEFS) {
    const habitId = habitIds[def.name];
    const scheduledDays = def.scheduleType === "custom" ? def.daysOfWeek.split(",").map(Number) : null;
    for (let i = 29; i >= 0; i--) {
      const date = DAY(i);
      const dow = D(i).getDay();
      if (scheduledDays && !scheduledDays.includes(dow)) continue;
      // Hari terakhir (i=0) biarkan sebagian terbuka agar tampilan "misi hari ini" hidup.
      const isToday = i === 0;
      const roll = rand();
      const done = roll < def.adherence || (isToday && roll < 0.5);
      const status = done ? "done" : "missed";
      const value =
        def.unitTarget != null
          ? done
            ? Math.max(1, Math.round(def.unitTarget * between(0.6, 1.15)))
            : Math.max(1, Math.round(def.unitTarget * between(0.1, 0.5)))
          : null;
      const existing = await db.habitLog.findUnique({ where: { habitId_date: { habitId, date } } });
      if (existing) continue;
      await db.habitLog.create({ data: { habitId, date, status, value } });
      created++;
    }
  }
  return created;
}

async function seedWorkouts() {
  if ((await db.workout.count()) > 0) return 0;
  const rows: Array<Parameters<typeof db.workout.create>[0]["data"]> = [];
  let runCount = 0;
  for (let i = 29; i >= 0; i--) {
    const dow = D(i).getDay();
    // latihan kekuasaan Sen/Rab/Jum (1,3,5), lari Sab/Minggu pagi, badminton 2x sebulan
    const isStrengthDay = [1, 3, 5].includes(dow) && rand() < 0.75;
    const isRunDay = [0, 6].includes(dow) && rand() < 0.8;
    if (!isStrengthDay && !isRunDay) continue;
    if (isRunDay) {
      runCount++;
      const dist = between(4.6, 6.4);
      const dur = dist * between(5.7, 6.6);
      rows.push({
        type: "run",
        title: runCount % 3 === 0 ? "Easy Run Pagi" : "Lari 5K",
        date: DAY(i),
        startTime: "06:15",
        durationMin: Math.round(dur),
        distanceKm: Math.round(dist * 100) / 100,
        paceMin: Math.round((dur / dist) * 100) / 100,
        calories: Math.round(dist * 62),
        notes: runCount % 3 === 0 ? "Tempo santai, fokus napas." : null,
      });
    } else {
      const s = pick(STRENGTH_SESSIONS);
      rows.push({
        type: "strength",
        title: s.title,
        date: DAY(i),
        startTime: "06:30",
        durationMin: intBetween(38, 52),
        calories: intBetween(180, 260),
        strength: JSON.stringify(s.items),
        notes: null,
      });
    }
  }
  // dua sesi badminton
  rows.push({
    type: "badminton",
    title: "Badminton bareng teman",
    date: DAY(11),
    startTime: "19:00",
    durationMin: 75,
    calories: 480,
    notes: "Dua game ganda, menang 1 kalah 1.",
  });
  rows.push({
    type: "badminton",
    title: "Badminton rutin",
    date: DAY(24),
    startTime: "19:00",
    durationMin: 90,
    calories: 560,
    notes: null,
  });
  // satu lari di pekan berjalan agar ringkasan pekan tidak kosong
  rows.push({
    type: "run",
    title: "Easy Run Selasa",
    date: DAY(2),
    startTime: "06:20",
    durationMin: 31,
    distanceKm: 5.1,
    paceMin: 6.08,
    calories: 316,
    notes: "Tempo ringan, jaga ritme napas.",
  });
  for (const r of rows) await db.workout.create({ data: r });
  return rows.length;
}

async function seedFood() {
  if ((await db.foodEntry.count()) > 0) return 0;
  let created = 0;
  for (let i = 6; i >= 0; i--) {
    const breakfast = pick(["Bubur ayam", "Oatmeal + susu", "Roti bakar keju", "Nasi uduk", "Telur dadar"]);
    const lunch = pick(["Nasi goreng spesial", "Ayam geprek + nasi", "Mie ayam", "Bakso sapi", "Sate ayam"]);
    const dinner = pick(["Ayam bakar madu", "Sup ayam", "Gado-gado", "Ikan kembung bakar", "Salad sayur + tuna"]);
    const snack = pick(["Teh manis", "Pisang", "Yoghurt stroberi", "Kopi susu gula aren", "Pisang goreng"]);
    const meals: Array<[string, string]> = [
      [breakfast, "breakfast"],
      [lunch, "lunch"],
      [dinner, "dinner"],
      [snack, "snack"],
    ];
    for (const [name, meal] of meals) {
      const f = FOODS.find((x) => x[0] === name)!;
      await db.foodEntry.create({
        data: {
          name: f[0],
          calories: f[1],
          protein: f[2],
          carbs: f[3],
          fat: f[4],
          portion: f[5],
          meal,
          date: DAY(i),
        },
      });
      created++;
    }
  }
  return created;
}

async function seedCheckIns() {
  let created = 0;
  for (let i = 29; i >= 0; i--) {
    const date = DAY(i);
    const exists = await db.checkIn.findUnique({ where: { date } });
    if (exists) continue;
    const dow = D(i).getDay();
    const stress = intBetween(1, 4);
    const energy = Math.max(2, 5 - stress + intBetween(-1, 1));
    const mood = Math.min(5, Math.max(3, energy + intBetween(-1, 1)));
    const notes: Record<number, string> = {
      5: "Hari terbaik minggu ini.",
      4: "Badan fit, mood stabil.",
      3: "Biasa saja, tetap produktif.",
      2: "Lumayan, cukup tidur lebih awal nanti.",
    };
    await db.checkIn.create({
      data: {
        date,
        mood,
        energy,
        soreness: [1, 3, 5].includes(dow) ? intBetween(2, 4) : intBetween(1, 2),
        stress,
        sleepHours: Math.round(between(5.8, 8.4) * 2) / 2,
        note: rand() < 0.25 ? notes[mood] ?? null : null,
      },
    });
    created++;
  }
  return created;
}

async function seedBodyMetrics() {
  let created = 0;
  let weight = 78.6;
  for (let i = 29; i >= 0; i--) {
    const date = DAY(i);
    const exists = await db.bodyMetric.findUnique({ where: { date } });
    if (exists) continue;
    weight = Math.max(76.6, weight - between(0, 0.09));
    await db.bodyMetric.create({
      data: {
        date,
        weightKg: Math.round(weight * 10) / 10,
        hydrationGlasses: intBetween(6, 10),
      },
    });
    created++;
  }
  return created;
}

async function seedFinance() {
  let walletsCreated = 0;
  if ((await db.wallet.count()) === 0) {
    await db.wallet.createMany({
      data: [
        { name: "Bank BCA", type: "bank", initialBalance: 12500000, color: "teal", icon: "wallet" },
        { name: "GoPay", type: "ewallet", initialBalance: 750000, color: "emerald", icon: "wallet" },
        { name: "Tunai", type: "cash", initialBalance: 500000, color: "amber", icon: "wallet" },
      ],
    });
    walletsCreated = 3;
  }
  const bca = (await db.wallet.findFirst({ where: { name: "Bank BCA" } }))!;
  const gopay = (await db.wallet.findFirst({ where: { name: "GoPay" } }))!;
  const tunai = (await db.wallet.findFirst({ where: { name: "Tunai" } }))!;

  if ((await db.budget.count()) === 0) {
    await db.budget.createMany({
      data: [
        { category: "makan", monthlyLimit: 2000000 },
        { category: "transport", monthlyLimit: 600000 },
        { category: "belanja", monthlyLimit: 1000000 },
        { category: "hiburan", monthlyLimit: 500000 },
        { category: "kesehatan", monthlyLimit: 400000 },
      ],
    });
  }
  if ((await db.savingsGoal.count()) === 0) {
    await db.savingsGoal.createMany({
      data: [
        { name: "Dana Darurat", targetAmount: 20000000, currentAmount: 7500000, color: "teal", icon: "piggy-bank" },
        { name: "Laptop Baru", targetAmount: 15000000, currentAmount: 4250000, deadline: DAY(-90), color: "amber", icon: "laptop" },
        { name: "Liburan Keluarga", targetAmount: 8000000, currentAmount: 6100000, deadline: DAY(-150), color: "emerald", icon: "palmtree" },
      ],
    });
  }

  if ((await db.transaction.count()) > 0) return walletsCreated;
  let count = 0;
  const add = async (data: Parameters<typeof db.transaction.create>[0]["data"]) => {
    await db.transaction.create({ data });
    count++;
  };
  // pengeluaran harian 30 hari
  for (let i = 29; i >= 0; i--) {
    const date = DAY(i);
    // makan (1-3 trx/hari)
    for (let m = 0; m < intBetween(1, 3); m++) {
      await add({
        type: "expense",
        amount: rupiah(between(15000, 65000)),
        category: "makan",
        walletId: rand() < 0.6 ? gopay.id : tunai.id,
        date,
        note: pick(["Makan siang", "Kopi sore", "Sarapan", "Jajan sore", "Makan malam"]),
      });
    }
    // transport
    if (rand() < 0.8)
      await add({
        type: "expense",
        amount: rupiah(between(12000, 38000)),
        category: "transport",
        walletId: gopay.id,
        date,
        note: pick(["Ojek online", "KRL", "TransJakarta", "Bensin motor"]),
      });
    // belanja & hiburan & kesehatan sesekali
    if (rand() < 0.18)
      await add({ type: "expense", amount: rupiah(between(45000, 350000)), category: "belanja", walletId: bca.id, date, note: pick(["Belanja mingguan", "Kebutuhan rumah", "Pakaian"]) });
    if (rand() < 0.14)
      await add({ type: "expense", amount: rupiah(between(30000, 120000)), category: "hiburan", walletId: rand() < 0.5 ? gopay.id : tunai.id, date, note: pick(["Streaming", "Nonton", "Game"]) });
    if (rand() < 0.08)
      await add({ type: "expense", amount: rupiah(between(60000, 280000)), category: "kesehatan", walletId: bca.id, date, note: pick(["Vitamin", "Obat", "Konsultasi dokter"]) });
    if (rand() < 0.06)
      await add({ type: "expense", amount: rupiah(between(90000, 200000)), category: "edukasi", walletId: bca.id, date, note: pick(["Kursus online", "Buku"]) });
    // transfer isi ulang dompet — GoPay di-top-up mingguan agar saldo realistis
    if (i % 7 === 2)
      await add({ type: "transfer", amount: 500000, category: "lainnya", walletId: bca.id, toWalletId: gopay.id, date, note: "Top-up GoPay mingguan" });
    if (i % 12 === 7)
      await add({ type: "transfer", amount: 500000, category: "lainnya", walletId: bca.id, toWalletId: tunai.id, date, note: "Tarik uang tunai" });
    // tagihan
    if (i === 20)
      await add({ type: "expense", amount: 750000, category: "tagihan", walletId: bca.id, date, note: "Listrik + internet" });
  }
  // pemasukan
  await add({ type: "income", amount: 8500000, category: "gaji", walletId: bca.id, date: DAY(24), note: "Gaji bulanan", recurring: "monthly" });
  await add({ type: "income", amount: 1800000, category: "freelance", walletId: bca.id, date: DAY(12), note: "Proyek desain landing page" });
  await add({ type: "income", amount: 950000, category: "freelance", walletId: bca.id, date: DAY(5), note: "Konsultasi teknis" });
  await add({ type: "income", amount: 300000, category: "hadiah", walletId: tunai.id, date: DAY(15), note: "Hadiah ulang tahun" });
  return count + walletsCreated;
}

async function seedJournal() {
  if ((await db.journalEntry.count()) > 0) return 0;
  for (const j of JOURNAL_SEED) {
    const words = j.content.split(/\s+/).length;
    await db.journalEntry.create({
      data: {
        title: j.title,
        content: j.content,
        folder: j.folder,
        mood: j.mood,
        pinned: j.pinned,
        wordCount: words,
        createdAt: D(j.daysAgo),
        updatedAt: D(j.daysAgo),
      },
    });
  }
  return JOURNAL_SEED.length;
}

async function seedGamification() {
  let n = 0;
  if ((await db.quote.count()) === 0) {
    await db.quote.createMany({ data: QUOTES });
    n += QUOTES.length;
  }
  if ((await db.achievement.count()) === 0) {
    await db.achievement.createMany({ data: ACHIEVEMENT_DEFS });
    n += ACHIEVEMENT_DEFS.length;
  }
  return n;
}

async function main() {
  const profile = await db.profile.findUnique({ where: { id: "main" } });
  if (!profile) await db.profile.create({ data: { id: "main" } });

  const habitIds = await seedHabits();
  const logs = await seedHabitLogs(habitIds);
  const workouts = await seedWorkouts();
  const food = await seedFood();
  const checkins = await seedCheckIns();
  const metrics = await seedBodyMetrics();
  const finance = await seedFinance();
  const journal = await seedJournal();
  const gamify = await seedGamification();

  console.log("Seed selesai:", {
    habits: Object.keys(habitIds).length,
    habitLogs: logs,
    workouts,
    foodEntries: food,
    checkIns: checkins,
    bodyMetrics: metrics,
    finance: finance,
    journalEntries: journal,
    quotesAchievements: gamify,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
