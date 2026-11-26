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
  const all = new Set<string>(["home", "stats", ...keys]);
  return Promise.all(
    Array.from(all).map((key) => qc.invalidateQueries({ queryKey: [key] }))
  );
}
