/**
 * Migrasi TAMBAHAN Rutina 2.0 → 3.0 — data yang terlewat oleh
 * scripts/turso-migrate-legacy.ts (kategori keuangan, jurnal, asupan
 * makanan, rangkaian kebiasaan, suara identitas).
 *
 * Yang diimpor (semua ADDITIF & IDEMPOTEN — aman re-run, tidak pernah
 * menghapus/menimpa data yang sudah ada di database 3.0):
 *   1. rutina_fin_categories  → FinanceCategory (kategori keuangan buatan)
 *   2. Katalog kategori legacy Rutina 1.0/2.0 (kopi, jajan, bensin, dst.)
 *      yang tidak ada di daftar bawaan 3.0 → FinanceCategory
 *   3. rutina_journal_notes   → JournalEntry (jurnal!)
 *   4. rutina_food_entries    → FoodEntry (asupan makanan)
 *   5. rutina_habits.afterId  → Habit.stackAfter (rangkaian kebiasaan)
 *   6. app.identityText       → Profile.identityVoice (bila masih default)
 *
 * Yang TIDAK bisa diimpor (tidak punya padanan di schema 3.0) — dilaporkan
 * jelas di ringkasan akhir: rutina_habit_groups, goals.contributions,
 * app.catRenames, app.hiddenCats, app.fitTargets, app.calorieTarget,
 * app.bonusClaimedOn, app.deloadUntil.
 *
 * Sumber data legacy: LEGACY_DATABASE_URL + LEGACY_AUTH_TOKEN
 * (fallback ke TURSO_DATABASE_URL/TURSO_AUTH_TOKEN). Mendukung `file:` URL
 * untuk uji lokal. Target: env aktif @/lib/db (Turso atau SQLite lokal).
 *
 * Jalankan:
 *   LEGACY_DATABASE_URL="libsql://..." LEGACY_AUTH_TOKEN="..." \
 *   TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." \
 *   bun scripts/turso-migrate-missing.ts
 */
import { createClient, type Client } from "@libsql/client";
import { db } from "@/lib/db";

/* ---------------- koneksi legacy ---------------- */

const legacyUrl = process.env.LEGACY_DATABASE_URL ?? process.env.TURSO_DATABASE_URL;
if (!legacyUrl) {
  console.error("✗ LEGACY_DATABASE_URL (atau TURSO_DATABASE_URL) belum diset.");
  process.exit(1);
}
const legacyToken = process.env.LEGACY_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;
const legacy: Client = createClient({
  url: legacyUrl,
  authToken: legacyToken || undefined,
});

/** Baca seluruh baris tabel legacy (array ber-index, selaras script lama). */
async function q(sql: string) {
  const res = await legacy.execute(sql);
  return res.rows;
}
const val = (r: unknown, i: number): string | number | bigint | ArrayBuffer | null => {
  const raw = r as unknown[];
  const v: unknown = raw?.[i];
  if (v === null || v === undefined) return null;
  if (typeof v === "string" || typeof v === "number" || typeof v === "bigint") return v;
  if (v instanceof ArrayBuffer) return v;
  return String(v);
};
const str = (r: unknown, i: number): string | null => {
  const v = val(r, i);
  return v === null || v === undefined ? null : String(v);
};
const num = (r: unknown, i: number): number | null => {
  const v = val(r, i);
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/* ---------------- katalog kategori legacy ---------------- */

/**
 * Katalog kategori Rutina 2.0 (bawaan 2.0 + impor Rutina 1.0) yang tidak
 * ada di 3.0 — label persis seperti aplikasi lama (termasuk ejaan khas
 * pengguna: "Cathering", "Loundry") agar data terasa seperti milik sendiri.
 * id = slug legacy → re-run idempoten.
 */
const LEGACY_CATALOG: Array<{ id: string; name: string; type: "expense" | "income" }> = [
  { id: "kopi", name: "Kopi", type: "expense" },
  { id: "makanan-berat", name: "Makanan Berat", type: "expense" },
  { id: "jajan", name: "Jajan", type: "expense" },
  { id: "cathering", name: "Cathering", type: "expense" },
  { id: "bensin", name: "Bensin", type: "expense" },
  { id: "parkir", name: "Parkir", type: "expense" },
  { id: "pajak-motor", name: "Pajak Motor", type: "expense" },
  { id: "servis-motor", name: "Servis Motor", type: "expense" },
  { id: "loundry", name: "Loundry", type: "expense" },
  { id: "dating", name: "Dating", type: "expense" },
  { id: "badminton", name: "Badminton", type: "expense" },
  { id: "tagihan-utilitas", name: "Tagihan & Utilitas", type: "expense" },
  { id: "tagihan-air", name: "Tagihan Air", type: "expense" },
  { id: "tagihan-listrik", name: "Tagihan Listrik", type: "expense" },
  { id: "pulsa-data", name: "Pulsa & Paket Data", type: "expense" },
  { id: "skin-care", name: "Skin Care", type: "expense" },
  { id: "potong-rambut", name: "Potong Rambut", type: "expense" },
  { id: "hutang", name: "Hutang", type: "expense" },
  { id: "iuran-kas", name: "Iuran Kas", type: "expense" },
  { id: "tak-terduga", name: "Tak Terduga", type: "expense" },
  { id: "pendidikan", name: "Pendidikan", type: "expense" },
  { id: "lifestyle", name: "Lifestyle", type: "expense" },
  { id: "bonus", name: "Bonus", type: "income" },
  { id: "proyek", name: "Proyek", type: "income" },
  { id: "investasi", name: "Investasi", type: "income" },
  { id: "penghasilan", name: "Penghasilan", type: "income" },
];

/* ---------------- pemetaan nilai ---------------- */

/** Folder jurnal 2.0 (kerja|ide|bacaan|pribadi) → folder 3.0. */
const FOLDER_MAP: Record<string, string> = {
  kerja: "Umum",
  ide: "Ide",
  bacaan: "Sorotan",
  pribadi: "Refleksi",
};

/** Tone jurnal 2.0 (0..2 — indeks MOODS: Ceria|Baik|Biasa) → mood 3.0. */
const TONE_MAP: Record<number, string> = {
  0: "great",
  1: "good",
  2: "neutral",
};

/** Slot makan 2.0 (sarapan|makan siang|makan malam|camilan) → 3.0. */
const MEAL_MAP: Record<string, string> = {
  sarapan: "breakfast",
  "makan siang": "lunch",
  "makan malam": "dinner",
  camilan: "snack",
};

/** Tanggal ISO atau label verbatim ("15 Jun") → ISO, null bila tak terbaca. */
function toIsoDate(raw: string | null): string | null {
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // "YYYY-MM-DD..." (datetime) → ambil bagian tanggalnya
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})T?/);
  if (m) return m[1];
  return null;
}

