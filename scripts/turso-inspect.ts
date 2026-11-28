/**
 * Inspeksi Turso (read-only): daftar tabel, jumlah baris, dan contoh data
 * keuangan — untuk mengaudit apa yang benar-benar ada di database produksi.
 * Pemakaian: bun scripts/turso-inspect.ts
 */
import { createClient } from "@libsql/client";

const URL = process.env.TURSO_DATABASE_URL ?? "";
const TOKEN = process.env.TURSO_AUTH_TOKEN ?? "";

if (!URL || !TOKEN) {
  console.error("Set TURSO_DATABASE_URL & TURSO_AUTH_TOKEN dulu.");
  process.exit(1);
}

const db = createClient({ url: URL, authToken: TOKEN });

async function main() {
  // 1. Daftar tabel
  const tables = await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  );
  const names = tables.rows.map((r) => String(r.name)).filter((n) => !n.startsWith("_"));
  console.log("TABEL:", names.join(", "));

  // 2. Jumlah baris per tabel
  for (const t of names) {
    try {
      const c = await db.execute(`SELECT COUNT(*) as n FROM "${t}"`);
      console.log(`  ${t}: ${c.rows[0].n}`);
    } catch (e) {
      console.log(`  ${t}: ERROR ${(e as Error).message}`);
    }
  }

  // 3. Kolom tabel keuangan
  for (const t of ["Budget", "Transaction", "Wallet", "SavingsGoal"]) {
    try {
      const cols = await db.execute(`PRAGMA table_info("${t}")`);
      console.log(
        `KOLOM ${t}:`,
        cols.rows.map((r) => `${r.name}:${r.type}`).join(" | ")
      );
    } catch {
      console.log(`KOLOM ${t}: tabel tidak ada`);
    }
  }
}

main();
