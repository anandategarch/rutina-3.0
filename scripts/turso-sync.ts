/**
 * Sinkronisasi schema Prisma → database Turso (libSQL remote).
 *
 * Cara kerja:
 * 1. Generate SQL DDL dari prisma/schema.prisma (`prisma migrate diff --from-empty`).
 * 2. Terapkan statement-per-statement ke Turso via @libsql/client.
 *
 * Aman untuk data: script ini HANYA membuat tabel/index/nilai default baru —
 * tabel lama (mis. legacy "rutina_*" dari aplikasi versi sebelumnya) tidak
 * disentuh dan data yang sudah ada tidak dihapus. Idempoten: tabel yang
 * sudah ada akan dilaporkan "sudah ada" tanpa mengubah isinya.
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

/* 2. Terapkan ke Turso ---------------------------------------------------- */
const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

let applied = 0;
const skipped: string[] = [];
const failed: string[] = [];

for (const stmt of statements) {
  const label = stmt.replace(/\s+/g, " ").slice(0, 64);
  try {
    await client.execute(stmt);
    applied++;
    console.log(`✓ ${label}…`);
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    if (/already exists/i.test(msg)) {
      skipped.push(label);
      console.log(`• (sudah ada) ${label}…`);
    } else {
      failed.push(`${label}… → ${msg}`);
    }
  }
}

console.log(`\nRingkasan: ${applied} diterapkan, ${skipped.length} sudah ada, ${failed.length} gagal.`);
if (failed.length) {
  console.error("\nGagal:");
  for (const f of failed) console.error("  - " + f);
  process.exit(1);
}