const nowIso = () => new Date().toISOString();

/* ---------------- utama ---------------- */

async function main() {
  console.log("⏳ Membaca data legacy…");

  /* 1+2. Kategori keuangan -------------------------------------------- */
  const existingCats = await db.financeCategory.findMany({ select: { id: true, name: true } });
  const haveCatId = new Set(existingCats.map((c) => c.id));
  const haveCatNameLower = new Set(existingCats.map((c) => c.name.trim().toLowerCase()));

  let catImported = 0;
  const catRows: Array<{ id: string; name: string; type: string; archived: boolean }> = [];

  // 1a. Katalog kategori legacy (kopi, jajan, bensin, …)
  for (const cat of LEGACY_CATALOG) {
    if (haveCatId.has(cat.id)) continue;
    if (haveCatNameLower.has(cat.name.toLowerCase())) continue;
    catRows.push({ id: cat.id, name: cat.name, type: cat.type, archived: false });
    haveCatId.add(cat.id);
    haveCatNameLower.add(cat.name.toLowerCase());
    catImported++;
  }

  // 1b. Kategori buatan pengguna dari tabel rutina_fin_categories
  let finCatRows: unknown[] = [];
  try {
    finCatRows = await q("SELECT id, name, type, archived FROM rutina_fin_categories");
  } catch {
    console.log("   (tabel rutina_fin_categories tidak ada — lewati)");
  }
  let userCatImported = 0;
  for (const r of finCatRows) {
    const id = str(r, 0);
    const name = str(r, 1)?.trim();
    const typeRaw = str(r, 2);
    const archived = num(r, 3) === 1 || str(r, 3) === "true";
    if (!id || !name) continue;
    const type = typeRaw === "masuk" ? "income" : typeRaw === "keluar" ? "expense" : null;
    if (!type) continue;
    if (haveCatId.has(id)) continue;
    if (haveCatNameLower.has(name.toLowerCase())) continue;
    catRows.push({ id, name, type, archived });
    haveCatId.add(id);
    haveCatNameLower.add(name.toLowerCase());
    userCatImported++;
    catImported++;
  }

  // 1c. Tabel kategori terpadu legacy Rutina 2.0 — finance_categories
  // (snake_case; inilah sumber data kategori asli di DB produksi —
  // rutina_fin_categories di sana kosong). Kolom: id, name, emoji, color,
  // type (sudah expense|income), sort_order, created_at, updated_at —
  // tanpa kolom archived (semua baris aktif).
  let unifiedRows: unknown[] = [];
  try {
    unifiedRows = await q(
      "SELECT id, name, type, sort_order FROM finance_categories ORDER BY sort_order"
    );
  } catch {
    console.log("   (tabel finance_categories tidak ada — lewati)");
  }
  let unifiedImported = 0;
  for (const r of unifiedRows) {
    const id = str(r, 0);
    const name = str(r, 1)?.trim();
    const typeRaw = str(r, 2);
    if (!id || !name) continue;
    const type = typeRaw === "income" ? "income" : typeRaw === "expense" ? "expense" : null;
    if (!type) continue;
    if (haveCatId.has(id)) continue;
    if (haveCatNameLower.has(name.toLowerCase())) continue;
    catRows.push({ id, name, type, archived: false });
    haveCatId.add(id);
    haveCatNameLower.add(name.toLowerCase());
    unifiedImported++;
    catImported++;
  }
  if (catRows.length) {
    await db.financeCategory.createMany({ data: catRows });
  }
  console.log(`📦 Kategori keuangan: +${catImported} (katalog legacy: ${catImported - userCatImported - unifiedImported}, buatan pengguna: ${userCatImported}, finance_categories legacy: ${unifiedImported})`);

  /* 3. Jurnal ---------------------------------------------------------- */
  let noteRows: unknown[] = [];
  try {
    noteRows = await q(
      "SELECT id, title, body, date, pinned, tone, folder FROM rutina_journal_notes"
    );
  } catch {
    console.log("   (tabel rutina_journal_notes tidak ada — lewati)");
  }
  const existingNoteIds = new Set(
    (await db.journalEntry.findMany({ select: { id: true } })).map((n) => n.id)
  );
  let journalImported = 0;
  const journalRows: Array<{
    id: string; title: string; content: string; folder: string; mood: string | null;
    pinned: boolean; wordCount: number; createdAt: Date; updatedAt: Date;
  }> = [];
  for (const r of noteRows) {
    const id = str(r, 0);
    if (!id || existingNoteIds.has(id)) continue;
    const body = str(r, 2) ?? "";
    const dateIso = toIsoDate(str(r, 3));
    const folderRaw = (str(r, 6) ?? "").toLowerCase();
    const tone = num(r, 5) ?? 0;
    const pinned = str(r, 4) === "1" || str(r, 4) === "true" || num(r, 4) === 1;
    journalRows.push({
      id,
      title: (str(r, 1) ?? "").slice(0, 200),
      content: body,
      folder: FOLDER_MAP[folderRaw] ?? "Umum",
      mood: TONE_MAP[tone] ?? "neutral",
      pinned,
      wordCount: body.trim() ? body.trim().split(/\s+/).length : 0,
      createdAt: dateIso ? new Date(`${dateIso}T12:00:00.000Z`) : new Date(nowIso()),
      updatedAt: dateIso ? new Date(`${dateIso}T12:00:00.000Z`) : new Date(nowIso()),
    });
    journalImported++;
  }
  if (journalRows.length) {
    await db.journalEntry.createMany({ data: journalRows });
  }
  console.log(`📦 Jurnal: +${journalImported} dari ${noteRows.length} catatan legacy`);

  /* 4. Asupan makanan --------------------------------------------------- */
  let foodRows: unknown[] = [];
  try {
    foodRows = await q(
      "SELECT id, date, name, cat, unit, portion, meal, kcal, protein, carb, fat FROM rutina_food_entries"
    );
  } catch {
    console.log("   (tabel rutina_food_entries tidak ada — lewati)");
  }
  const existingFoodIds = new Set(
    (await db.foodEntry.findMany({ select: { id: true } })).map((f) => f.id)
  );
  let foodImported = 0;
  let foodDropped = 0;
  const foodData: Array<{
    id: string; name: string; portion: string | null; calories: number;
    protein: number | null; carbs: number | null; fat: number | null;
    meal: string; date: string; createdAt: Date;
  }> = [];
  for (const r of foodRows) {
    const id = str(r, 0);
    if (!id || existingFoodIds.has(id)) continue;
    const dateIso = toIsoDate(str(r, 1));
    const name = str(r, 2)?.trim();
    const kcal = num(r, 7) ?? 0;
    if (!name || !dateIso) {
      foodDropped++;
      continue;
    }
    const portion = num(r, 5);
    const unit = str(r, 4);
    const mealRaw = (str(r, 6) ?? "").toLowerCase();
    foodData.push({
      id,
      name: name.slice(0, 120),
      portion: portion !== null && unit ? `${portion} ${unit}` : unit ?? (portion !== null ? String(portion) : null),
      calories: kcal,
      protein: num(r, 8),
      carbs: num(r, 9),
      fat: num(r, 10),
      meal: MEAL_MAP[mealRaw] ?? "lunch",
      date: dateIso,
      createdAt: new Date(`${dateIso}T12:00:00.000Z`),
    });
    foodImported++;
  }
  if (foodData.length) {
    await db.foodEntry.createMany({ data: foodData });
  }
  console.log(`📦 Asupan makanan: +${foodImported} dari ${foodRows.length} entri legacy (dibuang tanpa nama/tanggal: ${foodDropped})`);

  /* 5. Rangkaian kebiasaan (afterId → stackAfter) ----------------------- */
  let habitRows: unknown[] = [];
  try {
    habitRows = await q("SELECT id, title, afterId FROM rutina_habits");
  } catch {
    console.log("   (tabel rutina_habits tidak ada — lewati)");
  }
  const titleById = new Map<string, string>();
  for (const r of habitRows) {
    const id = str(r, 0);
    const title = str(r, 1);
    if (id && title) titleById.set(id, title);
  }
  const habits30 = await db.habit.findMany({ select: { id: true, name: true, stackAfter: true } });
  const habitNameById = new Map(habits30.map((h) => [h.id, h.name]));
  let stackLinked = 0;
  for (const h of habits30) {
    if (h.stackAfter) continue; // tidak menimpa yang sudah diset pengguna
    // Rangkaian legacy disimpan sebagai id habit → cari judulnya lewat nama
    // habit 3.0 (id legacy dipertahankan saat migrasi pertama).
    const afterIdRaw = habitRows.find((r) => str(r, 0) === h.id);
    const afterId = afterIdRaw ? str(afterIdRaw, 2) : null;
    if (!afterId) continue;
    const targetName = habitNameById.get(afterId) ?? titleById.get(afterId) ?? null;
    if (!targetName) continue;
    await db.habit.update({ where: { id: h.id }, data: { stackAfter: targetName } });
    stackLinked++;
  }
  console.log(`📦 Rangkaian kebiasaan (stackAfter): ${stackLinked} habit terhubung`);

  /* 6. Suara Identitas --------------------------------------------------- */
  let settingRows: unknown[] = [];
  try {
    settingRows = await q("SELECT key, value FROM rutina_app_settings");
  } catch {
    console.log("   (tabel rutina_app_settings tidak ada — lewati)");
  }
  const setting = (key: string): string | null => {
    const row = settingRows.find((r) => str(r, 0) === key);
    return row ? str(row, 1) : null;
  };
  const identityText = setting("app.identityText");
  let voiceUpdated = 0;
  if (identityText && identityText.trim()) {
    const profile = await db.profile.findUnique({ where: { id: "main" } });
    const DEFAULT_VOICE =
      "Aku adalah orang yang konsisten, disiplin, dan tumbuh setiap hari.";
    if (!profile) {
      // Baris profil belum ada (DB baru) — buat langsung dengan teks legacy.
      await db.profile.create({ data: { id: "main", identityVoice: identityText.slice(0, 600) } });
      voiceUpdated = 1;
    } else if (profile.identityVoice === DEFAULT_VOICE) {
      // Hanya isi bila pengguna belum mengubah suara identitas di 3.0.
      await db.profile.update({ where: { id: "main" }, data: { identityVoice: identityText.slice(0, 600) } });
      voiceUpdated = 1;
    }
  }
  console.log(`📦 Suara Identitas: ${voiceUpdated ? "dimigrasi dari app.identityText" : "dilewati (sudah diubah pengguna / tidak ada di legacy)"}`);

  /* ---------------- ringkasan ---------------- */

  console.log("\n⚠️  Data legacy yang TIDAK terimpor (tidak punya padanan di schema 3.0):");
  console.log("   - rutina_habit_groups   (kelompok kebiasaan custom)");
  console.log("   - goals.contributions   (riwayat setor target — totalnya sudah di currentAmount)");
  console.log("   - app.catRenames        (label ubahan kategori bawaan)");
  console.log("   - app.hiddenCats        (kategori bawaan yang disembunyikan)");
  console.log("   - app.fitTargets        (sasaran bugar terperinci)");
  console.log("   - app.calorieTarget     (target kalori)");
  console.log("   - app.bonusClaimedOn / app.deloadUntil (penanda status)");

  const [nCat, nJournal, nFood] = await Promise.all([
    db.financeCategory.count(),
    db.journalEntry.count(),
    db.foodEntry.count(),
  ]);
  console.log("\n✅ Migrasi tambahan selesai:");
  console.log(`   FinanceCategory : ${nCat} total (+${catImported} baru)`);
  console.log(`   JournalEntry    : ${nJournal} total (+${journalImported} baru)`);
  console.log(`   FoodEntry       : ${nFood} total (+${foodImported} baru)`);
  console.log(`   stackAfter      : ${stackLinked} habit`);
  console.log(`   identityVoice   : ${voiceUpdated ? "diperbarui" : "tetap"}`);

  await db.$disconnect();
  legacy.close();
}

main().catch(async (e) => {
  console.error("✗ Migrasi gagal:", e);
  await db.$disconnect().catch(() => {});
  process.exit(1);
});
