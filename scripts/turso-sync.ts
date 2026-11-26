/**
 * Sinkronisasi schema Prisma → database Turso (libSQL remote).
 *
 * Cara kerja:
 * 1. Generate SQL DDL dari prisma/schema.prisma (`prisma migrate diff --from-empty`).
 * 2. Terapkan DDL ke Turso via @libsql/client — SEKALI batch() atomik (audit B1-B4),
 *    setelah objek yang "sudah ada" difilter dulu via sqlite_master.
 * 3. UNTUK TABEL LAMA: diff kolom via PRAGMA table_info lalu ALTER TABLE ADD COLUMN
 *    untuk kolom yang belum ada — tanpa langkah ini, kolom baru di schema diam-diam
 *    terlewat ("already exists") dan app error saat runtime di Turso.
 *
 * Aman untuk data: script ini HANYA membuat tabel/index/kolom/nilai default baru —
 * tabel lama (mis. legacy "rutina_*" dari aplikasi versi sebelumnya) tidak
 * disentuh dan data yang sudah ada tidak dihapus. Idempoten.
 *
 * Batas: kolom baru bertipe NOT NULL TANPA DEFAULT tidak bisa ditambahkan ke tabel
 * yang sudah berisi data (keterbatasan SQLite) → dilaporkan agar dimigrasi manual.
 *
 * Jalankan:
 *   TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." bun scripts/turso-sync.ts
 */
import { createClient } from "@libsql/client";
import { execSync } from "node:child_process";
import { readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error("✗ TURSO_DATABASE_URL belum diset. Contoh: libsql://nama-db-user.turso.io");
  process.exit(1);
}

/* 1. Generate SQL DDL dari schema Prisma --------------------------------- */
const tmpSql = join(tmpdir(), "rutina-turso-schema.sql");
execSync(
  `bunx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > ${tmpSql}`,
  { stdio: "inherit", cwd: process.cwd() },
);
const sqlScript = readFileSync(tmpSql, "utf8");
unlinkSync(tmpSql);

// DDL dari Prisma tidak memuat ';' di dalam string literal, jadi split pada
// ';' cukup aman untuk schema ini.
const statements = sqlScript
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

/* 1b. Parse definisi kolom per tabel (untuk diff kolom tabel lama) --------- */
const tableColumns = new Map<string, string[]>(); // table → [colDef, ...]
for (const stmt of statements) {
  if (!/^CREATE TABLE/i.test(stmt)) continue;
  const m = stmt.match(/CREATE TABLE\s+"?([A-Za-z_][A-Za-z0-9_]*)"?\s*\(([\s\S]*)\)\s*$/i);
  if (!m) continue;
  const table = m[1];
  const cols: string[] = [];
  for (const line of m[2].split("\n")) {
    const t = line.trim().replace(/,\s*$/, "");
    // Baris kolom selalu diawali kutip; baris constraint (PRIMARY KEY, FOREIGN
    // KEY, UNIQUE, CHECK) diabaikan — tidak relevan untuk ADD COLUMN.
    if (!t || !t.startsWith('"')) continue;
    const cm = t.match(/^"([^"]+)"\s+([\s\S]+)$/);
    if (!cm) continue;
    let def = cm[2];
    // PRIMARY KEY / AUTOINCREMENT inline tidak valid di ALTER TABLE ADD COLUMN
    def = def.replace(/\s+PRIMARY KEY\b/i, "").replace(/\s+AUTOINCREMENT\b/i, "");
    cols.push(`"${cm[1]}" ${def.trim()}`);
  }
  if (cols.length) tableColumns.set(table, cols);
}

/* 2. Terapkan ke Turso ---------------------------------------------------- */
const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

let applied = 0;
let columnsAdded = 0;
const skipped: string[] = [];
const failed: string[] = [];

