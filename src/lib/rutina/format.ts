// ============ Rutina formatting & date helpers ============

/**
 * "Hari ini" untuk UI klien — disamakan dengan zona waktu server (Asia/Jakarta)
 * agar tanggal log/check-in konsisten antara klien dan API, apa pun TZ perangkat.
 */
export function todayStr(): string {
  return jakartaToday();
}

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "Hari ini" menurut zona waktu aplikasi (pengguna berada di Asia/Jakarta). */
export function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date()); // YYYY-MM-DD
}

/** Konversi timestamp (mis. createdAt) ke tanggal YYYY-MM-DD menurut zona WIB. */
export function jakartaDateStr(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d); // YYYY-MM-DD
}

/** Validasi string tanggal YYYY-MM-DD, termasuk cek tanggal benar-benar ada (bukan 2024-02-31). */
export function isValidDateStr(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** HH:MM sungguhan (00-23 : 00-59) — bukan hanya bentuknya. Dipakai POST & PATCH habit. */
export function isValidTimeStr(s: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(s)) return false;
  const [h, m] = s.split(":").map(Number);
  return h <= 23 && m <= 59;
}

export function addDays(s: string, delta: number): string {
  const d = parseDateStr(s);
  d.setDate(d.getDate() + delta);
  return toDateStr(d);
}

export function dayOfWeek(s: string): number {
  return parseDateStr(s).getDay(); // 0=Sun..6=Sat
}

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const DAY_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function dayName(s: string, short = false): string {
  const idx = dayOfWeek(s);
  return short ? DAY_SHORT[idx] : DAY_NAMES[idx];
}

export function formatDateID(s: string, withDay = false): string {
  const d = parseDateStr(s);
  const base = `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  return withDay ? `${dayName(s)}, ${base}` : base;
}

export function formatDayMonth(s: string): string {
  const d = parseDateStr(s);
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

export function monthName(m: number, short = false): string {
  return short ? MONTH_SHORT[m] : MONTH_NAMES[m];
}

export function greeting(): string {
  // Jam diambil dari zona waktu aplikasi (Asia/Jakarta) — bukan jam perangkat —
  // agar sapaan konsisten dengan tanggal log/check-in saat user bepergian.
  const h = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      hour: "numeric",
      hour12: false,
    }).format(new Date())
  );
  if (h >= 4 && h < 11) return "Selamat pagi";
  if (h >= 11 && h < 15) return "Selamat siang";
  if (h >= 15 && h < 18) return "Selamat sore";
  return "Selamat malam";
}

export function formatRupiah(n: number, opts?: { compact?: boolean }): string {
  if (!Number.isFinite(n)) return "Rp 0";
  const neg = n < 0;
  const abs = Math.abs(n);
  // Ambang 999.500 mencegah "Rp 1000 rb" / "Rp 1000,0 jt" pada nilai di bawah batas bulat
  if (opts?.compact && abs >= 999_500) {
    const v = abs / 1_000_000;
    return `${neg ? "-" : ""}Rp ${v.toFixed(v >= 10 ? 0 : 1).replace(".", ",")} jt`;
  }
  if (opts?.compact && abs >= 1_000) {
    const v = abs / 1_000;
    return `${neg ? "-" : ""}Rp ${v.toFixed(v >= 10 ? 0 : 1).replace(".", ",")} rb`;
  }
  const s = Math.round(abs).toLocaleString("id-ID");
  return `${neg ? "-" : ""}Rp ${s}`;
}

export function formatNumber(n: number, digits = 0): string {
  return n.toLocaleString("id-ID", { maximumFractionDigits: digits });
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h > 0) return m > 0 ? `${h}j ${m}m` : `${h}j`;
  return `${m}m`;
}

export function formatPace(minPerKm: number): string {
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  // Carry overflow: 5.9995 km/menit sebelumnya menghasilkan "5:60 /km"
  if (s >= 60) {
    return formatPace(m + 1);
  }
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

export function weekStart(s: string): string {
  const d = parseDateStr(s);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday start
  d.setDate(d.getDate() - diff);
  return toDateStr(d);
}

export function startOfMonth(s: string): string {
  return s.slice(0, 8) + "01";
}

export function daysBetween(a: string, b: string): number {
  const da = parseDateStr(a).getTime();
  const db = parseDateStr(b).getTime();
  return Math.round((db - da) / 86400000);
}

export function rangeDays(startStr: string, endStr: string): string[] {
  const out: string[] = [];
  let cur = startStr;
  while (cur <= endStr) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}
