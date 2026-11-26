"use client";

import * as React from "react";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

// ============ Screen header (mobile app bar) ============

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  actions,
  tone = "stone",
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  tone?: "stone" | "garden" | "studio" | "vault" | "writer";
}) {
  const toneText: Record<string, string> = {
    stone: "text-foreground",
    garden: "text-garden-deep",
    studio: "text-studio-deep",
    vault: "text-vault-deep",
    writer: "text-writer-deep",
  };
  return (
    <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 px-4 border-b border-border/60">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Kembali"
            className="press h-11 w-11 rounded-full flex items-center justify-center bg-secondary text-foreground shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className={cn("text-xl font-bold leading-tight truncate", toneText[tone])}>{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}

// ============ Section card ============

export function SectionCard({
  title,
  icon,
  action,
  children,
  className,
  tone,
}: {
  title?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  tone?: "stone" | "garden" | "studio" | "vault" | "writer" | "gold" | "clay";
}) {
  const toneText: Record<string, string> = {
    stone: "text-foreground",
    garden: "text-garden-deep",
    studio: "text-studio-deep",
    vault: "text-vault-deep",
    writer: "text-writer-deep",
    gold: "text-gold",
    clay: "text-clay-deep",
  };
  return (
    <section className={cn("bg-card rounded-xl border border-border/70 shadow-clay p-4", className)}>
      {(title || action) && (
        <div className="flex items-center gap-2 mb-3">
          {icon}
          {title && (
            <h2 className={cn("text-sm font-bold tracking-wide uppercase", tone ? toneText[tone] : "text-foreground")}>
              {title}
            </h2>
          )}
          {action && <div className="ml-auto">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

// ============ Stat tile ============

const toneMap: Record<string, { bg: string; fg: string }> = {
  stone: { bg: "bg-secondary", fg: "text-foreground" },
  garden: { bg: "bg-garden-soft", fg: "text-garden-deep" },
  studio: { bg: "bg-studio-soft", fg: "text-studio-deep" },
  vault: { bg: "bg-vault-soft", fg: "text-vault-deep" },
  writer: { bg: "bg-writer-soft", fg: "text-writer-deep" },
  gold: { bg: "bg-gold-soft", fg: "text-gold" },
  clay: { bg: "bg-clay-soft", fg: "text-clay-deep" },
};

export function StatTile({
  label,
  value,
  sub,
  icon,
  tone = "stone",
  className,
  chart,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon?: React.ReactNode;
  tone?: keyof typeof toneMap;
  className?: string;
  /** Visual mini (grafik/bars) ditampilkan di bawah nilai. */
  chart?: React.ReactNode;
  /** Override ukuran teks nilai (mis. `text-lg` untuk grid 3 kolom agar nilai uang tak terpotong). */
  valueClassName?: string;
}) {
  const t = toneMap[tone];
  return (
    <div className={cn("rounded-xl p-4 min-w-0 shadow-soft", t.bg, className)}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <span className={t.fg}>{icon}</span>}
        <span className={cn("text-xs font-semibold uppercase tracking-wide leading-tight", t.fg)}>{label}</span>
      </div>
      {/* break-words bukan truncate (bento #39 "content fits cards"): nilai
          uang 3-kolom boleh lipat ke baris kedua alih-alih terpotong "…" */}
      <div className={cn("text-xl font-bold tabular leading-tight break-words", valueClassName, t.fg)}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</div>}
      {chart && <div className="mt-2 -mx-0.5">{chart}</div>}
    </div>
  );
}

// ============ Empty state ============

export function EmptyState({
  icon,
  illustration,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  /** Ilustrasi SVG opsional (gaya line-art Field Notes) — menggantikan kotak ikon. */
  illustration?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center py-8 px-4">
      {illustration ?? (
        <div className="h-14 w-14 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground mb-3 shadow-soft">
          {icon}
        </div>
      )}
      <p className="font-semibold text-foreground text-sm">{title}</p>
      {description && <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

// ============ Progress ring ============

export function ProgressRing({
  progress,
  size = 64,
  stroke = 7,
  color = "var(--primary)",
  trackColor = "var(--secondary)",
  children,
}: {
  progress: number; // 0..1
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, progress));
  return (
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
          strokeDashoffset={c * (1 - clamped)}
          style={{
            transition: "stroke-dashoffset 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)",
            filter: `drop-shadow(0 1px 2px ${color}40)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

// ============ Pill / chip ============

export function Pill({
  children,
  tone = "stone",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof toneMap;
  className?: string;
}) {
  const t = toneMap[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        t.bg,
        t.fg,
        className
      )}
    >
      {children}
    </span>
  );
}

// ============ More menu placeholder icon helper ============

export { MoreHorizontal };

// ============ Category maps ============

export const HABIT_CATEGORY_META: Record<string, { label: string; tone: keyof typeof toneMap }> = {
  health: { label: "Kesehatan", tone: "garden" },
  productivity: { label: "Produktivitas", tone: "studio" },
  mind: { label: "Pikiran", tone: "writer" },
  finance: { label: "Keuangan", tone: "vault" },
  social: { label: "Sosial", tone: "gold" },
  learning: { label: "Belajar", tone: "vault" },
};

export const TIME_OF_DAY_META: Record<string, { label: string }> = {
  morning: { label: "Pagi" },
  afternoon: { label: "Siang" },
  evening: { label: "Malam" },
  anytime: { label: "Kapan saja" },
};

// avoid unused import warnings in some bundlers
void MoreHorizontal;