/** Diff kolom tabel lama vs schema, lalu ADD COLUMN untuk yang hilang. */
async function syncMissingColumns(table: string): Promise<void> {
  const wanted = tableColumns.get(table) ?? [];
  if (wanted.length === 0) return;
  const info = await client.execute(`PRAGMA table_info("${table}")`);
  const have = new Set(info.rows.map((r) => String((r as Record<string, unknown>).name)));
  for (const colDef of wanted) {
    const colName = colDef.match(/^"([^"]+)"/)?.[1];
    if (!colName || have.has(colName)) continue;
    // SQLite menolak ADD COLUMN NOT NULL tanpa DEFAULT pada tabel berisi data
    if (/\bNOT NULL\b/i.test(colDef) && !/\bDEFAULT\b/i.test(colDef)) {
      failed.push(`${table}.${colName} → butuh migrasi manual (NOT NULL tanpa DEFAULT)`);
      continue;
    }
    try {
      await client.execute(`ALTER TABLE "${table}" ADD COLUMN ${colDef}`);
      columnsAdded++;
      console.log(`✓ kolom baru: ${table}.${colName}`);
    } catch (err2) {
      failed.push(`${table}.${colName} → ${(err2 as Error).message ?? String(err2)}`);
    }
  }
}

// audit B1-B4: batch() bersifat atomik — satu statement yang gagal membatalkan
// seluruh batch, jadi statement yang akan gagal "already exists" HARUS difilter dulu
// (bukan ditangkap per-statement seperti dulu) lewat daftar objek di sqlite_master.
const existingObjects = new Set<string>();
let masterOk = false;
try {
  const master = await client.execute(
    `SELECT name FROM sqlite_master WHERE type IN ('table','index')`
  );
  for (const row of master.rows) {
    const name = (row as Record<string, unknown>).name;
    if (typeof name === "string") existingObjects.add(name);
  }
  masterOk = true;
} catch (err) {
  failed.push(`sqlite_master → ${(err as Error).message ?? String(err)}`);
}

const pending: string[] = [];
if (masterOk) {
  for (const stmt of statements) {
    const label = stmt.replace(/\s+/g, " ").slice(0, 64);
    const table = stmt.match(/CREATE TABLE\s+"?([A-Za-z_][A-Za-z0-9_]*)"?/i)?.[1];
    // Nama index Prisma bisa memuat titik (mis. "Wallet.id_key")
    const index = stmt.match(/CREATE (?:UNIQUE )?INDEX\s+"?([A-Za-z0-9_.]+)"?/i)?.[1];
    if ((table && existingObjects.has(table)) || (index && existingObjects.has(index))) {
      skipped.push(label);
      console.log(`• (sudah ada) ${label}…`);
      // Tabel lama: cek kolom baru yang belum ada di Turso
      if (table) {
        try {
          await syncMissingColumns(table);
        } catch (err3) {
          failed.push(`PRAGMA ${table} → ${(err3 as Error).message ?? String(err3)}`);
        }
      }
      continue;
    }
    pending.push(stmt);
  }

  // audit B1-B4: seluruh DDL baru diterapkan SEKALIGUS via batch() — atomik;
  // kegagalan satu statement mengembalikan seluruh batch (tidak ada schema setengah jadi).
  if (pending.length > 0) {
    try {
      await client.batch(pending, "write");
      applied = pending.length;
      for (const stmt of pending) {
        console.log(`✓ ${stmt.replace(/\s+/g, " ").slice(0, 64)}…`);
      }
    } catch (err) {
      failed.push(`batch DDL → ${(err as Error).message ?? String(err)}`);
    }
  }
}

console.log(
  `\nRingkasan: ${applied} diterapkan, ${skipped.length} sudah ada, ${columnsAdded} kolom baru ditambahkan, ${failed.length} gagal.`
);
if (failed.length) {
  console.error("\nGagal:");
  for (const f of failed) console.error("  - " + f);
  process.exit(1);
}
