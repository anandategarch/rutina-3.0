"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* ============================================================
   RUTINA CHART KIT — lightweight pure-SVG data visualizations.
   Palette discipline: sage ramp for primary data, clay only for
   negative/outflow semantics, neutral gray for baselines.
   ============================================================ */

export const RAMP = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-neutral)",
] as const;

export const INK = "var(--foreground)";
export const SAGE = "var(--primary)";
export const SAGE_DEEP = "var(--chart-1)";
export const CLAY = "var(--chart-out)";
export const NEUTRAL = "var(--chart-neutral)";

/** Monochrome ramp color for category i of n. */
export function rampColor(i: number, n: number): string {
  if (n <= 1) return RAMP[1];
  const idx = Math.min(RAMP.length - 1, Math.floor((i / Math.max(1, n - 1)) * (RAMP.length - 1)));
  return RAMP[idx];
}

/** Ringkasan data untuk aria-label chart agar makna tren terbaca screen reader
 *  dan tetap tersedia tanpa penglihatan (ux-guidelines: text alternatives). */
function fmtNum(v: number): string {
  return Math.round(v * 10) / 10 + "";
}

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

/* ============ Sparkline — compact trend ============ */

export function Sparkline({
  data,
  height = 40,
  color = SAGE,
  strokeWidth = 2,
  showDot = true,
  area = true,
  className,
}: {
  data: number[];
  height?: number;
  color?: string;
  strokeWidth?: number;
  showDot?: boolean;
  area?: boolean;
  className?: string;
}) {
  const w = 100;
  const h = height;
  const id = React.useId();
  const vals = data.length ? data : [0, 0];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const pad = strokeWidth + 2;
  const pts = vals.map((v, i) => ({
    x: (i / Math.max(1, vals.length - 1)) * w,
    y: pad + (1 - (v - min) / span) * (h - pad * 2),
  }));
  const line = buildSmoothPath(pts);
  const last = pts[pts.length - 1];
  // Tren diringkas jadi teks — sparkline murni visual, tanpa alternatif teks
  // makna naik/turun tak terjangkau screen reader.
  const trendWord = min === max ? "tetap" : vals[vals.length - 1] > vals[0] ? "naik" : "turun";
  const trendLabel =
    data.length < 2
      ? "Grafik tren"
      : `Tren ${trendWord}: dari ${fmtNum(vals[0])} ke ${fmtNum(vals[vals.length - 1])}`;
  return (
    <div className={cn("relative w-full", className)} style={{ height }} role="img" aria-label={trendLabel}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="w-full overflow-visible"
        style={{ height }}
        aria-hidden="true"
      >
        {area && (
          <>
            <defs>
              <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={`${line} L ${w} ${h} L 0 ${h} Z`} fill={`url(#spark-${id})`} stroke="none" />
          </>
        )}
        <path d={line} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {showDot && last && (
        // Titik akhir digambar sebagai elemen HTML agar tidak melar kena preserveAspectRatio="none"
        <span
          aria-hidden="true"
          className="absolute h-1.5 w-1.5 rounded-full -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${(last.x / w) * 100}%`,
            top: `${(last.y / h) * 100}%`,
            background: color,
          }}
        />
      )}
    </div>
  );
}

/* ============ MiniBars — vertical bar chart (1–2 series) ============ */

