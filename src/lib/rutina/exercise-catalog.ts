/**
 * Katalog gerakan latihan beban (data kategori bugar) — sumber acuan
 * aplikasi Rutina.
 *
 * Data referensi ini diimpor otomatis ke tabel `Exercise` saat library
 * kosong (lihat GET /api/exercises) dan oleh scripts/seed.ts — sehingga
 * library gerakan di sheet "Catat Latihan" selalu terisi tanpa input manual.
 *
 * Kelompok otot (muscleGroup) mengikuti kunci yang sudah dipakai UI sheet:
 * chest | back | shoulders | arms | legs | core | fullbody.
 * Peralatan ditulis dalam bahasa Indonesia karena ditampilkan apa adanya.
 *
 * Nama gerakan unik — sheet mencegah duplikat di draft berdasarkan nama.
 */

export type ExerciseCatalogItem = {
  name: string;
  muscleGroup: "chest" | "back" | "shoulders" | "arms" | "legs" | "core" | "fullbody";
  equipment: string | null;
};

export const EXERCISE_CATALOG: ExerciseCatalogItem[] = [
  // ===== Dada (chest) =====
  { name: "Bench Press", muscleGroup: "chest", equipment: "Barbell" },
  { name: "Incline Bench Press", muscleGroup: "chest", equipment: "Barbell" },
  { name: "Decline Bench Press", muscleGroup: "chest", equipment: "Barbell" },
  { name: "Dumbbell Bench Press", muscleGroup: "chest", equipment: "Dumbbell" },
  { name: "Incline Dumbbell Press", muscleGroup: "chest", equipment: "Dumbbell" },
  { name: "Chest Fly", muscleGroup: "chest", equipment: "Dumbbell" },
  { name: "Cable Crossover", muscleGroup: "chest", equipment: "Kabel" },
  { name: "Machine Chest Press", muscleGroup: "chest", equipment: "Mesin" },
  { name: "Pec Deck Fly", muscleGroup: "chest", equipment: "Mesin" },
  { name: "Push-Up", muscleGroup: "chest", equipment: "Beban tubuh" },

  // ===== Punggung (back) =====
  { name: "Deadlift", muscleGroup: "back", equipment: "Barbell" },
  { name: "Barbell Row", muscleGroup: "back", equipment: "Barbell" },
  { name: "Dumbbell Row", muscleGroup: "back", equipment: "Dumbbell" },
  { name: "Lat Pulldown", muscleGroup: "back", equipment: "Mesin" },
  { name: "Pull-Up", muscleGroup: "back", equipment: "Beban tubuh" },
  { name: "Chin-Up", muscleGroup: "back", equipment: "Beban tubuh" },
  { name: "Seated Cable Row", muscleGroup: "back", equipment: "Kabel" },
  { name: "T-Bar Row", muscleGroup: "back", equipment: "Barbell" },
  { name: "Straight-Arm Pulldown", muscleGroup: "back", equipment: "Kabel" },
  { name: "Back Extension", muscleGroup: "back", equipment: "Beban tubuh" },
  { name: "Machine Row", muscleGroup: "back", equipment: "Mesin" },

  // ===== Bahu (shoulders) =====
  { name: "Overhead Press", muscleGroup: "shoulders", equipment: "Barbell" },
  { name: "Shoulder Press", muscleGroup: "shoulders", equipment: "Dumbbell" },
  { name: "Arnold Press", muscleGroup: "shoulders", equipment: "Dumbbell" },
  { name: "Lateral Raise", muscleGroup: "shoulders", equipment: "Dumbbell" },
  { name: "Front Raise", muscleGroup: "shoulders", equipment: "Dumbbell" },
  { name: "Rear Delt Fly", muscleGroup: "shoulders", equipment: "Dumbbell" },
  { name: "Face Pull", muscleGroup: "shoulders", equipment: "Kabel" },
  { name: "Upright Row", muscleGroup: "shoulders", equipment: "Barbell" },
  { name: "Shrugs", muscleGroup: "shoulders", equipment: "Dumbbell" },
  { name: "Machine Shoulder Press", muscleGroup: "shoulders", equipment: "Mesin" },

  // ===== Lengan (arms) =====
  { name: "Bicep Curl", muscleGroup: "arms", equipment: "Barbell" },
  { name: "Dumbbell Curl", muscleGroup: "arms", equipment: "Dumbbell" },
  { name: "Hammer Curl", muscleGroup: "arms", equipment: "Dumbbell" },
  { name: "Preacher Curl", muscleGroup: "arms", equipment: "Mesin" },
  { name: "Concentration Curl", muscleGroup: "arms", equipment: "Dumbbell" },
  { name: "Cable Curl", muscleGroup: "arms", equipment: "Kabel" },
  { name: "Tricep Dip", muscleGroup: "arms", equipment: "Beban tubuh" },
  { name: "Skull Crusher", muscleGroup: "arms", equipment: "Barbell" },
  { name: "Tricep Pushdown", muscleGroup: "arms", equipment: "Kabel" },
  { name: "Overhead Tricep Extension", muscleGroup: "arms", equipment: "Dumbbell" },
  { name: "Close-Grip Bench Press", muscleGroup: "arms", equipment: "Barbell" },
  { name: "Machine Tricep Dip", muscleGroup: "arms", equipment: "Mesin" },

  // ===== Kaki (legs) =====
  { name: "Squat", muscleGroup: "legs", equipment: "Barbell" },
  { name: "Front Squat", muscleGroup: "legs", equipment: "Barbell" },
  { name: "Goblet Squat", muscleGroup: "legs", equipment: "Kettlebell" },
  { name: "Leg Press", muscleGroup: "legs", equipment: "Mesin" },
  { name: "Hack Squat", muscleGroup: "legs", equipment: "Mesin" },
  { name: "Lunge", muscleGroup: "legs", equipment: "Dumbbell" },
  { name: "Walking Lunge", muscleGroup: "legs", equipment: "Dumbbell" },
  { name: "Bulgarian Split Squat", muscleGroup: "legs", equipment: "Dumbbell" },
  { name: "Step-Up", muscleGroup: "legs", equipment: "Dumbbell" },
  { name: "Romanian Deadlift", muscleGroup: "legs", equipment: "Barbell" },
  { name: "Sumo Deadlift", muscleGroup: "legs", equipment: "Barbell" },
  { name: "Leg Extension", muscleGroup: "legs", equipment: "Mesin" },
  { name: "Leg Curl", muscleGroup: "legs", equipment: "Mesin" },
  { name: "Hip Thrust", muscleGroup: "legs", equipment: "Barbell" },
  { name: "Glute Bridge", muscleGroup: "legs", equipment: "Beban tubuh" },
  { name: "Calf Raise", muscleGroup: "legs", equipment: "Beban tubuh" },
  { name: "Seated Calf Raise", muscleGroup: "legs", equipment: "Mesin" },

  // ===== Inti (core) =====
  { name: "Plank", muscleGroup: "core", equipment: "Beban tubuh" },
  { name: "Side Plank", muscleGroup: "core", equipment: "Beban tubuh" },
  { name: "Crunch", muscleGroup: "core", equipment: "Beban tubuh" },
  { name: "Sit-Up", muscleGroup: "core", equipment: "Beban tubuh" },
  { name: "Hanging Leg Raise", muscleGroup: "core", equipment: "Beban tubuh" },
  { name: "Leg Raise", muscleGroup: "core", equipment: "Beban tubuh" },
  { name: "Russian Twist", muscleGroup: "core", equipment: "Beban tubuh" },
  { name: "Cable Crunch", muscleGroup: "core", equipment: "Kabel" },
  { name: "Ab Wheel Rollout", muscleGroup: "core", equipment: "Beban tubuh" },
  { name: "Dead Bug", muscleGroup: "core", equipment: "Beban tubuh" },
  { name: "Bicycle Crunch", muscleGroup: "core", equipment: "Beban tubuh" },
  { name: "Mountain Climber", muscleGroup: "core", equipment: "Beban tubuh" },

  // ===== Seluruh tubuh (fullbody) =====
  { name: "Burpee", muscleGroup: "fullbody", equipment: "Beban tubuh" },
  { name: "Kettlebell Swing", muscleGroup: "fullbody", equipment: "Kettlebell" },
  { name: "Thruster", muscleGroup: "fullbody", equipment: "Barbell" },
  { name: "Clean and Press", muscleGroup: "fullbody", equipment: "Barbell" },
  { name: "Farmer's Walk", muscleGroup: "fullbody", equipment: "Dumbbell" },
  { name: "Turkish Get-Up", muscleGroup: "fullbody", equipment: "Kettlebell" },
  { name: "Jumping Jack", muscleGroup: "fullbody", equipment: "Beban tubuh" },
  { name: "Bear Crawl", muscleGroup: "fullbody", equipment: "Beban tubuh" },
];

/** Nama sudah dipakai? (guard duplikat untuk pengembangan katalog) */
const seen = new Set<string>();
for (const it of EXERCISE_CATALOG) {
  const key = it.name.toLowerCase();
  if (seen.has(key)) {
    throw new Error(`Katalog gerakan duplikat: ${it.name}`);
  }
  seen.add(key);
}
