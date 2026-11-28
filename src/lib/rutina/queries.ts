"use client";

import type { QueryClient } from "@tanstack/react-query";

/**
 * Satu sumber kebenaran untuk invalidasi query setelah mutasi.
 *
 * Masalah sebelumnya: tiap layar meng-invalidasi set yang berbeda — delete workout
 * lupa stats, delete budget lupa home, dst → data lintas modul bisa mentok stale
 * (staleTime 15 dtk) dan angka di Stats/Beranda tidak sinkron.
 *
 * helper ini SELALU me-reset `home` + `stats` (modul agregat lintas data) plus
 * kunci modul yang diminta. Pakai di semua mutasi.
 */
export function invalidateAfterMutation(qc: QueryClient, keys: readonly string[]) {
  // audit E-F7: "day-detail" ikut selalu — drawer detail hari (Stats) menyimpan
  // salinan transaksi/latihan/jurnal di kunci terpisah; tanpa ini drawer bisa
  // menampilkan data basi tepat setelah user mencatat sesuatu.
  const all = new Set<string>(["home", "stats", "day-detail", ...keys]);
  return Promise.all(
    Array.from(all).map((key) => qc.invalidateQueries({ queryKey: [key] }))
  );
}