export function MiniBars({
  data,
  height = 72,
  color = SAGE,
  altColor = NEUTRAL,
  showAlt = false,
  labelEvery = 1,
  showLabels = true,
  highlightIndex,
  altLabel,
  className,
}: {
  data: { label: string; value: number; alt?: number }[];
  height?: number;
  color?: string;
  altColor?: string;
  showAlt?: boolean;
  labelEvery?: number;
  showLabels?: boolean;
  highlightIndex?: number;
  /** Nama seri kedua (untuk legend + aria-label) saat showAlt aktif. */
  altLabel?: string;
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, showAlt ? d.alt ?? 0 : 0)));
  // aria-label berisi data per kolom — nilai hanya via title() tidak terjangkau
  // screen reader maupun sentuhan (title tidak ada di layar sentuh).
  const summary = data
    .map((d) => `${d.label} ${fmtNum(d.value)}${showAlt ? ` / ${fmtNum(d.alt ?? 0)}` : ""}`)
    .join(", ");
  const seriesSuffix = showAlt && altLabel ? ` (dua seri: utama & ${altLabel})` : "";
  // ux #13: tinggi final per batang hidup di wrapper (layout statis, rounded di
  // wrapper); fill bottom-anchor dianimasikan lewat scaleY(origin bottom) —
  // prop layout (height) tidak lagi masuk daftar transisi. Saat mount & saat
  // data berubah, scale mulai dari rasio tinggi lama→baru lalu di-flip ke 1
  // lewat rAF (bukan animationend — ux #119) sehingga batang tetap naik/morph
  // mulus; reduced-motion dinetralkan clamp global globals.css sehingga data
  // tetap terbaca segera (quick-ref animation-optional).
  const barPct = data.map((d) => ({
    main: d.value === 0 ? (2 / height) * 100 : Math.max(3, (d.value / max) * 100),
    alt: (d.alt ?? 0) === 0 ? (2 / height) * 100 : Math.max(3, ((d.alt ?? 0) / max) * 100),
  }));
  const barSig = barPct.map((p) => `${p.main.toFixed(3)}/${p.alt.toFixed(3)}`).join(",");
  // prev disimpan sebagai state (bukan ref) agar tidak dibaca saat render
  // (react-hooks/refs); guard settledSig mencegah loop re-render.
  const [prevBarPct, setPrevBarPct] = React.useState<{ main: number; alt: number }[] | null>(null);
  const [barSettledSig, setBarSettledSig] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (barSettledSig === barSig) return;
    const id = requestAnimationFrame(() => {
      setPrevBarPct(barPct);
      setBarSettledSig(barSig);
    });
    return () => cancelAnimationFrame(id);
  }, [barSig, barPct, barSettledSig]);
  const barsSettled = barSettledSig === barSig;
  const barScale = (i: number, key: "main" | "alt"): number => {
    if (barsSettled) return 1;
    const prev = prevBarPct?.[i]?.[key];
    const cur = barPct[i]?.[key] ?? 0;
    return prev == null || cur <= 0 ? 0 : Math.min(1, prev / cur);
  };
  const barTransition = barsSettled
    ? "transform var(--motion-base) var(--ease-out), opacity var(--motion-base) var(--ease-out)"
    : "none";
  return (
    <div className={cn("w-full", className)}>
      {showAlt && altLabel && (
        <div className="flex items-center gap-4 mb-1.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2 w-2 rounded-sm" style={{ background: color }} />
            Utama
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2 w-2 rounded-sm" style={{ background: altColor }} />
            {altLabel}
          </span>
        </div>
      )}
      <div className="flex items-end gap-[2px]" style={{ height }} role="img" aria-label={`Grafik batang${seriesSuffix}: ${summary}`}>
        {data.map((d, i) => {
          const hl = highlightIndex === i;
          return (
            <div key={i} className="flex-1 flex items-end justify-center gap-[2px] h-full" style={{ height }}>
              <div
                className="relative w-full max-w-[14px] overflow-hidden rounded-t-[4px]"
                style={{
                  // Nilai nol = "tidak tercatat": slot dasar 2px samar, bukan stub penuh
                  height: d.value === 0 ? 2 : `${barPct[i].main}%`,
                }}
                title={d.label}
              >
                <div
                  className="absolute inset-x-0 bottom-0 h-full rounded-t-[4px]"
                  style={{
                    background: color,
                    opacity: hl ? 1 : d.value === 0 ? 0.18 : 0.75,
                    transform: `scaleY(${barScale(i, "main")})`,
                    transformOrigin: "bottom",
                    transition: barTransition,
                  }}
                />
              </div>
              {showAlt && (
                <div
                  className="relative w-full max-w-[14px] overflow-hidden rounded-t-[4px]"
                  style={{ height: (d.alt ?? 0) === 0 ? 2 : `${barPct[i].alt}%` }}
                  title={d.label}
                >
                  <div
                    className="absolute inset-x-0 bottom-0 h-full rounded-t-[4px]"
                    style={{
                      background: altColor,
                      opacity: hl ? 1 : (d.alt ?? 0) === 0 ? 0.18 : 0.75,
                      transform: `scaleY(${barScale(i, "alt")})`,
                      transformOrigin: "bottom",
                      transition: barTransition,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {showLabels && (
        <div className="flex mt-1.5">
          {data.map((d, i) => (
            <div
              key={i}
              className="flex-1 text-center text-xs text-muted-foreground tabular"
              style={{ visibility: i % labelEvery === 0 ? "visible" : "hidden" }}
            >
              {d.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============ Donut — composition ring ============ */

export function Donut({
  slices,
  size = 128,
  thickness = 15,
  center,
  className,
}: {
  slices: { label: string; value: number; color?: string }[];
  size?: number;
  thickness?: number;
  center?: React.ReactNode;
  className?: string;
}) {
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const segs = slices.map((s, i) => {
    const frac = Math.max(0, s.value) / total;
    const seg = {
      key: i,
      dash: frac * c,
      offset: -(slices.slice(0, i).reduce((a, x) => a + Math.max(0, x.value), 0) / total) * c,
      cap: frac > 0.985 ? ("butt" as const) : ("round" as const),
      color: s.color ?? rampColor(i, slices.length),
    };
    return seg;
  });
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      {/* Label berisi komposisi perslice — agar tidak bergantung warna/hover saja */}
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        role="img"
        aria-label={`Grafik komposisi: ${slices
          .filter((s) => s.value > 0)
          .map((s) => `${s.label} ${Math.round((s.value / total) * 100)}%`)
          .join(", ") || "belum ada data"}`}
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--secondary)" strokeWidth={thickness} />
        {segs.map((seg) => (
          <circle
            key={seg.key}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={thickness}
            strokeDasharray={`${seg.dash} ${c - seg.dash}`}
            strokeDashoffset={seg.offset}
            strokeLinecap={seg.cap}
          />
        ))}
      </svg>
      {center && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>}
    </div>
  );
}

/* ============ StackBar — horizontal composition ============ */

export function StackBar({
  segments,
  height = 10,
  className,
}: {
  segments: { label: string; value: number; color?: string }[];
  height?: number;
  className?: string;
}) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0) || 1;
  // ux #13: lebar final tiap segmen ada di wrapper (statis); fill-nya
  // dianimasikan scaleX (origin kiri). transition-all diganti per-properti
  // (transform + background-color) — prop layout tidak lagi ikut teranimasi.
  const segPct = segments.map((s) => (Math.max(0, s.value) / total) * 100);
  const segSig = segPct.map((p) => p.toFixed(3)).join(",");
  // prev sebagai state, bukan ref — aman untuk render (react-hooks/refs).
  const [prevSegPct, setPrevSegPct] = React.useState<number[] | null>(null);
  const [segSettledSig, setSegSettledSig] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (segSettledSig === segSig) return;
    const id = requestAnimationFrame(() => {
      setPrevSegPct(segPct);
      setSegSettledSig(segSig);
    });
    return () => cancelAnimationFrame(id);
  }, [segSig, segPct, segSettledSig]);
  const segSettled = segSettledSig === segSig;
  return (
    <div
      className={cn("flex w-full overflow-hidden rounded-full bg-secondary", className)}
      style={{ height }}
      role="img"
      aria-label={`Komposisi: ${segments
        .filter((s) => s.value > 0)
        .map((s) => `${s.label} ${Math.round((Math.max(0, s.value) / total) * 100)}%`)
        .join(", ") || "belum ada data"}`}
    >
      {segments.map((s, i) => {
        const scale = segSettled
          ? 1
          : prevSegPct && segPct[i] > 0
            ? Math.min(1, (prevSegPct[i] ?? 0) / segPct[i])
            : 0;
        return (
          <div
            key={i}
            className="h-full"
            style={{ width: `${segPct[i]}%` }}
            title={`${s.label}: ${((Math.max(0, s.value) / total) * 100).toFixed(0)}%`}
          >
            <div
              className="h-full w-full"
              style={{
                background: s.color ?? rampColor(i, segments.length),
                transform: `scaleX(${scale})`,
                transformOrigin: "left",
                transition: segSettled
                  ? "transform var(--motion-base) var(--ease-out), background-color var(--motion-base) var(--ease-out)"
                  : "none",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

/* ============ HBarList — labeled horizontal bars ============ */

export function HBarList({
  items,
  color = SAGE,
  height = 8,
  className,
}: {
  items: { label: string; value: number; max?: number; color?: string; caption?: string }[];
  color?: string;
  height?: number;
  className?: string;
}) {
  const max = Math.max(1, ...items.map((it) => it.max ?? it.value));
  // ux #13: pola wrapper-final + fill scaleX (origin kiri), sama seperti
  // MetricBar — transition-all (width layout) diganti per-properti.
  const widths = items.map((it) => Math.min(100, (it.value / max) * 100));
  const widthSig = widths.map((p) => p.toFixed(3)).join(",");
  // prev sebagai state, bukan ref — aman untuk render (react-hooks/refs).
  const [prevWidths, setPrevWidths] = React.useState<number[] | null>(null);
  const [widthSettledSig, setWidthSettledSig] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (widthSettledSig === widthSig) return;
    const id = requestAnimationFrame(() => {
      setPrevWidths(widths);
      setWidthSettledSig(widthSig);
    });
    return () => cancelAnimationFrame(id);
  }, [widthSig, widths, widthSettledSig]);
  const widthsSettled = widthSettledSig === widthSig;
  return (
    <div className={cn("space-y-2.5", className)}>
      {items.map((it, i) => {
        const scale = widthsSettled
          ? 1
          : prevWidths && widths[i] > 0
            ? Math.min(1, (prevWidths[i] ?? 0) / widths[i])
            : 0;
        return (
          <div key={i}>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-xs font-medium text-foreground truncate">{it.label}</span>
              <span className="text-xs text-muted-foreground tabular shrink-0">{it.caption ?? it.value}</span>
            </div>
            <div className="rounded-full bg-secondary overflow-hidden" style={{ height }}>
              <div className="h-full" style={{ width: `${widths[i]}%` }}>
                <div
                  className="h-full w-full rounded-full"
                  style={{
                    background: it.color ?? color,
                    transform: `scaleX(${scale})`,
                    transformOrigin: "left",
                    transition: widthsSettled
                      ? "transform var(--motion-slow) var(--ease-out), background-color var(--motion-base) var(--ease-out)"
                      : "none",
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============ TrendLine — labeled line chart ============ */

export function TrendLine({
  data,
  height = 130,
  color = SAGE,
  target,
  formatValue = (v: number) => String(Math.round(v * 10) / 10),
  className,
}: {
  data: { label: string; value: number | null }[];
  height?: number;
  color?: string;
  target?: number;
  formatValue?: (v: number) => string;
  className?: string;
}) {
  const w = 100;
  const h = height;
  const id = React.useId();
  const vals = data.filter((d) => d.value !== null).map((d) => d.value as number);
  const pool = target != null ? [...vals, target] : vals;
  const min = pool.length ? Math.min(...pool) : 0;
  const max = pool.length ? Math.max(...pool) : 1;
  const span = max - min || 1;
  const padT = 12;
  const padB = 20;
  const y = (v: number) => padT + (1 - (v - min) / span) * (h - padT - padB);
  const pts = data.map((d, i) => ({
    x: (i / Math.max(1, data.length - 1)) * w,
    y: d.value === null ? null : y(d.value),
  }));
  const valid = pts.filter((p) => p.y !== null) as { x: number; y: number }[];
  // Tanpa satu pun nilai terisi: canvas kosong menyesatkan — tampilkan pesan
  // netral alih-alih grafik kosong (ux-guidelines: empty state, never blank).
  if (valid.length === 0) {
    return (
      <div className={cn("w-full", className)}>
        <div
          className="flex items-center justify-center rounded-xl border border-dashed border-border/70 text-xs text-muted-foreground"
          style={{ height }}
          role="status"
        >
          Belum ada data untuk periode ini
        </div>
      </div>
    );
  }
  const line = buildSmoothPath(valid);
  const last = valid[valid.length - 1];
  return (
    <div className={cn("w-full", className)}>
      <div className="relative w-full" style={{ height }}>
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ height }} className="w-full overflow-visible" aria-hidden="true">
          {target != null && (
            <line x1={0} x2={w} y1={y(target)} y2={y(target)} stroke={NEUTRAL} strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
          )}
          {valid.length > 1 && (
            <>
              <defs>
                <linearGradient id={`trend-${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <path d={`${line} L ${valid[valid.length - 1].x} ${h - padB} L ${valid[0].x} ${h - padB} Z`} fill={`url(#trend-${id})`} />
              <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </>
          )}
        </svg>
        {last && (
          // Titik akhir digambar sebagai elemen HTML agar tidak melar kena preserveAspectRatio="none"
          <span
            aria-hidden="true"
            className="absolute h-1.5 w-1.5 rounded-full -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${(last.x / w) * 100}%`,
              top: `${(last.y / h) * 100}%`,
              background: color,
            }}
          />
        )}
      </div>
      <div className="flex justify-between mt-1">
        {data.map((d, i) => (
          <span key={i} className="text-xs text-muted-foreground tabular">
            {i % Math.ceil(data.length / 4) === 0 || i === data.length - 1 ? d.label : ""}
          </span>
        ))}
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-xs text-muted-foreground tabular">{formatValue(min)}</span>
        <span className="text-xs text-muted-foreground tabular">{formatValue(max)}</span>
      </div>
    </div>
  );
}

/* ============ HeatGrid — calendar heatmap ============ */

export function HeatGrid({
  cells,
  columns = 7,
  max = 1,
  color = SAGE,
  className,
  cellClassName,
}: {
  cells: { value: number; label?: string }[];
  columns?: number;
  max?: number;
  color?: string;
  className?: string;
  cellClassName?: string;
}) {
  return (
    <div
      className={cn("grid gap-1", className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      role="img"
      aria-label={`Peta aktivitas: ${cells.filter((c) => c.value > 0).length} dari ${cells.length} hari terisi`}
    >
      {cells.map((c, i) => {
        const t = Math.max(0, Math.min(1, max > 0 ? c.value / max : 0));
        return (
          <div
            key={i}
            title={c.label}
            className={cn("aspect-square rounded-[4px]", cellClassName)}
            style={{
              background: c.value <= 0 ? "var(--secondary)" : color,
              opacity: c.value <= 0 ? 1 : 0.25 + t * 0.75,
            }}
          />
        );
      })}
    </div>
  );
}

/**
 * Skala fill 0→1 untuk pola wrapper-ukuran-final + fill-scaleX (ux #13:
 * width/height adalah prop layout — yang dianimasikan hanya transform). Saat
 * mount & saat ukuran berubah, scale mulai dari rasio lama→baru lalu di-flip
 * ke 1 lewat rAF — bukan animationend (ux #119) — sehingga transisi transform
 * berjalan mulus. Reduced-motion: clamp global globals.css meringankan durasi,
 * flip tetap terjadi sehingga nilai final tetap ter-render segera.
 */
function useFillScale(current: number): { scale: number; settled: boolean } {
  // prev sebagai state, bukan ref — aman untuk render (react-hooks/refs);
  // guard settledFor mencegah loop re-render.
  const [prev, setPrev] = React.useState<number | null>(null);
  const [settledFor, setSettledFor] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (settledFor === current) return;
    const id = requestAnimationFrame(() => {
      setPrev(current);
      setSettledFor(current);
    });
    return () => cancelAnimationFrame(id);
  }, [current, settledFor]);
  const settled = settledFor === current;
  const scale = settled
    ? 1
    : prev == null || current <= 0
      ? 0
      : Math.min(1, prev / current);
  return { scale, settled };
}

/* ============ MetricBar — labeled progress toward a limit ============ */

export function MetricBar({
  value,
  max,
  overColor = CLAY,
  color = SAGE,
  height = 8,
  label,
  className,
}: {
  value: number;
  max: number;
  color?: string;
  overColor?: string;
  height?: number;
  /** Nama metrik untuk aria-label progressbar (mis. "Anggaran Makan"). */
  label?: string;
  className?: string;
}) {
  const frac = max > 0 ? value / max : 0;
  const over = frac > 1;
  // ux #13: wrapper memegang lebar final (statis); fill di dalamnya
  // dianimasikan scaleX (origin kiri) dengan spring — width tidak dianimasikan.
  const widthPct = Math.min(100, Math.max(0, frac * 100));
  const { scale: fillScale, settled: fillSettled } = useFillScale(widthPct);
  return (
    <div
      className={cn("w-full rounded-full overflow-hidden bg-secondary", className)}
      style={{ height }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(value)}
      aria-label={label ?? "Progres"}
    >
      <div className="h-full" style={{ width: `${widthPct}%` }}>
        <div
          className="h-full w-full rounded-full"
          style={{
            background: over
              ? overColor
              : `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 72%, white) 130%)`,
            boxShadow: `0 0 0 1px color-mix(in srgb, ${color} 25%, transparent) inset`,
            transform: `scaleX(${fillScale})`,
            transformOrigin: "left",
            transition: fillSettled ? "transform 0.7s var(--ease-spring)" : "none",
          }}
        />
      </div>
      {/* "Limit terlampaui" tidak boleh disampaikan lewat warna bar saja */}
      {over && <span className="sr-only">Melebihi batas</span>}
    </div>
  );
}

/* ============ DeltaBadge — signed change indicator ============ */

export function DeltaBadge({
  delta,
  invert = false,
  suffix,
  className,
}: {
  delta: number;
  invert?: boolean;
  suffix?: string;
  className?: string;
}) {
  const flat = Math.abs(delta) < 0.005;
  const up = delta > 0;
  const good = invert ? !up : up;
  const color = flat ? "text-muted-foreground bg-secondary" : good ? "text-primary bg-[color-mix(in_srgb,var(--primary)_12%,transparent)]" : "text-clay bg-clay-soft";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold tabular",
        color,
        className
      )}
    >
      {flat ? "•" : up ? "▲" : "▼"}
      {flat ? "tetap" : `${up ? "+" : "−"}${formatDelta(Math.abs(delta))}${suffix ?? ""}`}
    </span>
  );
}

function formatDelta(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}rb`;
  if (v >= 100) return Math.round(v).toString();
  return Math.round(v * 10) / 10 + "";
}

/* ============ RingStat — ring + big value + caption ============ */

export function RingStat({
  progress,
  value,
  caption,
  size = 76,
  stroke = 8,
  color = SAGE,
  trackColor = "var(--secondary)",
  className,
}: {
  progress: number;
  value: React.ReactNode;
  caption?: string;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, progress));
  // Mount-fill (quick-ref state-transition): render pertama memakai offset
  // penuh (ring kosong) lalu flip ke target lewat rAF agar transisi
  // stroke-dashoffset berjalan sekali saat mount. aria-valuenow selalu final
  // sejak render pertama; flip pakai useEffect+rAF, bukan animationend
  // (ux #119) — reduced-motion pun nilai final langsung ter-render.
  const [filled, setFilled] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div
      className={cn("flex flex-col items-center gap-1.5", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      aria-label={caption ?? "Progres"}
    >
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={filled ? c * (1 - clamped) : c}
            style={{
              transition: "stroke-dashoffset var(--motion-slow) var(--ease-spring)",
              filter: `drop-shadow(0 1px 2px ${color}40)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-extrabold tabular">{value}</span>
        </div>
      </div>
      {caption && <span className="text-xs font-medium text-muted-foreground text-center leading-tight">{caption}</span>}
    </div>
  );
}

/* ============ ActivityRings — 3 konsentris ala Apple Fitness ============
   Rekomendasi ui-ux-pro-max (chart: gauge/rings untuk KPI vs target).
   Ring terluar = metrik utama; semua progress di-clamp 0..1. */
export function ActivityRings({
  rings,
  size = 148,
  stroke = 13,
  gap = 4,
  center,
  className,
}: {
  rings: { value: number; max: number; color?: string }[];
  size?: number;
  stroke?: number;
  gap?: number;
  center?: React.ReactNode;
  className?: string;
}) {
  const n = rings.length || 1;
  const radiusFor = (i: number) => (size - stroke) / 2 - (n - 1 - i) * (stroke + gap);
  const ringsLabel =
    rings.length > 0
      ? `Ring aktivitas: ${rings
          .map((ring, i) => `ring ${i + 1} ${Math.round(Math.min(1, Math.max(0, ring.max > 0 ? ring.value / ring.max : 0)) * 100)}%`)
          .join(", ")}`
      : "Ring aktivitas";
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={ringsLabel}>
        {rings.map((ring, i) => {
          const r = radiusFor(i);
          const c = 2 * Math.PI * r;
          const clamped = Math.min(1, Math.max(0, ring.max > 0 ? ring.value / ring.max : 0));
          return (
            <g key={i}>
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--secondary)" strokeWidth={stroke} />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={ring.color ?? RAMP[i]}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c * (1 - clamped)}
                opacity={0.55 + (i / Math.max(1, n - 1)) * 0.45}
                style={{ transition: "stroke-dashoffset var(--motion-slow) var(--ease-out)" }}
              />
            </g>
          );
        })}
      </svg>
      {center && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>}
    </div>
  );
}

/* ============ RadarChart — keseimbangan multi-kehidupan ============
   Rekomendasi ui-ux-pro-max (chart: radar untuk profil multi-variabel). */
export function RadarChart({
  axes,
  size = 240,
  color = SAGE,
  levels = 4,
  className,
}: {
  axes: { label: string; value: number; display?: string }[];
  size?: number;
  color?: string;
  levels?: number;
  className?: string;
}) {
  const cx = size / 2;
  const cy = size / 2 + 4;
  // Radius dipangkas agar label pada 1.18*r tetap muat dengan margin ~24px
  const rMax = Math.max(48, (size / 2 - 24) / 1.18);
  const n = axes.length || 1;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, frac: number) => ({
    x: cx + Math.cos(angle(i)) * rMax * Math.max(0, Math.min(1, frac)),
    y: cy + Math.sin(angle(i)) * rMax * Math.max(0, Math.min(1, frac)),
  });
  const poly = axes.map((a, i) => pt(i, a.value)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const radarLabel = axes.length
    ? `Radar keseimbangan: ${axes.map((a) => `${a.label} ${a.display ?? fmtNum(a.value)}`).join(", ")}`
    : "Radar keseimbangan";
  const id = React.useId();
  return (
    <div className={cn("w-full flex flex-col items-center", className)}>
      <svg width={size} height={size} role="img" aria-label={radarLabel} className="overflow-visible">
        {/* web grid */}
        {Array.from({ length: levels }, (_, l) => {
          const frac = (l + 1) / levels;
          const pts = axes.map((_, i) => pt(i, frac)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
          return <polygon key={l} points={pts} fill="none" stroke="var(--border)" strokeWidth={1} opacity={0.9 - l * 0.15} />;
        })}
        {/* spokes */}
        {axes.map((_, i) => {
          const p = pt(i, 1);
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--border)" strokeWidth={1} opacity={0.8} />;
        })}
        {/* value polygon */}
        <polygon points={poly} fill={`url(#radar-${id})`} stroke={color} strokeWidth={2.5} strokeLinejoin="round" style={{ transition: "all var(--motion-slow) var(--ease-out)" }} />
        <defs>
          <linearGradient id={`radar-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.12} />
          </linearGradient>
        </defs>
        {/* dots */}
        {axes.map((a, i) => {
          const p = pt(i, a.value);
          return <circle key={i} cx={p.x} cy={p.y} r={4} fill={color} stroke="var(--card)" strokeWidth={2} />;
        })}
        {/* axis labels + display value */}
        {axes.map((a, i) => {
          const lp = pt(i, 1.18);
          const side = Math.abs(lp.x - cx) < 6 ? "middle" : lp.x > cx ? "start" : "end";
          // Label SVG tidak bisa wrap — clamp panjang label samping agar tidak
          // meluber melewati tepi layar di viewport sempit (375px).
          const clampLen = side === "middle" ? undefined : a.label.length > 10 ? Math.max(48, size * 0.32) : undefined;
          return (
            <g key={i}>
              <text
                x={lp.x}
                y={lp.y - 4}
                textAnchor={side}
                dominantBaseline="middle"
                className="fill-foreground"
                fontSize={12}
                fontWeight={700}
                textLength={clampLen}
                lengthAdjust={clampLen ? "spacingAndGlyphs" : undefined}
              >
                {a.label}
              </text>
              {a.display && (
                <text
                  x={lp.x}
                  y={lp.y + 10}
                  textAnchor={side}
                  dominantBaseline="middle"
                  className="fill-[var(--muted-foreground)]"
                  fontSize={11}
                  fontWeight={600}
                  textLength={clampLen}
                  lengthAdjust={clampLen ? "spacingAndGlyphs" : undefined}
                >
                  {a.display}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
