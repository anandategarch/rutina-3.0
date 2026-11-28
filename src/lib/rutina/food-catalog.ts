/**
 * Katalog makanan umum (data referensi aplikasi) — sumber acuan Rutina.
 *
 * Data ini diimpor otomatis ke tabel `FoodItem` saat katalog belum lengkap
 * (lihat GET /api/food-items) dan oleh scripts/seed.ts — sehingga saran
 * makanan di sheet Catat Asupan selalu terisi tanpa langkah manual,
 * di lingkungan mana pun (SQLite lokal maupun Turso).
 *
 * Semantik top-up: hanya nama yang belum ada yang diimpor, sehingga item
 * buatan pengguna dan riwayat asupan yang merujuk nama sama tidak tersentuh.
 */

export type FoodCatalogItem = {
  name: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  serving: string | null;
};

export const FOOD_CATALOG: FoodCatalogItem[] = [
  { name: "Nasi putih", calories: 205, protein: 4.3, carbs: 45, fat: 0.4, serving: "1 piring (100 g)" },
  { name: "Nasi goreng", calories: 350, protein: 8, carbs: 50, fat: 12, serving: "1 porsi" },
  { name: "Ayam goreng", calories: 260, protein: 22, carbs: 5, fat: 16, serving: "1 potong" },
  { name: "Ayam panggang", calories: 165, protein: 26, carbs: 0, fat: 6, serving: "1 potong (100 g)" },
  { name: "Telur rebus", calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, serving: "1 butir" },
  { name: "Telur dadar", calories: 154, protein: 9, carbs: 2, fat: 12, serving: "1 porsi" },
  { name: "Tempe goreng", calories: 120, protein: 10, carbs: 6, fat: 6, serving: "1 potong" },
  { name: "Tahu goreng", calories: 95, protein: 8, carbs: 3, fat: 5, serving: "2 potong" },
  { name: "Roti tawar", calories: 75, protein: 2.6, carbs: 14, fat: 1, serving: "1 lembar" },
  { name: "Mie instan", calories: 380, protein: 8, carbs: 55, fat: 15, serving: "1 bungkus" },
  { name: "Bakso sapi", calories: 280, protein: 15, carbs: 25, fat: 12, serving: "1 mangkuk" },
  { name: "Soto ayam", calories: 250, protein: 14, carbs: 20, fat: 11, serving: "1 mangkuk" },
  { name: "Gado-gado", calories: 290, protein: 10, carbs: 28, fat: 15, serving: "1 porsi" },
  { name: "Susu UHT full cream", calories: 150, protein: 8, carbs: 12, fat: 8, serving: "1 gelas (250 ml)" },
  { name: "Yogurt plain", calories: 95, protein: 6, carbs: 9, fat: 4, serving: "1 cup (150 g)" },
  { name: "Pisang", calories: 105, protein: 1.3, carbs: 27, fat: 0.4, serving: "1 buah" },
  { name: "Apel", calories: 95, protein: 0.5, carbs: 25, fat: 0.3, serving: "1 buah" },
  { name: "Pepaya", calories: 60, protein: 1, carbs: 15, fat: 0.4, serving: "1 potong (150 g)" },
  { name: "Mangga", calories: 100, protein: 1.4, carbs: 25, fat: 0.6, serving: "1 potong (150 g)" },
  { name: "Kopi susu gula aren", calories: 180, protein: 3, carbs: 24, fat: 7, serving: "1 gelas" },
  { name: "Es teh manis", calories: 90, protein: 0, carbs: 22, fat: 0, serving: "1 gelas" },
  { name: "Air mineral", calories: 0, protein: null, carbs: null, fat: null, serving: "1 gelas (250 ml)" },
  { name: "Whey protein", calories: 120, protein: 24, carbs: 3, fat: 1.5, serving: "1 scoop" },
  { name: "Oatmeal", calories: 150, protein: 5, carbs: 27, fat: 3, serving: "1 mangkuk (40 g)" },
  { name: "Kentang goreng", calories: 310, protein: 4, carbs: 40, fat: 15, serving: "1 porsi sedang" },
  { name: "Burger sapi", calories: 480, protein: 25, carbs: 40, fat: 24, serving: "1 buah" },
  { name: "Pizza pepperoni", calories: 300, protein: 13, carbs: 32, fat: 13, serving: "2 potong" },
  { name: "Martabak manis", calories: 450, protein: 8, carbs: 55, fat: 20, serving: "1 potong" },
  { name: "Rendang daging", calories: 330, protein: 18, carbs: 8, fat: 25, serving: "1 porsi" },
  { name: "Ikan goreng nila", calories: 220, protein: 24, carbs: 3, fat: 13, serving: "1 ekor sedang" },
];
